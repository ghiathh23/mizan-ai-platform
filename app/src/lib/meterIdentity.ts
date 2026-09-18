export type MeterIdentityMatch = 'matched' | 'mismatch' | 'missing' | 'invalid'

function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '')
}

export function matchMeterIdentity(expected: string | null | undefined, observed: string | null | undefined): MeterIdentityMatch {
  const expectedValue = normalizeIdentity(expected)
  const observedValue = normalizeIdentity(observed)
  if (!expectedValue || !observedValue) return 'missing'
  if (!/^[A-Z0-9]+$/.test(observedValue)) return 'invalid'
  return expectedValue === observedValue ? 'matched' : 'mismatch'
}

export function canAcceptReading(identityMatch: MeterIdentityMatch, confidence: number | null | undefined): boolean {
  return identityMatch === 'matched' && (confidence === null || confidence === undefined || (confidence >= 0.9 && confidence <= 1))
}
