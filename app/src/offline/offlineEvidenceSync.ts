import { supabase } from '../lib/supabase'
import { getOfflineEvidence, listOfflineEvidence, updateOfflineEvidenceSync, type OfflineEvidenceRecord } from './offlineEvidence'

type SyncResult = { synced: number; retryable: number; rejected: number }
type DatabaseError = { code?: string; message?: string }

function isRetryable(error: DatabaseError | null): boolean {
  if (!error) return false
  if (['23505', '23503', '23514', '42501', '22023'].includes(error.code ?? '')) return false
  return true
}

function safeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'evidence.bin'
}

async function syncOneEvidence(record: OfflineEvidenceRecord): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('authentication_required')

  await updateOfflineEvidenceSync({ evidence_id: record.evidence_id, sync_status: 'syncing', last_error: null })
  const storagePath = `projects/${record.project_id}/offline-${record.evidence_id}-${safeFileName(record.file_name)}`
  const { error: uploadError } = await supabase.storage.from('meter-evidence').upload(storagePath, record.blob, {
    contentType: record.content_type,
    cacheControl: '3600',
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { data, error: insertError } = await supabase.from('meter_evidence').insert({
    project_id: record.project_id,
    meter_id: record.meter_id,
    storage_path: storagePath,
    captured_at: record.created_at,
    device_metadata: { source: 'offline', original_name: record.file_name, content_type: record.content_type, size_bytes: record.size, local_evidence_id: record.evidence_id },
    image_quality_status: 'pending',
    recognition_status: 'pending',
    created_by: userData.user.id,
  }).select('id').single()

  if (insertError) {
    await supabase.storage.from('meter-evidence').remove([storagePath])
    throw insertError
  }

  await updateOfflineEvidenceSync({ evidence_id: record.evidence_id, sync_status: 'synced', server_evidence_id: data.id, last_error: null })
}

export async function getSyncedEvidenceId(localEvidenceId: string): Promise<string | null> {
  const record = await getOfflineEvidence(localEvidenceId)
  return record?.server_evidence_id ?? null
}

export async function syncPendingEvidence(): Promise<SyncResult> {
  const records = await listOfflineEvidence()
  const result: SyncResult = { synced: 0, retryable: 0, rejected: 0 }
  for (const record of records) {
    if (record.sync_status === 'synced') continue
    try {
      await syncOneEvidence(record)
      result.synced += 1
    } catch (error) {
      const normalized = error as DatabaseError
      const retryable = isRetryable(normalized)
      await updateOfflineEvidenceSync({ evidence_id: record.evidence_id, sync_status: retryable ? 'retryable_error' : 'rejected', last_error: normalized.message ?? (retryable ? 'evidence_sync_failed' : 'evidence_sync_rejected') })
      if (retryable) result.retryable += 1
      else result.rejected += 1
    }
  }
  return result
}
