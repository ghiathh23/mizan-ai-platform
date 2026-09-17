create or replace function mizan_private.validate_reading_evidence_lineage()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.evidence_id is not null then
    if not exists (
      select 1
      from public.meter_evidence e
      where e.id = new.evidence_id
        and e.project_id = new.project_id
        and e.meter_id = new.meter_id
    ) then
      raise exception 'evidence_project_meter_mismatch';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function mizan_private.validate_reading_evidence_lineage() from public, anon, authenticated;

drop trigger if exists trg_validate_reading_evidence_lineage on public.meter_readings;

create trigger trg_validate_reading_evidence_lineage
before insert or update of evidence_id, project_id, meter_id
on public.meter_readings
for each row execute function mizan_private.validate_reading_evidence_lineage();
