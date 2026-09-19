export type CollectionPaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money' | 'other'

export interface CollectionInput {
  project_id: string
  invoice_id: string
  amount: number
  payment_method: CollectionPaymentMethod
  reference_number?: string | null
  collected_at?: string
  notes?: string | null
  idempotency_key?: string
}
