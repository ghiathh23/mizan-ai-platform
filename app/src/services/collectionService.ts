import { supabase } from '../lib/supabase'

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

export interface CollectionRecord {
  id: string
  project_id: string
  invoice_id: string
  subscriber_id: string
  collector_id: string
  amount: number
  payment_method: CollectionPaymentMethod
  reference_number: string | null
  status: 'pending' | 'confirmed' | 'void'
  idempotency_key: string
  collected_at: string
  confirmed_at: string | null
  confirmed_by: string | null
  voided_at: string | null
  voided_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

const makeIdempotencyKey = () => crypto.randomUUID()

export const collectionService = {
  async record(input: CollectionInput): Promise<string> {
    const { data, error } = await supabase.rpc('mizan_record_collection', {
      p_project_id: input.project_id,
      p_invoice_id: input.invoice_id,
      p_amount: input.amount,
      p_payment_method: input.payment_method,
      p_idempotency_key: input.idempotency_key ?? makeIdempotencyKey(),
      p_reference_number: input.reference_number?.trim() || null,
      p_notes: input.notes?.trim() || null,
      p_collected_at: input.collected_at ?? new Date().toISOString(),
    })
    if (error) throw error
    if (!data) throw new Error('collection_missing_id')
    return data as string
  },

  async list(projectId: string, invoiceId?: string): Promise<CollectionRecord[]> {
    let query = supabase.from('collection_records').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    if (invoiceId) query = query.eq('invoice_id', invoiceId)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as CollectionRecord[]
  },

  async void(collectionId: string, reason: string, operationId = crypto.randomUUID()): Promise<string> {
    const { data, error } = await supabase.rpc('mizan_void_collection', {
      p_collection_id: collectionId,
      p_reason: reason.trim(),
      p_operation_id: operationId,
    })
    if (error) throw error
    if (!data) throw new Error('collection_void_missing_id')
    return data as string
  },
}
