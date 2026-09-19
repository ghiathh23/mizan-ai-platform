-- Restrict direct authenticated writes to domain tables.
-- Business mutations must go through authorized server-side workflows/RPCs.
revoke insert, update, delete on table public.meter_assignments from authenticated;
revoke insert, update, delete on table public.meters from authenticated;
revoke insert, update, delete on table public.service_areas from authenticated;
revoke insert, update, delete on table public.subscribers from authenticated;
revoke insert, update, delete on table public.sync_operations from authenticated;
revoke insert, update, delete on table public.tariff_tiers from authenticated;
revoke insert, update, delete on table public.tariffs from authenticated;
revoke insert on table public.meter_readings from authenticated;

comment on table public.meter_assignments is 'Direct authenticated writes revoked; use authorized server-side workflows.';
comment on table public.meters is 'Direct authenticated writes revoked; use authorized server-side workflows.';
comment on table public.service_areas is 'Direct authenticated writes revoked; use authorized server-side workflows.';
comment on table public.subscribers is 'Direct authenticated writes revoked; use mizan_register_subscriber or authorized server-side workflows.';
comment on table public.sync_operations is 'Direct authenticated writes revoked; use authorized server-side workflows.';
comment on table public.tariff_tiers is 'Direct authenticated writes revoked; use authorized server-side workflows.';
comment on table public.tariffs is 'Direct authenticated writes revoked; use authorized server-side workflows.';
comment on table public.meter_readings is 'Direct authenticated inserts revoked; use mizan_sync_meter_reading.';
