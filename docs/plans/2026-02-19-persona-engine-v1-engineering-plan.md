# Persona Engine v1 - Engineering Plan

## Objective

Deliver a production-ready v1 of Persona Engine for internal creators with reliable async media generation, identity consistency tooling, and a scalable SaaS-ready architecture.

## Scope

### In Scope (v1)
- Authentication (OAuth + JWT)
- RBAC for Admin/Creator
- Workspace creation and membership basics
- Infinite canvas with node graph editing
- Influencer Identity Vault
- Async workflow execution through queue workers
- Credit reservation/capture lifecycle
- Firestore real-time result updates
- Asset persistence and CDN delivery
- Core observability, rate limits, and security controls

### Out of Scope (v1)
- Public marketplace/community sharing
- Advanced collaboration permissions beyond basic workspace roles
- Multi-provider model routing optimization
- Fine-grained billing invoicing and tax automation

## Delivery Milestones

### Milestone 0: Foundations (Week 1)
Exit criteria:
- Monorepo initialized with `apps/web`, `apps/api`, shared packages
- CI pipeline running lint/test/build
- Environment config validation in backend
- Baseline infra manifests and Cloud Run deploy path validated

### Milestone 1: Identity and Access (Week 2)
Exit criteria:
- OAuth login and JWT session flow complete
- User model persisted in PostgreSQL
- Role guards enforced on protected API routes
- Workspace and membership CRUD in place

### Milestone 2: Canvas and Realtime State (Weeks 3-4)
Exit criteria:
- React Flow canvas supports add/move/connect nodes
- Node state syncs to Firestore per workspace
- Reconnect and conflict-safe updates for active sessions
- Basic node type compatibility checks in UI

### Milestone 3: Workflow Orchestration (Weeks 5-6)
Exit criteria:
- `POST /workflows/execute` with idempotency key support
- BullMQ producer and worker pipeline functional
- Provider adapter integration with success and failure handling
- Firestore node updates from worker completion events

### Milestone 4: Credits, Billing Controls, and Reliability (Week 7)
Exit criteria:
- Credit reserve/capture/release transactions implemented
- Insufficient credit and rate-limit paths enforced
- Retry/backoff and DLQ policies active
- Audit log for billing-impacting actions

### Milestone 5: Hardening and Launch Readiness (Week 8)
Exit criteria:
- Observability dashboards and alert rules live
- Load test and queue soak test pass targets
- Security checklist complete (CORS/CSP/secrets/validation)
- Runbooks and operational docs approved

## Workstreams and Ticket Backlog

### A. Platform and Infrastructure
- A1: Initialize monorepo and package boundaries
- A2: Configure GitHub Actions workflow (lint/test/build/deploy)
- A3: Provision Cloud Run services (api, worker)
- A4: Provision Redis, PostgreSQL, Firestore, Secret Manager
- A5: Add structured logging and trace propagation

### B. Backend API (NestJS)
- B1: Auth module (OAuth callback, JWT issuance/refresh)
- B2: RBAC guard and workspace access guard
- B3: Workspaces module (CRUD + membership)
- B4: Influencer module (vault CRUD + validation)
- B5: Workflows module (execute endpoint + job status endpoint)
- B6: Queue module (BullMQ producer/consumer)
- B7: Integrations module (Kie.ai provider adapter)
- B8: Billing module (credit ledger and settlement transitions)

### C. Frontend (Next.js)
- C1: Auth pages and session bootstrap
- C2: Workspace selector and routing
- C3: Canvas shell and React Flow setup
- C4: Node library (prompt, image-gen, video-gen, output)
- C5: Connection validation and UX feedback states
- C6: Influencer Identity Vault UI
- C7: Firestore sync hooks and optimistic updates
- C8: Job status UI (processing, success, failed states)

### D. Data and Contracts
- D1: Prisma schema and migrations for core entities
- D2: Firestore document shape and versioning strategy
- D3: Shared DTO/type package for client/server contract parity
- D4: Idempotency persistence design and conflict handling

### E. Quality, Security, and Operations
- E1: Unit tests (services/guards/validators)
- E2: API integration tests (happy path + failure paths)
- E3: End-to-end smoke tests (auth -> generate -> resolve)
- E4: Rate-limit and abuse-case tests
- E5: SLO dashboard + paging alerts
- E6: DLQ replay runbook and provider outage runbook

## Sequencing and Dependencies

1. A1/A2/A4 must complete before major feature delivery.
2. B1/B2 precede all protected feature modules.
3. C3 depends on Firestore setup from A4 and schema from D2.
4. B5/B6/B7 depend on D3 contract stability.
5. B8 must be complete before launch readiness sign-off.
6. E2/E3 run continuously; E5/E6 required before go-live.

## Success Metrics

- `POST /workflows/execute` p95 latency <= 500 ms
- Queue-to-worker pickup p95 <= 2 s under expected load
- Firestore result propagation <= 5 s after worker completion
- Job completion success rate >= 99.0% (excluding provider-wide incidents)
- Credit ledger mismatch rate = 0

## Risks and Mitigations

- Provider instability -> circuit breaker + retry + DLQ + degraded mode banner
- Duplicate billing on retries -> strict idempotency keys + transactional credit ledger
- Firestore cost growth -> scoped listeners + TTL/archive strategy for old node states
- Queue backlog spikes -> autoscaling worker on queue depth + priority queues
- Cross-tenant leakage -> mandatory workspace guard + integration tests for access boundaries

## Team Model (Suggested)

- 1 Tech Lead (architecture + integration)
- 1 Backend Engineer (queue/billing/workflows)
- 1 Frontend Engineer (canvas/vault/realtime UX)
- 1 Full-stack Engineer (contracts + shared packages + QA support)

## Definition of Done

- Feature implemented with tests and monitoring hooks.
- Security and validation requirements applied.
- API/client contracts documented and versioned.
- Runbook or support note added for operationally significant behavior.
- Accepted by product/tech lead against milestone exit criteria.

## Immediate Next Actions

1. Lock v1 scope and open decisions from the technical specification.
2. Convert backlog items into issue tracker tickets with owners and estimates.
3. Start Milestone 0 and Milestone 1 in parallel where dependencies allow.
