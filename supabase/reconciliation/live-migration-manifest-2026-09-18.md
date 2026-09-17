# Live Migration Reconciliation Manifest

Date: 2026-09-18
Project: `ntzbamdbvkefgpnoudnf`

## Purpose

This file records the migration versions observed in the live Supabase project and compares them with the migration files currently present in this repository. It is **not** a replacement for missing original SQL.

## Live migration inventory

1. `20260917202744_create_mizan_security_tenancy_foundation`
2. `20260917202808_add_mizan_foundation_foreign_key_indexes`
3. `20260917203637_harden_mizan_foundation_grants_and_evidence_storage`
4. `20260917204137_create_meter_billing_vertical_slice_foundation`
5. `20260917204148_secure_meter_billing_vertical_slice_rls`
6. `20260917204928_implement_meter_billing_domain_functions_v1`
7. `20260917204937_harden_meter_reading_validation_and_invoice_logic`
8. `20260917205313_harden_invoice_idempotency_and_lineage_v1`
9. `20260917205407_harden_tariff_integrity_and_charge_validation_v1`

## Repository inventory at reconciliation time

The repository contains only these migration files:

- `20260917203000_harden_mizan_foundation_grants_and_evidence_storage.sql`
- `20260917203100_implement_meter_billing_domain_functions_v1.sql`

These filenames do not match the live migration versions exactly. Their contents are documentation/reconstruction records and must not be treated as byte-for-byte originals.

## Provenance and gaps

- The connected Supabase migration listing provides migration versions and names, but not the original SQL bodies.
- The original SQL for the seven other live migrations was not recovered through the available connected interfaces during this reconciliation attempt.
- The two existing repository files explicitly identify themselves as reconstructed or dependent on the live execution record.
- No missing migration file is fabricated in this reconciliation commit.

## Rebuild status

**Not verified / blocked.** The repository is not yet a proven reproducible source for the live database because the original SQL for all nine applied migrations is not present and cannot be reconstructed faithfully from the migration version list alone.

## Required next evidence

To complete reconciliation, obtain the original migration directory from the development environment, a prior repository/branch, a CI artifact, or another authoritative source containing the exact SQL. Then verify the migrations on a disposable Supabase development branch before claiming reproducibility.
