import type { CollectionInput, CollectionPaymentMethod } from './collectionService'

export const COLLECTION_PAYMENT_METHODS: readonly CollectionPaymentMethod[] = [
  'cash',
  'bank_transfer',
  'mobile_money',
  'other',
]

export const MIN_IDEMPOTENCY_KEY_LENGTH = 8

export function normalizeCollectionInput(input: CollectionInput): CollectionInput {
  return {
    ...input,
    project_id: input.project_id.trim(),
    invoice_id: input.invoice_id.trim(),
    reference_number: input.reference_number?.trim() || null,
    notes: input.notes?.trim() || null,
    idempotency_key: input.idempotency_key?.trim() || undefined,
  }
}

export function validateCollectionInput(input: CollectionInput): string | null {
  const normalized = normalizeCollectionInput(input)

  if (!normalized.project_id) return 'collection_project_required'
  if (!normalized.invoice_id) return 'collection_invoice_required'
  if (!Number.isFinite(normalized.amount) || normalized.amount <= 0) return 'collection_amount_invalid'
  if (!COLLECTION_PAYMENT_METHODS.includes(normalized.payment_method)) return 'collection_payment_method_invalid'
  if (normalized.idempotency_key !== undefined && normalized.idempotency_key.length < MIN_IDEMPOTENCY_KEY_LENGTH) {
    return 'collection_idempotency_key_invalid'
  }

  return null
}

export function validateVoidReason(reason: string): string | null {
  return reason.trim().length >= 5 ? null : 'collection_void_reason_required'
}
