-- Prevent direct clients from supplying trusted validation fields.
-- Official validation and correction remain available through SECURITY DEFINER RPCs.
drop policy if exists meter_readings_insert_proposed_only on public.meter_readings;

create policy meter_readings_insert_proposed_only
on public.meter_readings
for insert
to authenticated
with check (
  mizan_private.can_access_project(project_id)
  and validation_status = 'proposed'
  and created_by = auth.uid()
  and official_value is null
  and corrected_value is null
  and validated_by is null
  and validated_at is null
);
