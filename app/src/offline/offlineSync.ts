import { supabase } from '../lib/supabase'
import { listPendingOperations, updateOperationStatus } from './offlineQueue'
import type { OfflineOperation } from './syncTypes'
import type { OfflineReadingPayload } from './offlineReading'

type DatabaseError = { code?: string; message?: string }

const isTransientError = (error: DatabaseError | null) => {
  if (!error) return false
  if (error.code === '23505' || error.code === '23503' || error.code === '23514' || error.code === '42501') return false
  if (error.message === 'authentication_required' || error.message === 'secure_uuid_unavailable') return false
  return true
}

async function syncReading(operation: OfflineOperation<OfflineReadingPayload>, userId: string) {
  const payload = operation.payload
  const { data, error } = await supabase.from('meter_readings').insert({
    project_id: payload.project_id,
    meter_id: payload.meter_id,
    evidence_id: payload.evidence_id,
    reading_at: payload.reading_at,
    extracted_value: payload.extracted_value,
    validation_status: 'proposed',
    created_by: userId,
    operation_id: operation.operation_id,
  }).select('id').single()

  if (!error) return data

  // A retried request may already have been committed before connectivity was lost.
  if (error.code === '23505') {
    const { data: existing, error: lookupError } = await supabase.from('meter_readings').select('id').eq('operation_id', operation.operation_id).maybeSingle()
    if (!lookupError && existing) return existing
  }

  throw error
}

export async function syncPendingOperations(): Promise<{ synced: number; retryable: number; rejected: number }> {
  const { data, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!data.user) throw new Error('authentication_required')

  const operations = await listPendingOperations()
  let synced = 0
  let retryable = 0
  let rejected = 0

  for (const operation of operations) {
    try {
      await updateOperationStatus(operation.operation_id, 'syncing')
      if (operation.operation_type !== 'meter_reading.create') {
        await updateOperationStatus(operation.operation_id, 'rejected', 'unsupported_operation_type')
        rejected += 1
        continue
      }

      await syncReading(operation as OfflineOperation<OfflineReadingPayload>, data.user.id)
      await updateOperationStatus(operation.operation_id, 'synced')
      synced += 1
    } catch (error) {
      const normalized = error as DatabaseError
      if (isTransientError(normalized)) {
        await updateOperationStatus(operation.operation_id, 'retryable_error', normalized.message ?? 'sync_failed')
        retryable += 1
      } else {
        await updateOperationStatus(operation.operation_id, 'rejected', normalized.message ?? 'sync_rejected')
        rejected += 1
      }
    }
  }

  return { synced, retryable, rejected }
}
