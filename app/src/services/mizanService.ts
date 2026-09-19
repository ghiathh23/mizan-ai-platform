import { supabase } from '../lib/supabase'
import { getOfflineEvidence } from '../offline/offlineEvidence'
import { queueOfflineReading } from '../offline/offlineReading'
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
  operation_id?: string
}

export function validateSubscriberInput(input: Pick<Subscriber, 'project_id' | 'full_name' | 'phone' | 'subscriber_code'>): string | null {
  if (!input.project_id.trim()) return 'project_id_required'
  if (!input.full_name.trim()) return 'subscriber_name_required'
  if (!input.subscriber_code?.trim()) return 'subscriber_code_required'
  return null
}

const requireUserId = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('authentication_required')
  return data.user.id
}

const operationId = () => crypto.randomUUID()

async function resolveEvidenceIdForOnlineReading(evidenceId: string | null | undefined): Promise<string | null> {
  if (!evidenceId) return null
  const localEvidence = await getOfflineEvidence(evidenceId)
  if (!localEvidence) return evidenceId
  if (localEvidence.server_evidence_id) return localEvidence.server_evidence_id
  if (localEvidence.sync_status === 'rejected') throw new Error('offline_evidence_rejected')
  throw new Error('offline_evidence_sync_required')
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
    return (data ?? []).map((item) => ({ ...item, subscriber_code: item.customer_reference, status: item.service_status })) as Subscriber[]
  },

  async createSubscriber(input: Pick<Subscriber, 'project_id' | 'full_name' | 'phone' | 'subscriber_code'>) {
    const validationError = validateSubscriberInput(input)
    if (validationError) throw new Error(validationError)
    const subscriberCode = input.subscriber_code?.trim()
    if (!subscriberCode) throw new Error('subscriber_code_required')

    const { data, error } = await supabase.rpc('mizan_register_subscriber', {
      p_project_id: input.project_id,
      p_customer_reference: subscriberCode,
      p_full_name: input.full_name.trim(),
      p_phone: input.phone?.trim() || null,
      p_service_area_id: null,
    })
    if (error) throw error
    if (!data) throw new Error('subscriber_missing_id')
    return { id: data, ...input, subscriber_code: subscriberCode, status: 'active' } as Subscriber
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
    const userId = await requireUserId()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `projects/${projectId}/${crypto.randomUUID()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from('meter-evidence').upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false })
    if (uploadError) throw uploadError

    const { data, error: recordError } = await supabase.from('meter_evidence').insert({ project_id: projectId, meter_id: meterId, storage_path: path, captured_at: new Date().toISOString(), device_metadata: { ...metadata, original_name: file.name, content_type: file.type, size_bytes: file.size }, image_quality_status: 'pending', recognition_status: 'pending', created_by: userId }).select().single()
    if (recordError) {
      await supabase.storage.from('meter-evidence').remove([path])
      throw recordError
    }
    return data as EvidenceRecord
  },

  async createReading(input: ReadingInput): Promise<MeterReading> {
    const parsedValue = input.extracted_value ?? null
    if (!navigator.onLine) {
      if (parsedValue === null) throw new Error('offline_reading_value_required')
      let queuedEvidenceId = input.evidence_id ?? null
      if (input.evidence_id) {
        const localEvidence = await getOfflineEvidence(input.evidence_id)
        if (localEvidence?.server_evidence_id) {
          queuedEvidenceId = localEvidence.server_evidence_id
        } else if (localEvidence) {
          if (localEvidence.sync_status === 'rejected') throw new Error('offline_evidence_rejected')
          throw new Error('offline_evidence_sync_required')
        }
      }
      const queuedId = await queueOfflineReading({
        project_id: input.project_id,
        meter_id: input.meter_id,
        evidence_id: queuedEvidenceId,
        reading_at: input.reading_at,
        extracted_value: parsedValue,
      })
      return {
        id: queuedId,
        project_id: input.project_id,
        meter_id: input.meter_id,
        evidence_id: queuedEvidenceId,
        reading_at: input.reading_at,
        reading_date: input.reading_at,
        extracted_value: parsedValue,
        corrected_value: null,
        official_value: null,
        validation_status: 'proposed',
      } as MeterReading
    }

    const serverEvidenceId = await resolveEvidenceIdForOnlineReading(input.evidence_id)
    const { data: readingId, error } = await supabase.rpc('mizan_sync_meter_reading', {
      p_project_id: input.project_id,
      p_meter_id: input.meter_id,
      p_evidence_id: serverEvidenceId,
      p_reading_at: input.reading_at,
      p_extracted_value: parsedValue,
      p_operation_id: input.operation_id ?? operationId(),
    })
    if (error) throw error
    if (!readingId) throw new Error('reading_missing_id')

    const { data, error: readError } = await supabase.from('meter_readings').select('id,project_id,meter_id,reading_at,extracted_value,corrected_value,official_value,validation_status,evidence_id').eq('id', readingId).single()
    if (readError) throw readError
    return { ...data, reading_date: data.reading_at } as MeterReading
  },

  async validateReading(readingId: string, officialValue: number, reason?: string): Promise<string> {
    const { data, error } = await supabase.rpc('mizan_validate_reading', { p_reading_id: readingId, p_official_value: officialValue, p_reason: reason ?? null, p_operation_id: operationId() })
    if (error) throw error
    return data as string
  },

  async generateInvoice(readingId: string, billingPeriodStart: string, billingPeriodEnd: string, dueDate: string, arrears = 0): Promise<BillingResult> {
    const { data: invoiceId, error } = await supabase.rpc('mizan_generate_invoice', { p_current_reading_id: readingId, p_billing_period_start: billingPeriodStart, p_billing_period_end: billingPeriodEnd, p_due_date: dueDate, p_arrears: arrears, p_operation_id: operationId() })
    if (error) throw error

    const { data: invoice, error: invoiceError } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()
    if (invoiceError) throw invoiceError
    const { data: receivable, error: receivableError } = await supabase.from('receivables').select('*').eq('invoice_id', invoiceId).single()
    if (receivableError) throw receivableError
    const { data: audit, error: auditError } = await supabase.from('audit_events').select('*').eq('entity_id', invoiceId).eq('entity_type', 'invoice').eq('action', 'generated').order('occurred_at', { ascending: false }).limit(1).maybeSingle()
    if (auditError) throw auditError

    return { invoice_id: invoice.id, receivable_id: receivable.id, consumption_id: invoice.consumption_id, audit_event_id: audit?.id, consumption_value: invoice.consumption, charge_amount: invoice.charges, total_due: invoice.total_due, status: invoice.status }
  },
}
