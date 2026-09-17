alter table public.meter_readings drop constraint if exists meter_readings_evidence_project_meter_fkey;
alter table public.meter_readings add constraint meter_readings_evidence_id_fkey foreign key (evidence_id) references public.meter_evidence(id) on delete set null;
alter table public.meter_evidence drop constraint if exists meter_evidence_id_project_meter_key;
