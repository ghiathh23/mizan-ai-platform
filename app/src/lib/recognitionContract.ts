export type MeterKind = 'mechanical_dial' | 'digital_display' | 'smart_meter' | 'unknown'
export type RecognitionSource = 'manual' | 'ocr' | 'vision_model' | 'device' | 'unknown'

export interface RecognitionCandidate<T> {
  value: T
  confidence: number | null
  source: RecognitionSource
}

export interface MeterRecognitionResult {
  meter_kind: MeterKind
  identity_candidates: Array<RecognitionCandidate<string>>
  reading_candidates: Array<RecognitionCandidate<number>>
  warnings: string[]
  analyzed_at: string
  provider: string
  is_automated: boolean
}

export function isUsableRecognitionConfidence(confidence: number | null): boolean {
  return confidence === null || (Number.isFinite(confidence) && confidence >= 0 && confidence <= 1)
}

export function hasRecognizedReading(result: MeterRecognitionResult): boolean {
  return result.reading_candidates.some((candidate) =>
    Number.isFinite(candidate.value) && candidate.value >= 0 && isUsableRecognitionConfidence(candidate.confidence),
  )
}
