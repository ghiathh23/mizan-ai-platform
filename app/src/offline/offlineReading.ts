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
    operation_type: 'meter_reading.create',
    project_id: payload.project_id,
    payload,
    status: 'queued',
    created_at: new Date().toISOString(),
    retry_count: 0,
    last_error: null,
  }
  await enqueueOperation(operation)
  return operation_id
}
