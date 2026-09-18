# MIZAN AI — System Completion Checklist

## Release gates

- [ ] Application builds successfully from a clean install
- [ ] Unit tests pass in CI
- [ ] Positive authenticated E2E flows verified
- [ ] Tenant and project isolation verified with negative tests
- [ ] All exposed SECURITY DEFINER RPCs reviewed for EXECUTE privileges
- [ ] RLS-enabled tables have intentional policies or documented service-role-only access
- [ ] Leaked password protection enabled in Supabase Auth
- [ ] Online evidence upload and database insert are idempotent
- [ ] Offline evidence upload, recovery, and reading synchronization verified
- [ ] Reading identity and confidence acceptance verified
- [ ] Billing and collection lifecycle verified end-to-end
- [ ] Audit events verified for sensitive mutations
- [ ] Production readiness sign-off completed

## Known engineering risk

`mizanService.createReading` currently rejects any local evidence record while offline, even when that record may already have a `server_evidence_id`. The offline flow should permit a reading when the evidence is already synchronized, and should only require evidence synchronization when no server evidence identifier exists. Add a regression test before changing this behavior.

## Verification policy

A feature is only marked complete after implementation, automated testing, integration verification, and security verification are all evidenced. A code review or file presence alone is not sufficient.
