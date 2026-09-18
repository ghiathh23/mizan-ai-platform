create or replace function mizan_private.has_permission(
  p_permission_code text,
  p_project_id uuid default null,
  p_organization_id uuid default null
)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    left join public.projects pr on pr.id = p_project_id
    where ur.user_id = (select auth.uid())
      and p.code = p_permission_code
      and (
        (r.scope = 'platform' and ur.organization_id is null and ur.project_id is null)
        or (r.scope = 'organization' and ur.organization_id = coalesce(p_organization_id, pr.organization_id))
        or (r.scope = 'project' and ur.project_id = p_project_id)
      )
  );
$function$;

revoke all on function mizan_private.has_permission(text, uuid, uuid) from public, anon;
grant execute on function mizan_private.has_permission(text, uuid, uuid) to authenticated;

-- The existing RPC implementations are retained and must include these checks:
-- mizan_validate_reading: has_permission('meter.reading.validate', r.project_id, null)
-- mizan_generate_invoice: has_permission('billing.generate', v_current.project_id, null)
-- Both functions remain SECURITY DEFINER and are executable by authenticated/service_role only.
