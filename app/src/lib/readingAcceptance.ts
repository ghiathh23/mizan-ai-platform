import { canAcceptReading, matchMeterIdentity, type MeterIdentityMatch } from './meterIdentity'

export interface ReadingAcceptanceInput {
  expectedIdentity: string | null | undefined
  observedIdentity: string | null | undefined
  confidence: number | null | undefined
  extractedValue: number | null | undefined
}

export interface ReadingAcceptanceResult {
  identityMatch: MeterIdentityMatch
  accepted: boolean
  reason:
    | 'accepted'
    | 'identity_missing'
    | 'identity_invalid'
    | 'identity_mismatch'
    | 'confidence_too_low'
    | 'reading_missing'
    | 'reading_invalid'
}

export function evaluateReadingAcceptance(input: ReadingAcceptanceInput): ReadingAcceptanceResult {
  const identityMatch = matchMeterIdentity(input.expectedIdentity, input.observedIdentity)

  if (input.extractedValue === null || input.extractedValue === undefined) {
    return { identityMatch, accepted: false, reason: 'reading_missing' }
  }

  if (!Number.isFinite(input.extractedValue) || input.extractedValue < 0) {
    return { identityMatch, accepted: false, reason: 'reading_invalid' }
  }

  if (identityMatch === 'missing') return { identityMatch, accepted: false, reason: 'identity_missing' }
  if (identityMatch === 'invalid') return { identityMatch, accepted: false, reason: 'identity_invalid' }
  if (identityMatch === 'mismatch') return { identityMatch, accepted: false, reason: 'identity_mismatch' }
  if (!canAcceptReading(identityMatch, input.confidence)) {
    return { identityMatch, accepted: false, reason: 'confidence_too_low' }
  }

  return { identityMatch, accepted: true, reason: 'accepted' }
}
