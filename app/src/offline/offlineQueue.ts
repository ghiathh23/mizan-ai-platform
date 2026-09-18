import type { OfflineOperation, SyncStatus } from './syncTypes'

const DB_NAME = 'mizan-ai-offline'
const DB_VERSION = 1
const STORE_NAME = 'operations'

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
    }
    request.onsuccess = () => resolve(request.result)
  })
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
        resolve((request.result as OfflineOperation[]).filter((operation) => operation.status === 'queued' || operation.status === 'retryable_error'))
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
      request.onerror = () => reject(request.error ?? new Error('تعذر تحديث العملية.'))
      request.onsuccess = () => {
        const operation = request.result as OfflineOperation | undefined
        if (!operation) {
          reject(new Error('العملية غير موجودة محليًا.'))
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
      transaction.oncomplete = () => resolve()
    })
  } finally {
    database.close()
  }
}
