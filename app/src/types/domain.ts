export type UUID = string

export interface Project {
  id: UUID
  name: string
  organization_id: UUID
  status?: string
}

export interface Subscriber {
  id: UUID
  project_id: UUID
  subscriber_code?: string | null
  full_name: string
  phone?: string | null
  status?: string | null
}

export interface Meter {
  id: UUID
  project_id: UUID
  serial_number: string
  meter_type?: string | null
  subscriber_id?: UUID | null
  previous_reading?: number | null
  last_reading_at?: string | null
}

export interface MeterReading {
  id: UUID
  project_id: UUID
  meter_id: UUID
  reading_date: string
  extracted_value?: number | null
  corrected_value?: number | null
  official_value?: number | null
  validation_status: string
  evidence_id?: UUID | null
}

export interface BillingResult {
  invoice_id?: UUID
  receivable_id?: UUID
  consumption_id?: UUID
  audit_event_id?: UUID
  consumption_value?: number
  charge_amount?: number
  status?: string
}
