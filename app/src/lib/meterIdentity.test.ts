import { describe, expect, it } from 'vitest'
import { canAcceptReading, matchMeterIdentity } from './meterIdentity'

describe('meter identity matching', () => {
  it('matches identities ignoring spaces, hyphens and case', () => {
    expect(matchMeterIdentity('wm-001 23', 'WM00123')).toBe('matched')
  })

  it('rejects missing or malformed observations', () => {
    expect(matchMeterIdentity('WM001', '')).toBe('missing')
    expect(matchMeterIdentity('WM001', 'WM/001')).toBe('invalid')
  })

  it('does not accept a mismatch', () => {
    expect(matchMeterIdentity('WM001', 'WM002')).toBe('mismatch')
    expect(canAcceptReading('mismatch', 1)).toBe(false)
  })

  it('accepts a confirmed match with valid confidence', () => {
    expect(canAcceptReading('matched', 0.95)).toBe(true)
    expect(canAcceptReading('matched', 0.89)).toBe(false)
  })
})
