import { supabase } from '../lib/supabase'
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
    // Authentication and network failures are retried on the next online event or sign-in.
  } finally {
    syncing = false
  }
}

export function registerOfflineSync(): () => void {
  const handleOnline = () => { void runOfflineSync() }
  window.addEventListener('online', handleOnline)

  const { data: authSubscription } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') void runOfflineSync()
  })

  if (navigator.onLine) void runOfflineSync()

  return () => {
    window.removeEventListener('online', handleOnline)
    authSubscription.subscription.unsubscribe()
  }
}
