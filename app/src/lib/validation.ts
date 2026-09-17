export function validateReadingValue(value: number): string | null {
  if (!Number.isFinite(value)) return 'أدخل رقمًا صحيحًا للقراءة.'
  if (value < 0) return 'لا يمكن أن تكون القراءة سالبة.'
  return null
}

export function validateEvidenceFile(file: File): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) return 'صيغة الصورة غير مدعومة.'
  if (file.size > 10 * 1024 * 1024) return 'حجم الصورة يتجاوز 10 ميغابايت.'
  return null
}
