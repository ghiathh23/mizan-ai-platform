import { createOperationId } from './syncTypes'

const DB_NAME = 'mizan-ai-offline-evidence'
const DB_VERSION = 1
const STORE_NAME = 'evidence'

export interface OfflineEvidenceRecord {
  evidence_id: string
  project_id: string
  meter_id: string
  file_name: string
  content_type: string
  size: number
  blob: Blob
  created_at: string
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
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('offline_evidence_database_open_failed'))
  })
}

export async function saveOfflineEvidence(input: {
  project_id: string
  meter_id: string
  file: Blob
  file_name: string
}): Promise<OfflineEvidenceRecord> {
  const evidence: OfflineEvidenceRecord = {
    evidence_id: createOperationId('evidence'),
    project_id: input.project_id,
    meter_id: input.meter_id,
    file_name: input.file_name,
    content_type: input.file.type,
    size: input.file.size,
    blob: input.file,
    created_at: new Date().toISOString(),
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
