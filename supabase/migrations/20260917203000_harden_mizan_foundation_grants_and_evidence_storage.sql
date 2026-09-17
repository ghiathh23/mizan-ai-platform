-- Reconstructed corrective migration applied to the live Supabase project.
-- This file documents the intended corrective change; verify against the live
-- migration record before replaying in another environment.

REVOKE ALL ON TABLE public.organizations, public.projects, public.profiles,
  public.organization_memberships, public.project_memberships,
  public.roles, public.permissions, public.role_permissions,
  public.user_roles, public.lifecycle_events FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.organizations, public.projects, public.profiles,
  public.organization_memberships, public.project_memberships,
  public.roles, public.permissions, public.role_permissions,
  public.user_roles, public.lifecycle_events FROM authenticated;

GRANT SELECT ON TABLE public.organizations, public.projects, public.profiles,
  public.organization_memberships, public.project_memberships,
  public.roles, public.permissions, public.role_permissions,
  public.user_roles, public.lifecycle_events TO authenticated;

GRANT UPDATE (display_name, preferred_locale, updated_at)
  ON TABLE public.profiles TO authenticated;

-- Storage bucket and policies were applied through the connected Supabase
-- environment. Keep the live policy definitions as the verification source
-- until a canonical generated migration is captured.
