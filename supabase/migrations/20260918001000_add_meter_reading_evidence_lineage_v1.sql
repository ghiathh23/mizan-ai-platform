alter table public.meter_readings
  add column if not exists evidence_id uuid;

alter table public.meter_readings
  drop constraint if exists meter_readings_evidence_id_fkey;

alter table public.meter_readings
  add constraint meter_readings_evidence_id_fkey
  foreign key (evidence_id)
  references public.meter_evidence(id)
  on delete set null;

create index if not exists idx_meter_readings_evidence_id
  on public.meter_readings(evidence_id);
