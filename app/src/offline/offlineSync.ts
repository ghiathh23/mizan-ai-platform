import { supabase } from '../lib/supabase'
import { getOfflineEvidence } from './offlineEvidence'
import { listPendingOperations, updateOperationStatus } from './offlineQueue'
import type { OfflineOperation } from './syncTypes'
import type { OfflineReadingPayload } from './offlineReading'

type DatabaseError = { code?: string; message?: string }
type SyncResult = { synced: number; retryable: number; rejected: number }

export function isTransientError(error: DatabaseError | null): boolean {
  if (!error) return false
  if (error.code === '23505' || error.code === '23503' || error.code === '23514' || error.code === '42501' || error.code === '22023') return false
  if (error.message === 'authentication_required' || error.message === 'secure_uuid_unavailable' || error.message === 'offline_evidence_rejected') return false
  return true
}

function validateReadingPayload(operation: OfflineOperation<OfflineReadingPayload>): string | null {
  const payload = operation.payload
  if (!payload || payload.project_id !== operation.project_id) return 'invalid_operation_project'
  if (!payload.project_id || !payload.meter_id) return 'invalid_reading_reference'
  if (!payload.reading_at || Number.isNaN(Date.parse(payload.reading_at))) return 'invalid_reading_timestamp'
  if (!Number.isFinite(payload.extracted_value) || payload.extracted_value < 0) return 'invalid_reading_value'
  if (payload.evidence_id !== null && !payload.evidence_id) return 'invalid_evidence_reference'
  return null
}

async function safeUpdateOperationStatus(operationId: string, status: Parameters<typeof updateOperationStatus>[1], errorMessage?: string) {
  try {
    await updateOperationStatus(operationId, status, errorMessage)
  } catch {
    // A local IndexedDB failure must not terminate the remaining sync batch.
  }
}

async function resolveEvidenceId(evidenceId: string | null): Promise<string | null> {
  if (!evidenceId) return null
  const localEvidence = await getOfflineEvidence(evidenceId)
  if (!localEvidence) return evidenceId
  if (localEvidence.server_evidence_id) return localEvidence.server_evidence_id
  if (localEvidence.sync_status === 'rejected') throw new Error('offline_evidence_rejected')
  throw new Error('offline_evidence_sync_required')
}

async function syncReading(operation: OfflineOperation<OfflineReadingPayload>) {
  const payload = operation.payload
  const serverEvidenceId = await resolveEvidenceId(payload.evidence_id)
  const { data, error } = await supabase.rpc('mizan_sync_meter_reading', {
    p_project_id: payload.project_id,
    p_meter_id: payload.meter_id,
    p_evidence_id: serverEvidenceId,
    p_reading_at: payload.reading_at,
    p_extracted_value: payload.extracted_value,
    p_operation_id: operation.operation_id,
  })
  if (error) throw error
  if (!data) throw new Error('sync_reading_missing_id')
  return data as string
}

export async function syncPendingOperations(): Promise<SyncResult> {
  const { data, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!data.user) throw new Error('authentication_required')

  const operations = await listPendingOperations()
  const result: SyncResult = { synced: 0, retryable: 0, rejected: 0 }

  for (const operation of operations) {
    await safeUpdateOperationStatus(operation.operation_id, 'syncing')
    try {
      if (operation.operation_type !== 'meter_reading.create') {
        await safeUpdateOperationStatus(operation.operation_id, 'rejected', 'unsupported_operation_type')
        result.rejected += 1
        continue
      }
      const payloadError = validateReadingPayload(operation as OfflineOperation<OfflineReadingPayload>)
      if (payloadError) {
        await safeUpdateOperationStatus(operation.operation_id, 'rejected', payloadError)
        result.rejected += 1
        continue
      }
      await syncReading(operation as OfflineOperation<OfflineReadingPayload>)
      await safeUpdateOperationStatus(operation.operation_id, 'synced')
      result.synced += 1
    } catch (error) {
      const normalized = error as DatabaseError
      const retryable = isTransientError(normalized)
      await safeUpdateOperationStatus(operation.operation_id, retryable ? 'retryable_error' : 'rejected', normalized.message ?? (retryable ? 'sync_failed' : 'sync_rejected'))
      if (retryable) result.retryable += 1
      else result.rejected += 1
    }
  }
  return result
}
