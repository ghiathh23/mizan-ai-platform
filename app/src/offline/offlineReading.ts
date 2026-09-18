import { enqueueOperation } from './offlineQueue'
import { createOperationId, type OfflineOperation } from './syncTypes'

export interface OfflineReadingPayload {
  project_id: string
  meter_id: string
  evidence_id: string | null
  reading_at: string
  extracted_value: number
}

export async function queueOfflineReading(payload: OfflineReadingPayload): Promise<string> {
  const operation_id = createOperationId('reading')
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

function getDeviceId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `device_${Date.now()}_${Math.random().toString(36).slice(2)}`
}
