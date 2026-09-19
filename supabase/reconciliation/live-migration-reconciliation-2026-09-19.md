# MIZAN Live Migration Reconciliation — 2026-09-19

Project: `ntzbamdbvkefgpnoudnf`

## Verified live state

Supabase `list_migrations` reports **51 applied migration records**, including:

- `20260919144624 restrict_internal_project_helper_execute_v1`
- `20260919162925 harden_postgres_default_privileges_v1`

The latest default-privilege migration is stored in GitHub as:

- `supabase/migrations/20260919020000_harden_postgres_default_privileges_v1.sql`

The filename timestamp and the live Supabase migration version are different because the migration application process assigned the recorded execution version. They must not be treated as an exact timestamp match.

## Verified repository state

The GitHub default branch exposes a migration directory whose SQL files do not map one-to-one to the 51 live migration records. Several live migrations have no exact corresponding SQL file in the current repository. No missing historical SQL has been reconstructed from names or memory.

## Decision

**Reconciliation is not complete and reproducibility is not verified.**

- No SQL was invented or reconstructed from migration names.
- No missing historical migration was applied to production.
- No timestamp or filename was silently rewritten to imply equivalence.
- Existing migration files that are renamed, later, or structurally related to live migrations are not considered equivalent without authoritative source and byte-level review.

## Service-role boundary

MIZAN must not use `service_role` in browser code, `VITE_*` variables, client bundles, or ordinary end-user workflows. The reviewed Supabase client uses the publishable/anonymous client key configuration, not `service_role`.

The Supabase `service_role` database role is a platform-provided privileged role and is not treated as an application user role. It is retained only as an infrastructure capability where Supabase requires it; no new application dependency on it is being introduced. Removing or disabling the built-in role was not attempted because that could break platform-managed operations.

The latest default-privilege migration removes `anon` and `authenticated` from default table, sequence, and function privileges for objects created by the `postgres` owner in `public`. It does not change existing object grants and does not alter `supabase_admin` defaults. The live migration record was verified in Supabase.

## Security verification completed

- RLS inspection: RLS is enabled on the inspected public tables.
- `staff_onboarding_registry` and `user_login_identifiers` have no policies; observed table grants were limited to `postgres` and `service_role`, so no policy was added blindly.
- Application RPCs that are intended for authenticated clients retain their `EXECUTE` grants; their definitions were inspected for authentication, project-access, and permission checks.
- Direct `EXECUTE` access for `anon` and `authenticated` on `mizan_private` routines is absent.
- `mizan_private` has no `USAGE` or `CREATE` privilege for `anon`, `authenticated`, or `service_role`.
- Migration `restrict_internal_project_helper_execute_v1` was applied to Supabase, committed to GitHub, and verified in the live migration list.
- The default-privilege hardening migration was applied to Supabase, committed to GitHub, and verified in the live migration list.
- GitHub Actions application CI run 130 passed install, test, and build for the preceding security hardening commit.

## Remaining findings

- Existing direct grants to `service_role` remain because this is a privileged platform role; no blanket revocation was applied without proving that Supabase-managed operations and trusted server workflows would remain functional.
- Existing grants to `authenticated` on some tables remain subject to RLS and application compatibility review; default-privilege changes do not revoke existing grants.
- Supabase Auth leaked-password protection still requires a platform/dashboard-level verification or supported configuration path.
- Historical migration SQL recovery remains unresolved.
- `supabase_admin` default privileges were not modified because ownership and platform compatibility were not established.

## Required authoritative evidence

Recover the original migration SQL from a development environment, historical branch/repository, CI artifact, or another authoritative source. Then verify the recovered sequence on a disposable Supabase development branch before replaying or certifying production reproducibility.

## Current status

**BLOCKED — live inventory and recent security changes verified; exact historical SQL recovery and remaining platform-level security verification are still required.**
