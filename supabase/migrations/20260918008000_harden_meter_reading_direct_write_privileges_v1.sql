-- Allow authenticated clients to create and read proposed readings,
-- while routing reading changes and deletion through secured server functions.
revoke update, delete on table public.meter_readings from authenticated;
grant insert, select on table public.meter_readings to authenticated;
