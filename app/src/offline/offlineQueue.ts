import type { OfflineOperation, SyncStatus } from './syncTypes'

const DB_NAME = 'mizan-ai-offline'
const DB_VERSION = 2
const STORE_NAME = 'operations'
const META_STORE_NAME = 'metadata'
const DEVICE_ID_KEY = 'device_id'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('تعذر فتح التخزين المحلي.'))
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'operation_id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('project_id', 'project_id', { unique: false })
        store.createIndex('created_at', 'created_at', { unique: false })
      }
      if (!database.objectStoreNames.contains(META_STORE_NAME)) {
        database.createObjectStore(META_STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

export async function getOrCreateDeviceId(createId: () => string): Promise<string> {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(META_STORE_NAME, 'readwrite')
      const store = transaction.objectStore(META_STORE_NAME)
      let resolved = false
      const finish = (callback: () => void) => {
        if (resolved) return
        resolved = true
        callback()
      }

      const request = store.get(DEVICE_ID_KEY)
      request.onerror = () => finish(() => reject(request.error ?? new Error('تعذر قراءة هوية الجهاز.')))
      request.onsuccess = () => {
        const existing = request.result
        if (typeof existing === 'string' && existing.length > 0) {
          transaction.oncomplete = () => finish(() => resolve(existing))
          return
        }

        let generated: string
        try {
          generated = createId()
        } catch (error) {
          finish(() => reject(error))
          return
        }
        store.put(generated, DEVICE_ID_KEY)
        transaction.oncomplete = () => finish(() => resolve(generated))
      }
      transaction.onerror = () => finish(() => reject(transaction.error ?? new Error('تعذر حفظ هوية الجهاز.')))
      transaction.onabort = () => finish(() => reject(transaction.error ?? new Error('تعذر حفظ هوية الجهاز.')))
    })
  } finally {
    database.close()
  }
}

export async function enqueueOperation<TPayload>(operation: OfflineOperation<TPayload>): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(operation)
      transaction.onerror = () => reject(transaction.error ?? new Error('تعذر حفظ العملية محليًا.'))
      transaction.oncomplete = () => resolve()
    })
  } finally {
    database.close()
  }
}

export async function listPendingOperations(): Promise<OfflineOperation[]> {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
      request.onerror = () => reject(request.error ?? new Error('تعذر قراءة قائمة المزامنة.'))
      request.onsuccess = () => {
        // A previous browser session can leave an operation in `syncing`
        // after a tab close, crash, power loss, or network interruption.
        // Include it in the next recovery pass; the server-side operation_id
        // remains the idempotency boundary for the RPC.
        const operations = (request.result as OfflineOperation[]).filter((operation) =>
          operation.status === 'queued' ||
          operation.status === 'syncing' ||
          operation.status === 'retryable_error',
        )
        resolve(operations.sort((left, right) => left.created_at.localeCompare(right.created_at)))
      }
    })
  } finally {
    database.close()
  }
}

export async function updateOperationStatus(operationId: string, status: SyncStatus, lastError?: string | null): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(operationId)
      let missing = false
      request.onerror = () => reject(request.error ?? new Error('تعذر تحديث العملية.'))
      request.onsuccess = () => {
        const operation = request.result as OfflineOperation | undefined
        if (!operation) {
          missing = true
          return
        }
        store.put({
          ...operation,
          status,
          last_error: lastError ?? null,
          retry_count: status === 'retryable_error' ? operation.retry_count + 1 : operation.retry_count,
        })
      }
      transaction.onerror = () => reject(transaction.error ?? new Error('تعذر تحديث العملية.'))
      transaction.oncomplete = () => {
        if (missing) {
          reject(new Error('العملية غير موجودة محليًا.'))
          return
        }
        resolve()
      }
    })
  } finally {
    database.close()
  }
}
