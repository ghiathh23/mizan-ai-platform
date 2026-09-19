-- Enforce project/meter/evidence consistency before privileged reading insertion.
create or replace function public.mizan_sync_meter_reading(p_project_id uuid, p_meter_id uuid, p_evidence_id uuid, p_reading_at timestamptz, p_extracted_value numeric, p_operation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_reading_id uuid;
  v_meter_project uuid;
  v_evidence_project uuid;
  v_evidence_meter uuid;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode = '28000'; end if;
  if p_project_id is null or p_meter_id is null or p_evidence_id is null then raise exception 'project_meter_evidence_required' using errcode = '22023'; end if;
  if p_reading_at is null then raise exception 'reading_at_required' using errcode = '22023'; end if;
  if p_extracted_value is null or p_extracted_value < 0 then raise exception 'invalid_reading_value' using errcode = '22023'; end if;
  if p_operation_id is null then raise exception 'operation_id_required' using errcode = '22023'; end if;
  select m.project_id into v_meter_project from public.meters m where m.id = p_meter_id;
  if v_meter_project is null then raise exception 'meter_not_found'; end if;
  if v_meter_project <> p_project_id then raise exception 'meter_project_mismatch'; end if;
  select e.project_id, e.meter_id into v_evidence_project, v_evidence_meter from public.meter_evidence e where e.id = p_evidence_id;
  if v_evidence_project is null then raise exception 'evidence_not_found'; end if;
  if v_evidence_project <> p_project_id or v_evidence_meter <> p_meter_id then raise exception 'evidence_project_meter_mismatch'; end if;
  if not public.mizan_private.can_access_project(p_project_id) then raise exception 'project_access_denied' using errcode = '42501'; end if;
  if not public.mizan_private.has_permission('meter.reading.create', p_project_id, null) then raise exception 'permission_denied' using errcode = '42501'; end if;
  select mr.id into v_reading_id from public.meter_readings mr where mr.operation_id = p_operation_id;
  if v_reading_id is not null then return v_reading_id; end if;
  insert into public.meter_readings (project_id, meter_id, evidence_id, reading_at, extracted_value, validation_status, created_by, operation_id)
  values (p_project_id, p_meter_id, p_evidence_id, p_reading_at, p_extracted_value, 'proposed', v_user_id, p_operation_id)
  returning id into v_reading_id;
  return v_reading_id;
exception when unique_violation then
  select mr.id into v_reading_id from public.meter_readings mr where mr.operation_id = p_operation_id;
  if v_reading_id is not null then return v_reading_id; end if;
  raise;
end;
$$;
