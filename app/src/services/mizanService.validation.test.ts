import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../offline/offlineEvidence', () => ({ getOfflineEvidence: vi.fn() }))
vi.mock('../offline/offlineReading', () => ({ queueOfflineReading: vi.fn() }))

import { validateSubscriberInput } from './mizanService'

const baseInput = {
  project_id: 'project-1',
  full_name: 'مشترك تجريبي',
  phone: '',
  subscriber_code: 'SUB-001',
}

describe('subscriber input validation', () => {
  it('rejects an empty subscriber code', () => {
    expect(validateSubscriberInput({ ...baseInput, subscriber_code: '   ' })).toBe('subscriber_code_required')
  })

  it('rejects an empty subscriber name', () => {
    expect(validateSubscriberInput({ ...baseInput, full_name: '  ' })).toBe('subscriber_name_required')
  })

  it('accepts a complete subscriber input', () => {
    expect(validateSubscriberInput(baseInput)).toBeNull()
  })
})
