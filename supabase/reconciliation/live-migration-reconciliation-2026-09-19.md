# MIZAN Live Migration Reconciliation — 2026-09-19

Project: `ntzbamdbvkefgpnoudnf`

## Verified live state

Supabase `list_migrations` reports **49 applied migration records**, from `20260917202744` through `20260918200231`. The complete live version/name inventory is preserved in the reconciliation work log and was read directly from Supabase on 2026-09-19.

## Verified repository state

The GitHub default branch exposes **20 SQL migration files** under `supabase/migrations/`. The current repository filenames/timestamps do not map one-to-one to the 49 live migration records. Several live migrations have no exact corresponding SQL file in the current repository.

## Decision

**Reconciliation is not complete and reproducibility is not verified.**

- No SQL was invented or reconstructed from migration names.
- No missing migration was applied to production.
- No timestamp or filename was silently rewritten to imply equivalence.
- Existing migration files that are renamed, later, or structurally related to live migrations are not considered equivalent without authoritative source and byte-level review.

## Security verification completed

- RLS inspection: RLS is enabled on inspected public tables.
- `staff_onboarding_registry` and `user_login_identifiers` have no policies; observed table grants were limited to `postgres` and `service_role`, so no policy was added blindly.
- Inspected application RPCs grant `EXECUTE` to `authenticated`, but their bodies include internal authentication, project-access, and permission checks; no blanket revoke was performed without compatibility testing.
- GitHub Actions application CI run 128 passed install, test, and build.

## Required authoritative evidence

Recover the original migration SQL from a development environment, historical branch/repository, CI artifact, or another authoritative source. Then verify the recovered sequence on a disposable Supabase development branch before replaying or certifying production reproducibility.

## Current status

**BLOCKED — inventory verified; exact historical SQL recovery still required.**
