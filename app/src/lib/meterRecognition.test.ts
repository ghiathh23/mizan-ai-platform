import { describe, expect, it } from 'vitest'
import { createManualRecognitionCandidate, isRecognitionCandidateValid } from './meterRecognition'

describe('meter recognition contract', () => {
  it('creates a manual candidate that requires review', () => {
    const candidate = createManualRecognitionCandidate({ extracted_value: 12.5 })
    expect(candidate.source).toBe('manual')
    expect(candidate.warnings).toContain('manual_review_required')
    expect(candidate.extracted_value).toBe(12.5)
  })

  it('rejects negative or non-finite readings', () => {
    expect(isRecognitionCandidateValid(createManualRecognitionCandidate({ extracted_value: -1 }))).toBe(false)
    expect(isRecognitionCandidateValid(createManualRecognitionCandidate({ extracted_value: Number.NaN }))).toBe(false)
    expect(isRecognitionCandidateValid(createManualRecognitionCandidate({ extracted_value: null }))).toBe(true)
  })
})
