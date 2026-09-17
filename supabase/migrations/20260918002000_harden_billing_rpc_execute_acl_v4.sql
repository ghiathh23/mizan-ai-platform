-- Keep billing RPCs callable only by explicitly intended API roles.
-- The authenticated grant is intentional because the web application invokes these RPCs.
revoke execute on function public.mizan_validate_reading(uuid, numeric, text, uuid) from public, anon;
revoke execute on function public.mizan_generate_invoice(uuid, date, date, date, numeric, uuid) from public, anon;
grant execute on function public.mizan_validate_reading(uuid, numeric, text, uuid) to authenticated, service_role;
grant execute on function public.mizan_generate_invoice(uuid, date, date, date, numeric, uuid) to authenticated, service_role;
