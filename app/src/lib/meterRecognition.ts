export type MeterKind = 'mechanical_dial' | 'digital_display' | 'smart_meter' | 'unknown'
export type RecognitionSource = 'manual' | 'vision_provider' | 'device_ocr'

export interface MeterRecognitionCandidate {
  meter_kind: MeterKind
  observed_identity: string | null
  extracted_value: number | null
  confidence: number | null
  source: RecognitionSource
  warnings: string[]
}

export function createManualRecognitionCandidate(input: {
  meter_kind?: MeterKind
  observed_identity?: string | null
  extracted_value?: number | null
}): MeterRecognitionCandidate {
  return {
    meter_kind: input.meter_kind ?? 'unknown',
    observed_identity: input.observed_identity ?? null,
    extracted_value: input.extracted_value ?? null,
    confidence: null,
    source: 'manual',
    warnings: ['manual_review_required'],
  }
}

export function isRecognitionCandidateValid(candidate: MeterRecognitionCandidate): boolean {
  return candidate.extracted_value === null || (Number.isFinite(candidate.extracted_value) && candidate.extracted_value >= 0)
}
