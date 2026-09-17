const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024
const ALLOWED_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export function validateReadingValue(value: number): string | null {
  if (!Number.isFinite(value)) return 'أدخل رقمًا صحيحًا للقراءة.'
  if (value < 0) return 'لا يمكن أن تكون القراءة سالبة.'
  return null
}

export function parseAndValidateReadingValue(rawValue: string): { value: number | null; error: string | null } {
  if (rawValue.trim() === '') return { value: null, error: 'قيمة القراءة مطلوبة.' }
  const value = Number(rawValue)
  const error = validateReadingValue(value)
  return error ? { value: null, error } : { value, error: null }
}

export function validateEvidenceFile(file: File): string | null {
  if (!ALLOWED_EVIDENCE_TYPES.includes(file.type as (typeof ALLOWED_EVIDENCE_TYPES)[number])) {
    return 'صيغة الصورة غير مدعومة.'
  }
  if (file.size > MAX_EVIDENCE_BYTES) return 'حجم الصورة يتجاوز 10 ميغابايت.'
  return null
}
