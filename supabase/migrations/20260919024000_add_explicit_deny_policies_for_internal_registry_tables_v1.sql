-- Make the intentional deny-by-default posture explicit for internal registry tables.
-- No browser-facing role receives access through these policies.
create policy staff_onboarding_registry_deny_all on public.staff_onboarding_registry
  for all to anon, authenticated using (false) with check (false);

create policy user_login_identifiers_deny_all on public.user_login_identifiers
  for all to anon, authenticated using (false) with check (false);
