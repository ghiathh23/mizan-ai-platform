# MIZAN Live Migration Reconciliation — 2026-09-19

Project: `ntzbamdbvkefgpnoudnf`

## Verified live state

Supabase `list_migrations` reports **50 applied migration records**, including the security hardening migration `20260919144624 restrict_internal_project_helper_execute_v1`. The complete live version/name inventory was read directly from Supabase during the reconciliation work.

## Verified repository state

The GitHub default branch exposes a migration directory whose SQL files do not map one-to-one to the 50 live migration records. Several live migrations have no exact corresponding SQL file in the current repository. The newly added security hardening file is present on `main` and corresponds to the applied security change.

## Decision

**Reconciliation is not complete and reproducibility is not verified.**

- No SQL was invented or reconstructed from migration names.
- No missing historical migration was applied to production.
- No timestamp or filename was silently rewritten to imply equivalence.
- Existing migration files that are renamed, later, or structurally related to live migrations are not considered equivalent without authoritative source and byte-level review.

## Security verification completed

- RLS inspection: RLS is enabled on the inspected public tables.
- `staff_onboarding_registry` and `user_login_identifiers` have no policies; observed table grants were limited to `postgres` and `service_role`, so no policy was added blindly.
- Application RPCs that are intended for authenticated clients retain their `EXECUTE` grants; their definitions were inspected for authentication, project-access, and permission checks.
- Direct `EXECUTE` access for `anon` and `authenticated` on `mizan_private` routines is absent.
- `mizan_private` has no `USAGE` or `CREATE` privilege for `anon`, `authenticated`, or `service_role`.
- Migration `restrict_internal_project_helper_execute_v1` was applied to Supabase, committed to GitHub, and verified in the live migration list.
- GitHub Actions application CI run 130 passed install, test, and build.

## Additional audit observation

Default privileges for selected owners in the `public` schema include broad grants for `anon`, `authenticated`, and `service_role`. This was recorded for a separate compatibility-aware review; no blanket default-privilege change was applied without validating object ownership and application requirements.

## Required authoritative evidence

Recover the original migration SQL from a development environment, historical branch/repository, CI artifact, or another authoritative source. Then verify the recovered sequence on a disposable Supabase development branch before replaying or certifying production reproducibility.

## Current status

**BLOCKED — live inventory and recent security change verified; exact historical SQL recovery still required.**
