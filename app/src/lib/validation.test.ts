import { describe, expect, it } from 'vitest'
import { parseAndValidateReadingValue, validateEvidenceFile, validateReadingValue } from './validation'

const file = (type: string, size: number) => ({ type, size }) as File

describe('reading validation', () => {
  it('accepts zero and positive values', () => {
    expect(validateReadingValue(0)).toBeNull()
    expect(validateReadingValue(12.5)).toBeNull()
  })
  it('rejects negative and non-finite values', () => {
    expect(validateReadingValue(-1)).toBeTruthy()
    expect(validateReadingValue(Number.NaN)).toBeTruthy()
  })
  it('rejects empty raw input instead of coercing it to zero', () => {
    expect(parseAndValidateReadingValue('')).toEqual({ value: null, error: 'قيمة القراءة مطلوبة.' })
    expect(parseAndValidateReadingValue('   ')).toEqual({ value: null, error: 'قيمة القراءة مطلوبة.' })
  })
  it('parses valid raw input', () => {
    expect(parseAndValidateReadingValue('12.5')).toEqual({ value: 12.5, error: null })
  })
})

describe('evidence validation', () => {
  it('accepts supported MIME types within the size limit', () => {
    expect(validateEvidenceFile(file('image/jpeg', 1024))).toBeNull()
    expect(validateEvidenceFile(file('image/png', 10 * 1024 * 1024))).toBeNull()
  })
  it('rejects unsupported MIME types and oversized files', () => {
    expect(validateEvidenceFile(file('application/pdf', 1024))).toBeTruthy()
    expect(validateEvidenceFile(file('image/webp', 10 * 1024 * 1024 + 1))).toBeTruthy()
  })
})
