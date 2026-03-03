# Vanta Lab v1 - MVP Only (P0) Backlog

This backlog includes launch-critical tickets only.

## Sprint 1 (Foundations, Auth, Data)

- TKT-PLAT-001 - Initialize monorepo and workspace tooling (3 SP)
- TKT-PLAT-002 - Configure CI pipeline for lint/test/build (3 SP)
- TKT-PLAT-003 - Provision cloud dependencies and secrets baseline (5 SP)
- TKT-AUTH-001 - Implement OAuth callback and JWT issuance (5 SP)
- TKT-AUTH-002 - Add JWT auth guard and RBAC role guard (5 SP)
- TKT-WS-001 - Workspace and membership CRUD APIs (6 SP)
- TKT-DATA-001 - Create Prisma schema for core entities (5 SP)
- TKT-DATA-002 - Define Firestore document model for canvas state (3 SP)
- TKT-DATA-003 - Publish shared DTO/type package (3 SP)

Sprint 1 total: 38 SP

## Sprint 2 (Canvas and Identity)

- TKT-WEB-001 - Build canvas shell and route binding (5 SP)
- TKT-WEB-002 - Implement base node palette and drag/drop create (5 SP)
- TKT-WEB-003 - Implement typed edge validation rules (3 SP)
- TKT-WEB-004 - Add Firestore sync hook with optimistic updates (5 SP)
- TKT-INF-001 - Build Influencer API module with validation (5 SP)
- TKT-INF-002 - Build Influencer Vault UI and node binding (5 SP)

Sprint 2 total: 28 SP

## Sprint 3 (Workflow Execution)

- TKT-WF-001 - Implement execute endpoint with idempotency key support (5 SP)
- TKT-WF-002 - Build BullMQ producer and worker skeleton (5 SP)
- TKT-WF-003 - Implement provider adapter (Kie.ai) (8 SP)
- TKT-WF-004 - Persist media assets and update Firestore node outputs (3 SP)
- TKT-WF-005 - Add job status endpoint and frontend status polling fallback (3 SP)
- TKT-WEB-006 - Add node execution UX states (5 SP)

Sprint 3 total: 29 SP

## Sprint 4 (Billing, Ops, and Launch Gate)

- TKT-BILL-001 - Implement credit reservation at enqueue (5 SP)
- TKT-BILL-002 - Implement capture/release settlement transitions (5 SP)
- TKT-BILL-003 - Add billing audit log and reconciliation script (3 SP)
- TKT-OPS-001 - Add structured logging and distributed tracing (5 SP)
- TKT-OPS-002 - Implement retries, exponential backoff, and DLQ (5 SP)
- TKT-OPS-003 - Enforce rate limiting, CSP, and CORS policies (5 SP)
- TKT-OPS-004 - Execute performance and queue soak tests (3 SP)
- TKT-QA-001 - Backend unit test suite for critical modules (8 SP)
- TKT-QA-002 - API integration test suite for execute lifecycle (8 SP)
- TKT-QA-003 - E2E smoke test for login -> canvas -> execute -> resolve (5 SP)

Sprint 4 total: 52 SP

## MVP Critical Path

1. Platform and data base: TKT-PLAT-001/002/003, TKT-DATA-001/003
2. Access control: TKT-AUTH-001/002, TKT-WS-001
3. Core product loop: TKT-WEB-001/002/004, TKT-WF-001/002/003/004, TKT-WEB-006
4. Billing safety: TKT-BILL-001/002
5. Launch hardening: TKT-OPS-001/002/003/004, TKT-QA-001/002/003

## Launch Checklist (P0 Only)

- Auth, RBAC, workspace isolation validated
- Canvas graph persists and restores per workspace
- Execute endpoint idempotent and queue-driven
- Job outcomes reflected in canvas in real time
- Credits never double-charge under retries
- DLQ and run-ready observability in place
- API, integration, and E2E smoke suites passing in CI
