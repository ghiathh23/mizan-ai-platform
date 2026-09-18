import { describe, expect, it } from 'vitest'
import { normalizeCollectionInput, validateCollectionInput, validateVoidReason } from './collectionValidation'

const baseInput = {
  project_id: ' project-id ',
  invoice_id: ' invoice-id ',
  amount: 125,
  payment_method: 'cash' as const,
}

describe('collection validation', () => {
  it('normalizes identifiers and optional text fields', () => {
    expect(normalizeCollectionInput({ ...baseInput, reference_number: ' receipt-1 ', notes: ' paid ', idempotency_key: ' idem-key ' })).toMatchObject({
      project_id: 'project-id',
      invoice_id: 'invoice-id',
      reference_number: 'receipt-1',
      notes: 'paid',
      idempotency_key: 'idem-key',
    })
  })

  it('accepts a valid collection input', () => {
    expect(validateCollectionInput(baseInput)).toBeNull()
  })

  it('rejects missing context and invalid amounts', () => {
    expect(validateCollectionInput({ ...baseInput, project_id: ' ' })).toBe('collection_project_required')
    expect(validateCollectionInput({ ...baseInput, invoice_id: ' ' })).toBe('collection_invoice_required')
    expect(validateCollectionInput({ ...baseInput, amount: 0 })).toBe('collection_amount_invalid')
    expect(validateCollectionInput({ ...baseInput, amount: Number.NaN })).toBe('collection_amount_invalid')
  })

  it('rejects unsupported payment methods and short idempotency keys', () => {
    expect(validateCollectionInput({ ...baseInput, payment_method: 'crypto' as never })).toBe('collection_payment_method_invalid')
    expect(validateCollectionInput({ ...baseInput, idempotency_key: 'short' })).toBe('collection_idempotency_key_invalid')
  })

  it('validates void reasons consistently', () => {
    expect(validateVoidReason('1234')).toBe('collection_void_reason_required')
    expect(validateVoidReason('  تصحيح  ')).toBeNull()
  })
})
