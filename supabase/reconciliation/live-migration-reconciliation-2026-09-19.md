# MIZAN Live Migration Reconciliation — 2026-09-19

Project: `ntzbamdbvkefgpnoudnf`

## Verified live state

Supabase `list_migrations` reports **51 applied migration records**, including:

- `20260919144624 restrict_internal_project_helper_execute_v1`
- `20260919162925 harden_postgres_default_privileges_v1`
- `20260919190443 revoke_authenticated_truncate_privileges_v1`
- `20260919190925` direct authenticated domain-write restriction
- `20260919191613_harden_meter_reading_input_consistency_v1`

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
- Explicit deny policies were added to `staff_onboarding_registry` and `user_login_identifiers`; the previous `rls_enabled_no_policy` advisor finding no longer appears.
- Application RPCs that are intended for authenticated clients retain their `EXECUTE` grants; their definitions were inspected for authentication, project-access, and permission checks.
- Direct `EXECUTE` access for `anon` and `authenticated` on `mizan_private` routines is absent.
- `mizan_private` has no `USAGE` or `CREATE` privilege for `anon`, `authenticated`, or `service_role`.
- Migration `restrict_internal_project_helper_execute_v1` was applied to Supabase, committed to GitHub, and verified in the live migration list.
- The default-privilege hardening migration was applied to Supabase, committed to GitHub, and verified in the live migration list.
- Authenticated `TRUNCATE` privileges were revoked from the inspected domain tables and verified absent.
- Authenticated direct mutation privileges were revoked from the inspected domain tables, while evidence `INSERT` remains intentionally available pending a complete upload-path review.
- GitHub Actions Application CI run **147** passed for commit `53d222054022caaea13e97477c2d5f42e8aea987`, including install, security scan, tests, and build.
- The live `mizan_sync_meter_reading` function validates project/meter/evidence consistency, requires authentication and permission, and uses `p_operation_id` for idempotent replay handling.
- A unique index, `public.meter_readings_operation_id_key`, was verified on `meter_readings(operation_id)`; the function also handles concurrent unique violations by resolving the existing reading.

## Remaining findings

- Existing direct grants to `service_role` remain because this is a privileged platform role; no blanket revocation was applied without proving that Supabase-managed operations and trusted server workflows would remain functional.
- Existing grants to `authenticated` on some tables remain subject to RLS and application compatibility review; default-privilege changes do not revoke existing grants.
- Direct authenticated `INSERT` on `meter_evidence` remains and is protected by the current project-access policy; moving it behind a validated RPC requires further application and database contract review.
- Supabase Auth leaked-password protection still requires a platform/dashboard-level verification or supported configuration path.
- Historical migration SQL recovery remains unresolved.
- `supabase_admin` default privileges were not modified because ownership and platform compatibility were not established.
- Cross-tab offline-sync coordination is not yet guaranteed; the current in-memory guard prevents overlap within one browser tab only.

## Required authoritative evidence

Recover the original migration SQL from a development environment, historical branch/repository, CI artifact, or another authoritative source. Then verify the recovered sequence on a disposable Supabase development branch before replaying or certifying production reproducibility.

## Current status

**BLOCKED — live inventory, recent security changes, offline CI, and reading idempotency controls are verified; exact historical SQL recovery, platform-level Auth verification, evidence-write review, and cross-tab synchronization hardening remain required.**
