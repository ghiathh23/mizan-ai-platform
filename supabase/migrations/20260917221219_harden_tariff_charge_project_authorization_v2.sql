create or replace function public.mizan_calculate_tariff_charge(p_tariff_id uuid, p_consumption numeric)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_total numeric := 0;
  v_from numeric;
  v_to numeric;
  v_quantity numeric;
  v_expected_from numeric := 0;
  v_seen boolean := false;
  v_tariff_project_id uuid;
  t record;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if p_consumption is null or p_consumption < 0 then
    raise exception 'invalid_consumption';
  end if;

  select project_id into v_tariff_project_id
  from public.tariffs
  where id = p_tariff_id;
  if not found then
    raise exception 'tariff_not_found';
  end if;
  if not mizan_private.can_access_project(v_tariff_project_id) then
    raise exception 'not_authorized';
  end if;

  for t in
    select threshold_from, threshold_to, unit_price
    from public.tariff_tiers
    where tariff_id = p_tariff_id
    order by threshold_from asc
  loop
    if t.threshold_from <> v_expected_from then
      raise exception 'invalid_tariff_tier_sequence';
    end if;
    v_seen := true;
    v_from := t.threshold_from;
    v_to := coalesce(t.threshold_to, p_consumption);

    if p_consumption > v_from then
      v_quantity := least(p_consumption, v_to) - v_from;
      if v_quantity > 0 then
        v_total := v_total + (v_quantity * t.unit_price);
      end if;
    end if;

    if t.threshold_to is null then
      v_expected_from := p_consumption;
    else
      v_expected_from := t.threshold_to;
    end if;
  end loop;

  if not v_seen then
    raise exception 'tariff_has_no_tiers';
  end if;
  if v_expected_from < p_consumption then
    raise exception 'tariff_does_not_cover_consumption';
  end if;

  return v_total;
end;
$function$;

revoke execute on function public.mizan_calculate_tariff_charge(uuid, numeric) from public, anon;
grant execute on function public.mizan_calculate_tariff_charge(uuid, numeric) to authenticated;
