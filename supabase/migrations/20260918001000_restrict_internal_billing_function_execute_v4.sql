revoke execute on function public.mizan_calculate_consumption(uuid) from anon, authenticated;
revoke execute on function public.mizan_calculate_tariff_charge(uuid, numeric) from anon, authenticated;
grant execute on function public.mizan_calculate_consumption(uuid) to service_role;
grant execute on function public.mizan_calculate_tariff_charge(uuid, numeric) to service_role;
