import { enqueueOperation } from './offlineQueue'
import type { OfflineOperation } from './syncTypes'

export interface OfflineReadingPayload {
  project_id: string
  meter_id: string
  evidence_id: string | null
  reading_at: string
  extracted_value: number
}

export async function queueOfflineReading(payload: OfflineReadingPayload): Promise<string> {
  // The database stores operation_id as UUID; keep the local operation ID wire-compatible.
  const operation_id = createUuid()
  const operation: OfflineOperation<OfflineReadingPayload> = {
    operation_id,
    device_id: getDeviceId(),
    project_id: payload.project_id,
    entity_type: 'meter_reading',
    entity_id: operation_id,
    operation_type: 'meter_reading.create',
    payload,
    status: 'queued',
    created_at: new Date().toISOString(),
    retry_count: 0,
    last_error: null,
  }
  await enqueueOperation(operation)
  return operation_id
}

function createUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  throw new Error('secure_uuid_unavailable')
}

function getDeviceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `device_${Date.now()}_${Math.random().toString(36).slice(2)}`
}
