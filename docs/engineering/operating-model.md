# MIZAN Engineering Operating Model

**Status:** Active working agreement  
**Branch:** `main`  
**System:** MIZAN water-utility platform

## Mission

Build and operate MIZAN as a production-grade, Arabic-first, multi-tenant platform with database-enforced isolation, auditable financial workflows, resilient field operations, and safe decision-support AI.

## Virtual multidisciplinary delivery team

This team model defines explicit responsibilities. It does not claim that separate human contractors are currently connected.

| Role | Accountability | Required gates |
|---|---|---|
| Product Owner | Business outcomes, scope, acceptance criteria, customer value | Acceptance criteria before release |
| Project Manager | Plan, risks, dependencies, change control, delivery reporting | RAID log and release checklist |
| Solution Architect | Domain boundaries, ADRs, integration contracts, non-functional requirements | Architecture review for cross-cutting changes |
| Database Engineer | PostgreSQL design, migrations, constraints, indexes, RLS, query plans | Migration provenance, rollback/forward plan, SQL verification |
| Application Engineers | Secure application flows, server/client separation, error handling, accessibility | Tests, type checks, build, review |
| Cybersecurity Engineer | Threat modeling, least privilege, secrets, auth, abuse cases, incident readiness | Security review and advisor scan |
| QA/Automation Engineer | Unit, integration, regression, negative and authorization tests | Green CI and evidence of critical-path coverage |
| Reliability/DevOps Engineer | CI/CD, observability, backups, recovery drills, release safety | Deployment and rollback evidence |
| Data/AI Engineer | Data quality, OCR/AI boundaries, evaluation, human review, privacy | No autonomous source-of-truth mutation |
| UX/Localization Specialist | Arabic RTL, usability, accessibility, field workflows | RTL and mobile acceptance checks |

## Non-negotiable engineering controls

1. Never fabricate historical migration SQL or silently equate timestamps.
2. Every database change must be represented by a reviewed migration and verified against the target project.
3. Tenant and project authorization must be enforced in the database and server-side paths; UI checks are not security controls.
4. `service_role` and secret keys must never reach browser bundles.
5. Security-definer functions require explicit justification, fixed search paths, qualified references, and least-privilege execution grants.
6. Financial and collection operations must be transactional and idempotent.
7. AI/OCR results are proposals or analytical context until a permitted human/system workflow validates them.
8. No release is called production-ready without passing CI, security review, backup/recovery evidence, and operational acceptance.
9. Avoid broad privilege grants and destructive index/schema changes without ownership, usage, and compatibility evidence.
10. All high-risk changes require an auditable decision record and a tested rollback or compensating plan.

## Delivery sequence

1. Establish and maintain migration/source-of-truth reconciliation.
2. Close high-impact security findings with compatibility-aware changes.
3. Strengthen automated authorization, idempotency, and negative-path tests.
4. Validate Auth, protected routes, session handling, and secret boundaries.
5. Improve observability, backup/recovery evidence, and release controls.
6. Expand domain features only after the above gates remain green.

## Definition of Done

- Code and migration are committed to `main` with an explanatory message.
- Automated tests and build pass in CI.
- Database change is verified directly in Supabase.
- Security and authorization impact is reviewed.
- Documentation states what is implemented, tested, verified, and still blocked.
- No unsupported claim of 100% correctness or production readiness is made; residual risk is recorded explicitly.
