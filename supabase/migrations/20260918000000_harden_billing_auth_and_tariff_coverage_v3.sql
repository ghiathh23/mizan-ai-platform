-- Harden billing RPC authentication and tariff coverage.
-- Applied to Supabase project ntzbamdbvkefgpnoudnf before repository reconciliation.

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
  v_open_ended boolean := false;
  v_tariff_project_id uuid;
  t record;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_consumption is null or p_consumption < 0 then raise exception 'invalid_consumption'; end if;
  select project_id into v_tariff_project_id from public.tariffs where id = p_tariff_id;
  if not found then raise exception 'tariff_not_found'; end if;
  if not mizan_private.can_access_project(v_tariff_project_id) then raise exception 'not_authorized'; end if;
  for t in select threshold_from, threshold_to, unit_price from public.tariff_tiers where tariff_id = p_tariff_id order by threshold_from asc loop
    if t.threshold_from <> v_expected_from then raise exception 'invalid_tariff_tier_sequence'; end if;
    if v_open_ended then raise exception 'invalid_tariff_tier_sequence'; end if;
    v_seen := true;
    v_from := t.threshold_from;
    v_to := t.threshold_to;
    if p_consumption > v_from then
      v_quantity := case when v_to is null then p_consumption - v_from else least(p_consumption, v_to) - v_from end;
      if v_quantity > 0 then v_total := v_total + (v_quantity * t.unit_price); end if;
    end if;
    if v_to is null then v_open_ended := true; v_expected_from := p_consumption; else v_expected_from := v_to; end if;
  end loop;
  if not v_seen then raise exception 'tariff_has_no_tiers'; end if;
  if not v_open_ended and v_expected_from < p_consumption then raise exception 'tariff_does_not_cover_consumption'; end if;
  return v_total;
end;
$function$;

create or replace function public.mizan_validate_reading(p_reading_id uuid, p_official_value numeric, p_reason text default null, p_operation_id uuid default gen_random_uuid())
returns uuid language plpgsql security definer set search_path = public, pg_temp as $function$
declare r public.meter_readings%rowtype; prior jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_official_value is null or p_official_value < 0 then raise exception 'invalid_official_value'; end if;
  select * into r from public.meter_readings where id = p_reading_id for update;
  if not found then raise exception 'reading_not_found'; end if;
  if not mizan_private.can_access_project(r.project_id) then raise exception 'not_authorized'; end if;
  prior = jsonb_build_object('corrected_value', r.corrected_value, 'official_value', r.official_value, 'validation_status', r.validation_status);
  update public.meter_readings set corrected_value = case when r.extracted_value is distinct from p_official_value then p_official_value else corrected_value end, official_value = p_official_value, validation_status = case when r.extracted_value is distinct from p_official_value then 'corrected' else 'validated' end, validation_reason = p_reason, validated_by = auth.uid(), validated_at = now() where id = p_reading_id;
  insert into public.audit_events(project_id, actor_id, entity_type, entity_id, action, previous_value, new_value, evidence_reference, operation_id) values(r.project_id, auth.uid(), 'meter_reading', r.id, case when r.extracted_value is distinct from p_official_value then 'corrected_and_validated' else 'validated' end, prior, jsonb_build_object('extracted_value', r.extracted_value, 'corrected_value', p_official_value, 'official_value', p_official_value, 'reason', p_reason), r.evidence_id::text, p_operation_id);
  return p_reading_id;
end;
$function$;

create or replace function public.mizan_generate_invoice(p_current_reading_id uuid, p_billing_period_start date, p_billing_period_end date, p_due_date date, p_arrears numeric default 0, p_operation_id uuid default gen_random_uuid())
returns uuid language plpgsql security definer set search_path = public, pg_temp as $function$
declare
  v_current public.meter_readings%rowtype; v_previous_id uuid; v_previous_value numeric; v_consumption numeric; v_calc_status text; v_calc_reason text; v_tariff public.tariffs%rowtype; v_charge numeric; v_consumption_id uuid; v_invoice_id uuid; v_existing_invoice public.invoices%rowtype; v_subscriber_id uuid; v_arrears numeric := coalesce(p_arrears, 0);
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_billing_period_start is null or p_billing_period_end is null or p_billing_period_start > p_billing_period_end then raise exception 'invalid_billing_period'; end if;
  if v_arrears < 0 then raise exception 'invalid_arrears'; end if;
  select * into v_current from public.meter_readings where id = p_current_reading_id and validation_status in ('validated','corrected') for update;
  if not found then raise exception 'current_reading_not_validated'; end if;
  if not mizan_private.can_access_project(v_current.project_id) then raise exception 'not_authorized'; end if;
  select ma.subscriber_id into v_subscriber_id from public.meter_assignments ma where ma.meter_id = v_current.meter_id and ma.project_id = v_current.project_id and ma.assigned_from <= v_current.reading_at and (ma.assigned_until is null or ma.assigned_until >= v_current.reading_at) order by ma.assigned_from desc limit 1;
  if v_subscriber_id is null then raise exception 'meter_has_no_assignment'; end if;
  select * into v_tariff from public.tariffs t where t.project_id = v_current.project_id and t.effective_from <= p_billing_period_end and (t.effective_until is null or t.effective_until >= p_billing_period_start) order by t.effective_from desc, t.version desc limit 1;
  if not found then raise exception 'no_effective_tariff'; end if;
  select * into v_previous_id, v_previous_value, v_consumption, v_calc_status, v_calc_reason from public.mizan_calculate_consumption(p_current_reading_id);
  if v_calc_status <> 'calculated' then raise exception 'consumption_requires_review:%', v_calc_reason; end if;
  v_charge := public.mizan_calculate_tariff_charge(v_tariff.id, v_consumption);
  insert into public.consumptions(project_id, meter_id, previous_reading_id, current_reading_id, previous_value, current_value, consumption_value, calculation_status) values(v_current.project_id, v_current.meter_id, v_previous_id, p_current_reading_id, v_previous_value, v_current.official_value, v_consumption, v_calc_status) on conflict (current_reading_id) do update set previous_reading_id = excluded.previous_reading_id, previous_value = excluded.previous_value, current_value = excluded.current_value, consumption_value = excluded.consumption_value, calculation_status = excluded.calculation_status returning id into v_consumption_id;
  select * into v_existing_invoice from public.invoices where consumption_id = v_consumption_id for update;
  if found then
    if v_existing_invoice.tariff_id <> v_tariff.id or v_existing_invoice.billing_period_start <> p_billing_period_start or v_existing_invoice.billing_period_end <> p_billing_period_end or v_existing_invoice.arrears <> v_arrears then raise exception 'invoice_already_exists_with_different_parameters'; end if;
    return v_existing_invoice.id;
  end if;
  insert into public.invoices(project_id, subscriber_id, meter_id, consumption_id, tariff_id, billing_period_start, billing_period_end, previous_reading, current_reading, consumption, charges, arrears, due_date, status) values(v_current.project_id, v_subscriber_id, v_current.meter_id, v_consumption_id, v_tariff.id, p_billing_period_start, p_billing_period_end, v_previous_value, v_current.official_value, v_consumption, v_charge, v_arrears, p_due_date, 'issued') returning id into v_invoice_id;
  insert into public.receivables(project_id, subscriber_id, invoice_id, amount_due, amount_paid, status) values(v_current.project_id, v_subscriber_id, v_invoice_id, v_charge + v_arrears, 0, 'open');
  insert into public.audit_events(project_id, actor_id, entity_type, entity_id, action, new_value, operation_id) values(v_current.project_id, auth.uid(), 'invoice', v_invoice_id, 'generated', jsonb_build_object('consumption', v_consumption, 'charges', v_charge, 'arrears', v_arrears, 'tariff_id', v_tariff.id, 'current_reading_id', p_current_reading_id), p_operation_id);
  return v_invoice_id;
end;
$function$;

revoke execute on function public.mizan_validate_reading(uuid,numeric,text,uuid) from public, anon;
revoke execute on function public.mizan_generate_invoice(uuid,date,date,date,numeric,uuid) from public, anon;
revoke execute on function public.mizan_calculate_tariff_charge(uuid,numeric) from public, anon;
grant execute on function public.mizan_validate_reading(uuid,numeric,text,uuid) to authenticated;
grant execute on function public.mizan_generate_invoice(uuid,date,date,date,numeric,uuid) to authenticated;
grant execute on function public.mizan_calculate_tariff_charge(uuid,numeric) to authenticated;
