import { supabase } from '../lib/supabase'
import type { BillingResult, Meter, MeterReading, Project, Subscriber } from '../types/domain'

export const mizanService = {
  async listProjects(): Promise<Project[]> {
    const { data, error } = await supabase.from('projects').select('id,name,organization_id,status').order('name')
    if (error) throw error
    return (data ?? []) as Project[]
  },

  async listSubscribers(projectId: string, search = ''): Promise<Subscriber[]> {
    let query = supabase.from('subscribers').select('id,project_id,subscriber_code,full_name,phone,status').eq('project_id', projectId).order('full_name')
    if (search.trim()) query = query.ilike('full_name', `%${search.trim()}%`)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Subscriber[]
  },

  async createSubscriber(input: Pick<Subscriber, 'project_id' | 'full_name' | 'phone' | 'subscriber_code'>) {
    const { data, error } = await supabase.from('subscribers').insert(input).select().single()
    if (error) throw error
    return data as Subscriber
  },

  async updateSubscriber(id: string, input: Partial<Pick<Subscriber, 'full_name' | 'phone' | 'subscriber_code' | 'status'>>) {
    const { data, error } = await supabase.from('subscribers').update(input).eq('id', id).select().single()
    if (error) throw error
    return data as Subscriber
  },

  async listMeters(projectId: string): Promise<Meter[]> {
    const { data, error } = await supabase.from('meters').select('id,project_id,serial_number,meter_type').eq('project_id', projectId).order('serial_number')
    if (error) throw error
    return (data ?? []) as Meter[]
  },

  async listReadings(meterId: string): Promise<MeterReading[]> {
    const { data, error } = await supabase.from('meter_readings').select('id,project_id,meter_id,reading_date,extracted_value,corrected_value,official_value,validation_status,evidence_id').eq('meter_id', meterId).order('reading_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as MeterReading[]
  },

  async uploadEvidence(projectId: string, file: File) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `projects/${projectId}/${crypto.randomUUID()}-${safeName}`
    const { error } = await supabase.storage.from('meter-evidence').upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw error
    return { path, contentType: file.type, size: file.size, name: file.name }
  },

  async createReading(input: Record<string, unknown>): Promise<MeterReading> {
    const { data, error } = await supabase.from('meter_readings').insert(input).select().single()
    if (error) throw error
    return data as MeterReading
  },

  async validateReading(readingId: string, officialValue: number): Promise<MeterReading> {
    const { data, error } = await supabase.rpc('mizan_validate_reading', { p_reading_id: readingId, p_official_value: officialValue })
    if (error) throw error
    return data as MeterReading
  },

  async generateInvoice(readingId: string): Promise<BillingResult> {
    const { data, error } = await supabase.rpc('mizan_generate_invoice', { p_reading_id: readingId })
    if (error) throw error
    return (data ?? {}) as BillingResult
  }
}
