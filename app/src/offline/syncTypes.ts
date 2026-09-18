export type SyncStatus = 'queued' | 'syncing' | 'synced' | 'retryable_error' | 'conflict' | 'rejected'

export interface OfflineOperation<TPayload = unknown> {
  operation_id: string
  device_id: string
  project_id: string
  entity_type: string
  entity_id: string
  operation_type: string
  payload: TPayload
  created_at: string
  status: SyncStatus
  retry_count: number
  last_error?: string | null
}

export function isRetryableSyncStatus(status: SyncStatus): boolean {
  return status === 'queued' || status === 'retryable_error'
}

export function createOperationId(_prefix = 'op'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  throw new Error('secure_uuid_unavailable')
}
