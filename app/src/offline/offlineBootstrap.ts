import { syncPendingOperations } from './offlineSync'
import { syncPendingEvidence } from './offlineEvidenceSync'

let syncing = false

export async function runOfflineSync(): Promise<void> {
  if (syncing || !navigator.onLine) return
  syncing = true
  try {
    await syncPendingEvidence()
    await syncPendingOperations()
  } catch {
    // Authentication and network failures are retried on the next online event.
  } finally {
    syncing = false
  }
}

export function registerOfflineSync(): () => void {
  const handleOnline = () => { void runOfflineSync() }
  window.addEventListener('online', handleOnline)
  if (navigator.onLine) void runOfflineSync()
  return () => window.removeEventListener('online', handleOnline)
}
