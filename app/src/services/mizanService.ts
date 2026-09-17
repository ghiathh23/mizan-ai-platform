import { supabase } from '../lib/supabase'
import type { BillingResult, Meter, MeterReading, Project, Subscriber } from '../types/domain'

export interface EvidenceRecord {
  id: string
  project_id: string
  meter_id: string
  storage_path: string
  captured_at: string
  device_metadata: Record<string, unknown>
  image_quality_status: string
  recognition_status: string
  recognition_confidence: number | null
  extracted_value: number | null
}

export interface ReadingInput {
  project_id: string
  meter_id: string
  evidence_id?: string | null
  reading_at: string
  extracted_value?: number | null
  corrected_value?: number | null
  official_value?: number | null
  validation_status?: 'proposed' | 'validated' | 'rejected' | 'corrected'
  validation_reason?: string | null
  operation_id?: string
}

export const mizanService = {
  async listProjects(): Promise<Project[]> {
    const { data, error } = await supabase.from('projects').select('id,name,organization_id,status').order('name')
    if (error) throw error
    return (data ?? []) as Project[]
  },

  async listSubscribers(projectId: string, search = ''): Promise<Subscriber[]> {
    let query = supabase.from('subscribers').select('id,project_id,customer_reference,full_name,phone,service_status').eq('project_id', projectId).order('full_name')
    if (search.trim()) query = query.ilike('full_name', `%${search.trim()}%`)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []).map((item) => ({
      ...item,
      subscriber_code: item.customer_reference,
      status: item.service_status,
    })) as Subscriber[]
  },

  async createSubscriber(input: Pick<Subscriber, 'project_id' | 'full_name' | 'phone' | 'subscriber_code'>) {
    const { data, error } = await supabase.from('subscribers').insert({
      project_id: input.project_id,
      full_name: input.full_name,
      phone: input.phone,
      customer_reference: input.subscriber_code,
    }).select().single()
    if (error) throw error
    return { ...data, subscriber_code: data.customer_reference, status: data.service_status } as Subscriber
  },

  async listMeters(projectId: string): Promise<Meter[]> {
    const { data, error } = await supabase.from('meters').select('id,project_id,serial_number,meter_type,unit,status').eq('project_id', projectId).order('serial_number')
    if (error) throw error
    return (data ?? []) as Meter[]
  },

  async listReadings(meterId: string): Promise<MeterReading[]> {
    const { data, error } = await supabase.from('meter_readings').select('id,project_id,meter_id,reading_at,extracted_value,corrected_value,official_value,validation_status,evidence_id').eq('meter_id', meterId).order('reading_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((item) => ({ ...item, reading_date: item.reading_at })) as MeterReading[]
  },

  async uploadEvidence(projectId: string, meterId: string, file: File, metadata: Record<string, unknown> = {}): Promise<EvidenceRecord> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `projects/${projectId}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from('meter-evidence').upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) throw uploadError

    const { data, error: recordError } = await supabase.from('meter_evidence').insert({
      project_id: projectId,
      meter_id: meterId,
      storage_path: path,
      captured_at: new Date().toISOString(),
      device_metadata: { ...metadata, original_name: file.name, content_type: file.type, size_bytes: file.size },
      image_quality_status: 'pending',
      recognition_status: 'pending',
    }).select().single()

    if (recordError) {
      await supabase.storage.from('meter-evidence').remove([path])
      throw recordError
    }
    return data as EvidenceRecord
  },

  async createReading(input: ReadingInput): Promise<MeterReading> {
    const { data, error } = await supabase.from('meter_readings').insert(input).select().single()
    if (error) throw error
    return { ...data, reading_date: data.reading_at } as MeterReading
  },

  async validateReading(readingId: string, officialValue: number, reason?: string): Promise<string> {
    const { data, error } = await supabase.rpc('mizan_validate_reading', {
      p_reading_id: readingId,
      p_official_value: officialValue,
      p_reason: reason ?? null,
    })
    if (error) throw error
    return data as string
  },

  async generateInvoice(readingId: string, billingPeriodStart: string, billingPeriodEnd: string, dueDate: string, arrears = 0): Promise<BillingResult> {
    const { data: invoiceId, error } = await supabase.rpc('mizan_generate_invoice', {
      p_current_reading_id: readingId,
      p_billing_period_start: billingPeriodStart,
      p_billing_period_end: billingPeriodEnd,
      p_due_date: dueDate,
      p_arrears: arrears,
    })
    if (error) throw error

    const { data: invoice, error: invoiceError } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()
    if (invoiceError) throw invoiceError
    const { data: receivable, error: receivableError } = await supabase.from('receivables').select('*').eq('invoice_id', invoiceId).single()
    if (receivableError) throw receivableError
    const { data: audit, error: auditError } = await supabase.from('audit_events').select('*').eq('entity_id', invoiceId).eq('entity_type', 'invoice').eq('action', 'generated').order('occurred_at', { ascending: false }).limit(1).maybeSingle()
    if (auditError) throw auditError

    return {
      invoice_id: invoice.id,
      receivable_id: receivable.id,
      consumption_id: invoice.consumption_id,
      audit_event_id: audit?.id,
      consumption_value: invoice.consumption,
      charge_amount: invoice.charges,
      total_due: invoice.total_due,
      status: invoice.status,
    }
  },
}
