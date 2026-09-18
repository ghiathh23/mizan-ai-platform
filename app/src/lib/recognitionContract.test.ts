import { describe, expect, it } from 'vitest'
import { hasRecognizedReading, isUsableRecognitionConfidence, type MeterRecognitionResult } from './recognitionContract'

const baseResult: MeterRecognitionResult = {
  meter_kind: 'digital_display',
  identity_candidates: [],
  reading_candidates: [{ value: 123.4, confidence: 0.96, source: 'vision_model' }],
  warnings: [],
  analyzed_at: new Date().toISOString(),
  provider: 'test-provider',
  is_automated: true,
}

describe('recognitionContract', () => {
  it('validates confidence boundaries', () => {
    expect(isUsableRecognitionConfidence(null)).toBe(true)
    expect(isUsableRecognitionConfidence(0)).toBe(true)
    expect(isUsableRecognitionConfidence(1)).toBe(true)
    expect(isUsableRecognitionConfidence(-0.1)).toBe(false)
    expect(isUsableRecognitionConfidence(1.1)).toBe(false)
  })

  it('detects a valid recognized reading', () => {
    expect(hasRecognizedReading(baseResult)).toBe(true)
    expect(hasRecognizedReading({ ...baseResult, reading_candidates: [{ value: -1, confidence: 0.99, source: 'ocr' }] })).toBe(false)
  })
})
