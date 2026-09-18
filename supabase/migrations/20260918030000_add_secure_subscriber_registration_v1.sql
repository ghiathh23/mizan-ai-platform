create or replace function public.mizan_register_subscriber(
  p_project_id uuid,
  p_customer_reference text,
  p_full_name text,
  p_phone text default null,
  p_service_area_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_reference text := btrim(p_customer_reference);
  v_name text := btrim(p_full_name);
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_project_id is null or not public.mizan_private.can_access_project(p_project_id) then
    raise exception 'project_access_denied';
  end if;
  if not (public.mizan_private.has_permission('project.manage', p_project_id, null)
      or public.mizan_private.has_permission('organization.manage', p_project_id, null)) then
    raise exception 'permission_denied';
  end if;
  if v_reference is null or length(v_reference) < 2 or length(v_reference) > 100 then
    raise exception 'invalid_customer_reference';
  end if;
  if v_name is null or length(v_name) < 2 or length(v_name) > 200 then
    raise exception 'invalid_subscriber_name';
  end if;
  if p_phone is not null and length(btrim(p_phone)) > 40 then
    raise exception 'invalid_subscriber_phone';
  end if;
  if p_service_area_id is not null and not exists (
    select 1 from public.service_areas sa
    where sa.id = p_service_area_id and sa.project_id = p_project_id
  ) then
    raise exception 'service_area_project_mismatch';
  end if;
  insert into public.subscribers(project_id, service_area_id, customer_reference, full_name, phone, service_status)
  values (p_project_id, p_service_area_id, v_reference, v_name, nullif(btrim(p_phone), ''), 'active')
  returning id into v_id;
  return v_id;
exception
  when unique_violation then raise exception 'subscriber_duplicate';
end;
$$;
revoke all on function public.mizan_register_subscriber(uuid,text,text,text,uuid) from public, anon;
grant execute on function public.mizan_register_subscriber(uuid,text,text,text,uuid) to authenticated, service_role;
