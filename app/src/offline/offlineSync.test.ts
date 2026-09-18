import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ supabase: {} }))

import { isTransientError } from './offlineSync'

describe('offline sync error classification', () => {
  it('treats rejected offline evidence as permanent', () => {
    expect(isTransientError({ message: 'offline_evidence_rejected' })).toBe(false)
  })

  it('treats authentication failure as permanent', () => {
    expect(isTransientError({ message: 'authentication_required' })).toBe(false)
  })

  it('treats database constraint errors as permanent', () => {
    expect(isTransientError({ code: '23514' })).toBe(false)
  })

  it('treats unknown failures as retryable', () => {
    expect(isTransientError({ code: 'NETWORK_ERROR' })).toBe(true)
  })
})
