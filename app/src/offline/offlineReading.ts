import { enqueueOperation } from './offlineQueue'
import type { OfflineOperation } from './syncTypes'

export interface OfflineReadingPayload {
  project_id: string
  meter_id: string
  evidence_id: string | null
  reading_at: string
  extracted_value: number
}

const DEVICE_DB = 'mizan-ai-device'
const DEVICE_STORE = 'identity'
const DEVICE_KEY = 'device_id'

export async function queueOfflineReading(payload: OfflineReadingPayload): Promise<string> {
  const operation_id = createUuid()
  const operation: OfflineOperation<OfflineReadingPayload> = {
    operation_id,
    device_id: await getDeviceId(),
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

async function getDeviceId(): Promise<string> {
  const database = await openDeviceDatabase()
  try {
    const existing = await new Promise<string | undefined>((resolve, reject) => {
      const request = database.transaction(DEVICE_STORE, 'readonly').objectStore(DEVICE_STORE).get(DEVICE_KEY)
      request.onsuccess = () => resolve(request.result?.value as string | undefined)
      request.onerror = () => reject(request.error ?? new Error('device_id_read_failed'))
    })
    if (existing) return existing
    const created = createUuid()
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(DEVICE_STORE, 'readwrite').objectStore(DEVICE_STORE).put({ key: DEVICE_KEY, value: created })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error ?? new Error('device_id_write_failed'))
    })
    return created
  } finally {
    database.close()
  }
}

function openDeviceDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DEVICE_DB, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DEVICE_STORE)) request.result.createObjectStore(DEVICE_STORE, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('device_database_open_failed'))
  })
}
