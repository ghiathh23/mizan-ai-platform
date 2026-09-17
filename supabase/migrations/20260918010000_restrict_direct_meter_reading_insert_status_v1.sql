-- Restrict direct client inserts to proposed meter readings.
-- Official validation and correction remain available through SECURITY DEFINER RPCs.
drop policy if exists meter_readings_project_access on public.meter_readings;

create policy meter_readings_select_project_access
on public.meter_readings
for select
to authenticated
using (mizan_private.can_access_project(project_id));

create policy meter_readings_insert_proposed_only
on public.meter_readings
for insert
to authenticated
with check (
  mizan_private.can_access_project(project_id)
  and validation_status = 'proposed'
  and created_by = auth.uid()
);
