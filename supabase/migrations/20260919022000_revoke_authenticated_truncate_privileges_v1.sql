-- Prevent browser-facing roles from truncating application tables.
-- Row Level Security does not protect TRUNCATE, so this privilege is removed explicitly.
REVOKE TRUNCATE ON TABLE public.audit_events, public.consumptions, public.invoices,
  public.meter_assignments, public.meter_evidence, public.meter_readings,
  public.meters, public.receivables, public.service_areas, public.subscribers,
  public.sync_operations, public.tariff_tiers, public.tariffs
  FROM anon, authenticated;
