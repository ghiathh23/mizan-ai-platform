import { describe, expect, it } from 'vitest'
import { createOperationId, isRetryableSyncStatus } from './syncTypes'

describe('offline sync contracts', () => {
  it('recognizes retryable statuses including crash recovery', () => {
    expect(isRetryableSyncStatus('queued')).toBe(true)
    expect(isRetryableSyncStatus('syncing')).toBe(true)
    expect(isRetryableSyncStatus('retryable_error')).toBe(true)
    expect(isRetryableSyncStatus('synced')).toBe(false)
    expect(isRetryableSyncStatus('conflict')).toBe(false)
    expect(isRetryableSyncStatus('rejected')).toBe(false)
  })

  it('creates unique operation identifiers with a prefix', () => {
    const first = createOperationId('reading')
    const second = createOperationId('reading')
    expect(first.startsWith('reading_')).toBe(true)
    expect(second.startsWith('reading_')).toBe(true)
    expect(first).not.toBe(second)
  })
})
