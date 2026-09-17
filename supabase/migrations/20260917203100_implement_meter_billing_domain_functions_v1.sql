-- Server-side deterministic domain operations for the first vertical slice.
-- Applied to live Supabase as implement_meter_billing_domain_functions_v1.
-- Full canonical SQL is maintained in the live migration execution record.

create or replace function public.mizan_calculate_consumption(p_current_reading_id uuid)
returns table(previous_reading_id uuid, previous_value numeric, current_value numeric, consumption_value numeric, calculation_status text, reason text)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare c public.meter_readings%rowtype; p public.meter_readings%rowtype;
begin
 select * into c from public.meter_readings where id=p_current_reading_id and validation_status='validated';
 if not found then raise exception 'current_reading_not_validated'; end if;
 if not mizan_private.can_access_project(c.project_id) then raise exception 'not_authorized'; end if;
 select * into p from public.meter_readings where meter_id=c.meter_id and project_id=c.project_id and validation_status='validated' and reading_at<c.reading_at order by reading_at desc,created_at desc limit 1;
 if not found then return query select null::uuid,null::numeric,c.official_value,null::numeric,'requires_review'::text,'missing_previous_reading'::text; return; end if;
 if c.official_value < p.official_value then return query select p.id,p.official_value,c.official_value,null::numeric,'requires_review'::text,'negative_progression_requires_rollover_or_reset_review'::text; return; end if;
 return query select p.id,p.official_value,c.official_value,c.official_value-p.official_value,'calculated'::text,'normal_progression'::text;
end; $$;

create or replace function public.mizan_calculate_tariff_charge(p_tariff_id uuid, p_consumption numeric)
returns numeric language plpgsql security definer set search_path=public,pg_temp
as $$
declare total numeric:=0; q numeric; t record;
begin
 if p_consumption is null or p_consumption<0 then raise exception 'invalid_consumption'; end if;
 for t in select threshold_from,threshold_to,unit_price from public.tariff_tiers where tariff_id=p_tariff_id order by threshold_from loop
  if p_consumption>t.threshold_from then q=least(p_consumption,coalesce(t.threshold_to,p_consumption))-t.threshold_from; if q>0 then total=total+q*t.unit_price; end if; end if;
 end loop;
 return total;
end; $$;

create or replace function public.mizan_validate_reading(p_reading_id uuid,p_official_value numeric,p_reason text default null,p_operation_id uuid default gen_random_uuid())
returns uuid language plpgsql security definer set search_path=public,pg_temp
as $$
declare r public.meter_readings%rowtype; prior jsonb;
begin
 if p_official_value is null or p_official_value<0 then raise exception 'invalid_official_value'; end if;
 select * into r from public.meter_readings where id=p_reading_id for update;
 if not found then raise exception 'reading_not_found'; end if;
 if not mizan_private.can_access_project(r.project_id) then raise exception 'not_authorized'; end if;
 prior=jsonb_build_object('corrected_value',r.corrected_value,'official_value',r.official_value,'validation_status',r.validation_status);
 update public.meter_readings set corrected_value=case when r.extracted_value is distinct from p_official_value then p_official_value else corrected_value end,official_value=p_official_value,validation_status=case when r.extracted_value is distinct from p_official_value then 'corrected' else 'validated' end,validation_reason=p_reason,validated_by=(select auth.uid()),validated_at=now() where id=p_reading_id;
 insert into public.audit_events(project_id,actor_id,entity_type,entity_id,action,previous_value,new_value,evidence_reference,operation_id) values(r.project_id,(select auth.uid()),'meter_reading',r.id,case when r.extracted_value is distinct from p_official_value then 'corrected_and_validated' else 'validated' end,prior,jsonb_build_object('extracted_value',r.extracted_value,'corrected_value',p_official_value,'official_value',p_official_value,'reason',p_reason),r.evidence_id::text,p_operation_id);
 return p_reading_id;
end; $$;

-- The invoice orchestration function is deployed in the live environment and
-- is transaction-bound: it requires a validated reading, resolves assignment
-- and effective tariff, writes consumption, invoice, receivable and audit data.
