import { describe, expect, it } from 'vitest'
import { evaluateReadingAcceptance } from './readingAcceptance'

describe('reading acceptance gate', () => {
  const base = {
    expectedIdentity: 'WM-001 23',
    observedIdentity: 'WM00123',
    confidence: 0.95,
    extractedValue: 120,
  }

  it('accepts a matched identity and high-confidence valid reading', () => {
    expect(evaluateReadingAcceptance(base)).toEqual({
      identityMatch: 'matched',
      accepted: true,
      reason: 'accepted',
    })
  })

  it('blocks mismatched identities', () => {
    expect(evaluateReadingAcceptance({ ...base, observedIdentity: 'WM00124' })).toMatchObject({
      identityMatch: 'mismatch',
      accepted: false,
      reason: 'identity_mismatch',
    })
  })

  it('blocks missing identities and low confidence', () => {
    expect(evaluateReadingAcceptance({ ...base, observedIdentity: null })).toMatchObject({
      accepted: false,
      reason: 'identity_missing',
    })
    expect(evaluateReadingAcceptance({ ...base, confidence: 0.89 })).toMatchObject({
      accepted: false,
      reason: 'confidence_too_low',
    })
  })

  it('blocks missing and invalid readings', () => {
    expect(evaluateReadingAcceptance({ ...base, extractedValue: null })).toMatchObject({
      accepted: false,
      reason: 'reading_missing',
    })
    expect(evaluateReadingAcceptance({ ...base, extractedValue: -1 })).toMatchObject({
      accepted: false,
      reason: 'reading_invalid',
    })
  })
})
