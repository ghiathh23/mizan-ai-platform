# MIZAN Architecture Baseline v1.0

**Status:** Proposed architecture baseline — not yet production-ready
**Date:** 2026-09-17
**Repository:** `ghiathh23/mizan-ai-platform`

## 1. System architecture

Start with a modular monolith and asynchronous workers rather than premature microservices.

- Web/PWA client: Arabic-first, RTL, responsive, installable, offline-capable field workflows.
- Application/API layer: authenticated request handling, authorization, domain services, validation, idempotency.
- PostgreSQL: transactional source of truth, tenant/project scoping, RLS, constraints, migrations.
- Object storage: private evidence/document buckets with signed, authorized access.
- Background jobs: OCR processing, notifications, payment reconciliation, analytics refresh, synchronization support.
- AI gateway: authorized retrieval, structured tools, prompt-injection defenses, usage limits, auditability.
- Observability: structured logs, correlation IDs, metrics, error tracking, job monitoring.

## 2. Domain boundaries

Core bounded contexts:

1. Identity and access
2. Platform tenancy and subscriptions
3. Water projects and baseline/service access
4. Subscribers and meters
5. Field evidence and readings
6. Consumption and billing
7. Payments and financial ledger
8. Production/wells and NRW
9. Assets and maintenance
10. Complaints/accountability
11. Reporting, KPIs, data quality and alerts
12. AI and integrations

The transactional domains remain authoritative; analytics and AI consume authorized, traceable data.

## 3. Tenant hierarchy

Platform → Main Tenant/Central Organization → Project/Sub-Tenant → scoped resources.

Every project-owned record must carry a project/tenant scope either directly or through a constrained relationship. Central supervision uses explicit authorized scope, never unrestricted global access.

## 4. Role model

Initial roles:

- Platform administrator: platform lifecycle/configuration only; no implicit operational data access.
- Central manager: authorized portfolio/project oversight.
- Project manager: project configuration and operational supervision.
- Collector: authorized payment and receivable workflows.
- Meter reader: assigned subscriber meter readings and evidence.
- Well operator: assigned production readings and evidence.

Roles map to permissions and scopes. Permissions should be extensible and not hardcoded only in UI code.

## 5. Permission model

Permission tuple: subject identity + role assignment + tenant scope + project scope + resource + action.

Actions include read, create, update, submit, verify, approve, export, configure, manage users, manage tariffs, manage payments, manage assets, access AI, and sensitive actions. Server-side authorization is required for every sensitive operation.

## 6. Proposed data model

Principal entities:

- organizations/tenants, tenant_relationships, projects
- users, role_definitions, permissions, scoped_role_assignments
- subscriptions, subscription_events, lifecycle_events
- service_areas, villages, baseline_snapshots, population_records
- subscribers, service_connections, meters, meter_types, meter_assignments
- evidence_files, field_readings, reading_extractions, reading_reviews
- consumption_records, tariff_versions, tariff_tiers, invoices, invoice_lines
- receivables, payments, payment_allocations, ledger_entries
- water_sources, wells, production_readings
- assets, maintenance_work_orders, maintenance_events, inventory records
- complaints, notifications, integration_events
- kpi_definitions, kpi_observations, data_quality_observations, alerts
- audit_events, sync_operations, device_registrations

Use UUIDs where appropriate, UTC timestamps, foreign keys, check constraints, unique constraints, and explicit status fields. Historical financial and tariff records are immutable or versioned.

## 7. Security and RLS strategy

- Authentication is handled by a trusted identity provider.
- Authorization is evaluated server-side and duplicated defensively in database policies.
- RLS policies derive scope from trusted server-side identity/session claims or secure database functions, never from arbitrary client tenant IDs.
- Negative tests must prove cross-project and cross-tenant access is denied.
- Platform administrators do not receive an automatic operational-data bypass.
- Private files are accessed through authorized signed URLs or server-mediated access.
- All sensitive mutations produce audit events with actor, scope, entity, action, before/after where appropriate, timestamp, request/correlation ID, and device/session context.

## 8. Offline architecture

Field devices receive only assigned/reference data necessary for their workflows. Local operations use unique operation IDs and idempotency keys. Sync states: PENDING, SYNCING, SYNCED, FAILED, CONFLICT.

The server is authoritative for official readings and transactions. Sync requests are revalidated server-side. Local data lifecycle, logout behavior, device compromise, encryption, and minimization must be addressed before production release.

## 9. Meter recognition architecture

Pipeline: evidence capture → quality assessment → meter/display detection → meter type recognition → extraction → confidence → metadata/range/previous-reading validation → anomaly detection → human review → official reading.

Raw image, raw extraction, confidence, human correction, validation status, and official value are stored separately. Manual entry remains available whenever recognition fails. No universal accuracy claim is made without representative testing.

## 10. Consumption and billing architecture

Consumption is calculated by deterministic domain logic using validated readings. Rules must support rollover, replacement/reset, estimates, missing history, anomalies, and unit configuration.

Billing uses versioned effective-dated tariffs. An invoice records the tariff version, reading inputs, calculation results, adjustments, arrears, and status. Issued financial records are immutable or corrected through versioned/append-only mechanisms.

## 11. Tariff architecture

Tariff versions are scoped to project/service type and include effective dates, fixed fees, tiers, thresholds, prices, and configuration. Future calculations select the applicable version by effective date; historical invoices retain the version used at calculation time. Simulation is separate from posting.

## 12. Payment architecture

Manual, wallet, and bank integrations use a provider abstraction. Electronic payment processing requires verified webhooks, signature verification where supported, idempotency, duplicate prevention, reconciliation, provider references, internal references, and audit events. Provider failures cannot roll back an already committed core billing transaction.

## 13. AI architecture

User → authentication → authorization → authorized retrieval → structured context → model → guardrails → response/audit.

AI never decides authorization. Deterministic services calculate billing, financial totals, KPIs, NRW, subscription state, and permissions. AI explains or analyzes verified results and must label uncertainty, estimates, and recommendations. Project and central AI contexts are strictly scoped.

Controls include prompt-injection resistance, tool allowlists, data minimization, token/cost limits, output validation, sensitive-action confirmation, and evaluation in Arabic and English where applicable.

## 14. Integration architecture

External providers are isolated behind adapters and asynchronous jobs where appropriate: WhatsApp, payments, GIS, reporting systems, and AI. Each integration has timeouts, retries, dead-letter/failure states, idempotency, rate limits, delivery/reconciliation status, and monitoring.

## 15. Audit architecture

Audit events are append-oriented and protected from ordinary user modification. Capture actor, tenant/project scope, timestamp, action, entity/type/ID, old/new values where safe, source, device/session, request ID, and outcome. Sensitive data should be minimized in logs and audit payloads.

## 16. Observability

Use structured logs without secrets, request and correlation IDs, error tracking, latency/error metrics, background-job monitoring, sync monitoring, AI usage and failure monitoring, integration monitoring, and health/readiness checks.

## 17. Backup and recovery

Define backup retention, encryption, restoration ownership, RPO/RTO targets, incident procedures, and disaster scenarios. Production recovery readiness is not claimed until restoration is executed and documented.

## 18. Testing strategy

- Unit: tariff, consumption, billing, permissions, validation, NRW.
- Integration: database, authentication, RLS, billing, payment webhooks, sync, notifications.
- E2E: reading-to-bill, payment, offline sync, project management, central supervision, AI retrieval.
- Security: cross-tenant denial, privilege escalation, malicious files, API abuse, prompt injection, secret leakage.
- Offline: no network, intermittent network, reconnect, duplicates, conflicts, session expiry, restart, partial sync.
- Performance: realistic project, meter, reading, invoice, job, and AI workloads.
- Accessibility and Arabic RTL: keyboard navigation, contrast, readable forms, validation, PDF/report layout.

## 19. Technology decisions

Provisional decisions pending environment validation:

- PostgreSQL/Supabase-compatible relational backend.
- TypeScript-based web application and API where supported.
- PWA/offline-capable client for field roles.
- Modular monolith with background jobs.
- Private object storage.
- Server-side AI gateway.
- CI with linting, type checks, unit/integration/security checks as infrastructure becomes available.

These are proposals, not verified provisioned services.

## 20. Assumptions

- Initial release targets a limited pilot before broad rollout.
- Arabic RTL is the default, with i18n designed for English and additional languages.
- Network connectivity may be intermittent in field locations.
- Water and financial definitions require project-level configuration and documented methodology.
- Payment and WhatsApp providers will vary by deployment context.

## 21. Risks

- Incorrect or incomplete field evidence can distort billing and NRW.
- Offline conflicts and compromised devices can expose or duplicate data.
- Misconfigured RLS can cause cross-tenant exposure.
- Provider outages can delay notifications or payment reconciliation.
- OCR quality may vary by meter type, image quality, lighting, and language.
- Incomplete baseline or production data can create misleading KPIs.
- Arabic financial/PDF rendering requires dedicated validation.

## 22. Architecture Decision Records

### ADR-001: Modular monolith first

**Decision:** Start with a modular monolith and asynchronous workers.

**Reason:** Reduces operational complexity while preserving domain boundaries and future extraction options.

### ADR-002: Database as transactional source of truth

**Decision:** PostgreSQL transactions are authoritative for official operational and financial records.

**Reason:** Provides integrity, constraints, traceability, and deterministic calculations.

### ADR-003: Authorization before AI retrieval

**Decision:** Retrieve only data authorized by the application/security layer before model invocation.

**Reason:** An LLM must not be an authorization boundary.

### ADR-004: Human confirmation for OCR readings

**Decision:** OCR/vision output is a proposal and must preserve raw output and review history.

**Reason:** Recognition uncertainty can directly affect billing and operational decisions.

### ADR-005: Asynchronous external integrations

**Decision:** Notifications and provider-dependent tasks execute asynchronously and cannot block core transactions unnecessarily.

**Reason:** Improves resilience and failure isolation.

## 23. Readiness status

- Designed: Initial baseline documented.
- Implemented: Repository README and this baseline document only.
- Tested: No application tests executed yet.
- Verified: Environment discovery verified the GitHub repository and write access; backend/deployment/integration capabilities remain unverified.
- Production Ready: No.

## 24. Next engineering gate

Validate Supabase/backend, deployment, AI, and storage capabilities; then refine this baseline into an implementation-ready schema and security design before building the first vertical slice: authenticated project-scoped meter reading with evidence, validation, audit, and offline queue foundations.
