import { createOperationId } from './syncTypes'

const DB_NAME = 'mizan-ai-offline-evidence'
const DB_VERSION = 2
const STORE_NAME = 'evidence'

export type OfflineEvidenceSyncStatus = 'queued' | 'syncing' | 'synced' | 'retryable_error' | 'rejected'

export interface OfflineEvidenceRecord {
  evidence_id: string
  project_id: string
  meter_id: string
  file_name: string
  content_type: string
  size: number
  blob: Blob
  created_at: string
  sync_status: OfflineEvidenceSyncStatus
  server_evidence_id: string | null
  last_error: string | null
  retry_count: number
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'evidence_id' })
        store.createIndex('project_id', 'project_id', { unique: false })
        store.createIndex('meter_id', 'meter_id', { unique: false })
        store.createIndex('created_at', 'created_at', { unique: false })
        store.createIndex('sync_status', 'sync_status', { unique: false })
      } else {
        const store = request.transaction?.objectStore(STORE_NAME)
        if (store && !store.indexNames.contains('sync_status')) store.createIndex('sync_status', 'sync_status', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('offline_evidence_database_open_failed'))
  })
}

export async function saveOfflineEvidence(input: { project_id: string; meter_id: string; file: Blob; file_name: string }): Promise<OfflineEvidenceRecord> {
  const evidence: OfflineEvidenceRecord = {
    evidence_id: createOperationId('evidence'),
    project_id: input.project_id,
    meter_id: input.meter_id,
    file_name: input.file_name,
    content_type: input.file.type || 'application/octet-stream',
    size: input.file.size,
    blob: input.file,
    created_at: new Date().toISOString(),
    sync_status: 'queued',
    server_evidence_id: null,
    last_error: null,
    retry_count: 0,
  }
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(evidence)
      transaction.onerror = () => reject(transaction.error ?? new Error('offline_evidence_save_failed'))
      transaction.oncomplete = () => resolve()
    })
    return evidence
  } finally {
    database.close()
  }
}

export async function getOfflineEvidence(evidenceId: string): Promise<OfflineEvidenceRecord | null> {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(evidenceId)
      request.onsuccess = () => resolve((request.result as OfflineEvidenceRecord | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('offline_evidence_read_failed'))
    })
  } finally {
    database.close()
  }
}

export async function listOfflineEvidence(projectId?: string): Promise<OfflineEvidenceRecord[]> {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll()
      request.onsuccess = () => {
        const records = request.result as OfflineEvidenceRecord[]
        resolve(records.filter((record) => !projectId || record.project_id === projectId).sort((left, right) => left.created_at.localeCompare(right.created_at)))
      }
      request.onerror = () => reject(request.error ?? new Error('offline_evidence_list_failed'))
    })
  } finally {
    database.close()
  }
}

export async function updateOfflineEvidenceSync(input: { evidence_id: string; sync_status: OfflineEvidenceSyncStatus; server_evidence_id?: string | null; last_error?: string | null }): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(input.evidence_id)
      request.onerror = () => reject(request.error ?? new Error('offline_evidence_update_failed'))
      request.onsuccess = () => {
        const existing = request.result as OfflineEvidenceRecord | undefined
        if (!existing) {
          reject(new Error('offline_evidence_not_found'))
          return
        }
        store.put({
          ...existing,
          sync_status: input.sync_status,
          server_evidence_id: input.server_evidence_id ?? existing.server_evidence_id,
          last_error: input.last_error ?? null,
          retry_count: input.sync_status === 'retryable_error' ? existing.retry_count + 1 : existing.retry_count,
        })
      }
      transaction.onerror = () => reject(transaction.error ?? new Error('offline_evidence_update_failed'))
      transaction.oncomplete = () => resolve()
    })
  } finally {
    database.close()
  }
}

export async function deleteOfflineEvidence(evidenceId: string): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).delete(evidenceId)
      transaction.onerror = () => reject(transaction.error ?? new Error('offline_evidence_delete_failed'))
      transaction.oncomplete = () => resolve()
    })
  } finally {
    database.close()
  }
}
