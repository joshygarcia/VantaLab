# Vanta Lab v1 - Sprint-Ready Ticket Backlog

## Sprint Plan

- Sprint 1: Platform foundations, auth baseline, data contracts
- Sprint 2: Canvas and realtime state sync
- Sprint 3: Workflow orchestration and provider integration
- Sprint 4: Billing reliability, hardening, launch readiness

## Priority Legend

- P0: Required for launch
- P1: High value, should complete in v1
- P2: Nice to have if sprint capacity remains

## Ticket Format

- ID: Stable ticket identifier
- Type: Epic | Story | Task
- Estimate: Story points (SP)
- Depends On: Ticket IDs that must complete first

---

## Sprint 1

### EPIC-PLAT-01 (P0)
- Type: Epic
- Title: Platform and deployment foundations
- Estimate: 13 SP
- Depends On: None
- Description: Establish monorepo structure, CI/CD, and cloud deployment baseline for API and worker services.
- Acceptance Criteria:
  - Monorepo has `apps/web`, `apps/api`, `packages/*` and consistent lint/test/build scripts.
  - CI runs on PR and main push.
  - Cloud Run deployment path validated for both API and worker.

### TKT-PLAT-001 (P0)
- Type: Task
- Title: Initialize monorepo and workspace tooling
- Estimate: 3 SP
- Depends On: None
- Description: Bootstrap Turborepo package graph and shared TypeScript config.
- Acceptance Criteria:
  - Local install/build succeeds from repo root.
  - Shared TS paths resolve in web and api.

### TKT-PLAT-002 (P0)
- Type: Task
- Title: Configure CI pipeline for lint, test, build
- Estimate: 3 SP
- Depends On: TKT-PLAT-001
- Description: Add GitHub Actions workflow with caching and status checks.
- Acceptance Criteria:
  - Pipeline runs on pull requests.
  - Failing checks block merge.

### TKT-PLAT-003 (P0)
- Type: Task
- Title: Provision cloud dependencies and secrets baseline
- Estimate: 5 SP
- Depends On: TKT-PLAT-001
- Description: Provision PostgreSQL, Redis, Firestore, GCS bucket, Secret Manager entries.
- Acceptance Criteria:
  - Services reachable from Cloud Run service account.
  - Secrets are not stored in repo or plaintext env files.

### EPIC-AUTH-01 (P0)
- Type: Epic
- Title: Authentication and access control baseline
- Estimate: 16 SP
- Depends On: TKT-PLAT-003
- Description: Implement OAuth login, JWT sessions, and RBAC enforcement.
- Acceptance Criteria:
  - Users can sign in with Google/GitHub.
  - JWT issued and validated on protected endpoints.
  - Role and workspace guards prevent unauthorized access.

### TKT-AUTH-001 (P0)
- Type: Story
- Title: Implement OAuth callback and JWT issuance
- Estimate: 5 SP
- Depends On: TKT-PLAT-003
- Description: Build provider login callback handling and session token issuing.
- Acceptance Criteria:
  - Successful OAuth login creates/updates user record.
  - API returns valid JWT and refresh strategy per config.

### TKT-AUTH-002 (P0)
- Type: Story
- Title: Add JWT auth guard and RBAC role guard
- Estimate: 5 SP
- Depends On: TKT-AUTH-001
- Description: Add NestJS guards for token auth and role restrictions.
- Acceptance Criteria:
  - Protected routes reject invalid/expired JWT.
  - Admin/Creator checks enforced at controller level.

### TKT-WS-001 (P0)
- Type: Story
- Title: Workspace and membership CRUD APIs
- Estimate: 6 SP
- Depends On: TKT-AUTH-002
- Description: Create workspace entities and membership controls with owner/admin roles.
- Acceptance Criteria:
  - Create/list/update workspace endpoints functional.
  - Workspace access guard blocks cross-tenant requests.

### EPIC-DATA-01 (P0)
- Type: Epic
- Title: Core data schema and shared contracts
- Estimate: 11 SP
- Depends On: TKT-PLAT-001
- Description: Define canonical database schema and shared DTO/type package.
- Acceptance Criteria:
  - Prisma migrations run in all environments.
  - Client/server share versioned DTO contracts.

### TKT-DATA-001 (P0)
- Type: Story
- Title: Create Prisma schema for core entities
- Estimate: 5 SP
- Depends On: TKT-PLAT-003
- Description: Implement User, Workspace, Membership, Influencer, WorkflowJob, MediaAsset, CreditTransaction.
- Acceptance Criteria:
  - Migration applies cleanly on empty DB.
  - Required indexes present for user/workspace queries.

### TKT-DATA-002 (P0)
- Type: Story
- Title: Define Firestore document model for canvas state
- Estimate: 3 SP
- Depends On: TKT-WS-001
- Description: Document and implement typed schema for workspace canvas documents and node execution status.
- Acceptance Criteria:
  - Firestore shape versioned with `schemaVersion`.
  - Node status fields support queued/processing/succeeded/failed.

### TKT-DATA-003 (P0)
- Type: Task
- Title: Publish shared DTO/type package
- Estimate: 3 SP
- Depends On: TKT-DATA-001
- Description: Add shared package for API request/response contracts.
- Acceptance Criteria:
  - Web and API compile against shared contracts.
  - Breaking changes require package version bump.

---

## Sprint 2

### EPIC-CANVAS-01 (P0)
- Type: Epic
- Title: Infinite canvas and realtime synchronization
- Estimate: 21 SP
- Depends On: TKT-DATA-002
- Description: Build core canvas UI, node editing, connection validation, and Firestore sync.
- Acceptance Criteria:
  - Users can create, move, and connect nodes.
  - Node graph state persists and restores per workspace.
  - Realtime updates visible across active sessions.

### TKT-WEB-001 (P0)
- Type: Story
- Title: Build canvas shell and route binding
- Estimate: 5 SP
- Depends On: TKT-WS-001
- Description: Add `canvas/[id]` workspace route with authenticated shell.
- Acceptance Criteria:
  - Workspace route loads canvas for authorized members only.
  - Unauthorized users are redirected or shown access denied.

### TKT-WEB-002 (P0)
- Type: Story
- Title: Implement base node palette and drag/drop create
- Estimate: 5 SP
- Depends On: TKT-WEB-001
- Description: Add initial node types (prompt, image generation, video generation, output).
- Acceptance Criteria:
  - Nodes can be added from palette.
  - Node metadata and type are persisted.

### TKT-WEB-003 (P0)
- Type: Story
- Title: Implement typed edge validation rules
- Estimate: 3 SP
- Depends On: TKT-WEB-002
- Description: Restrict incompatible source/target connections with clear UX errors.
- Acceptance Criteria:
  - Invalid edges cannot be created.
  - User sees actionable reason when connection fails.

### TKT-WEB-004 (P0)
- Type: Story
- Title: Add Firestore sync hook with optimistic updates
- Estimate: 5 SP
- Depends On: TKT-DATA-002
- Description: Sync node graph state with low-latency local updates and conflict-safe merges.
- Acceptance Criteria:
  - Local interaction feels immediate.
  - Firestore updates reconcile correctly after reconnect.

### TKT-WEB-005 (P1)
- Type: Task
- Title: Add collaborative presence indicators
- Estimate: 3 SP
- Depends On: TKT-WEB-004
- Description: Show active collaborators within workspace canvas.
- Acceptance Criteria:
  - Presence updates in near real time.
  - Presence data expires on disconnect timeout.

### EPIC-INF-01 (P0)
- Type: Epic
- Title: Influencer Identity Vault
- Estimate: 13 SP
- Depends On: TKT-DATA-001
- Description: Build vault CRUD and UI integration with canvas nodes.
- Acceptance Criteria:
  - Users can create, edit, delete influencer identities.
  - Identity includes seed images, negative prompt, and palette hex values.
  - Identity selectable from generation node forms.

### TKT-INF-001 (P0)
- Type: Story
- Title: Build Influencer API module with validation
- Estimate: 5 SP
- Depends On: TKT-AUTH-002
- Description: Add backend endpoints for identity vault with ownership checks.
- Acceptance Criteria:
  - CRUD endpoints enforce workspace/user access.
  - Palette max and seed image constraints validated.

### TKT-INF-002 (P0)
- Type: Story
- Title: Build Influencer Vault UI and node binding
- Estimate: 5 SP
- Depends On: TKT-INF-001
- Description: Create UI for managing identities and attaching them to generation nodes.
- Acceptance Criteria:
  - Vault list and editor work end-to-end.
  - Selected identity data is referenced in node execution request.

### TKT-INF-003 (P1)
- Type: Task
- Title: Add asset upload pipeline for seed images
- Estimate: 3 SP
- Depends On: TKT-INF-001
- Description: Upload seed images to cloud storage and persist URLs.
- Acceptance Criteria:
  - Upload supports file type and size checks.
  - Stored URLs are accessible in vault and execution payloads.

---

## Sprint 3

### EPIC-WORKFLOW-01 (P0)
- Type: Epic
- Title: Async workflow execution and provider orchestration
- Estimate: 24 SP
- Depends On: TKT-DATA-003, TKT-WEB-004
- Description: Implement execute endpoint, queue, worker, and provider integration.
- Acceptance Criteria:
  - Execute endpoint returns `202` with `jobId`.
  - Worker processes queue and writes completion state.
  - Client reflects processing and final status in canvas.

### TKT-WF-001 (P0)
- Type: Story
- Title: Implement execute endpoint with idempotency key support
- Estimate: 5 SP
- Depends On: TKT-AUTH-002, TKT-DATA-003
- Description: Add request validation, idempotency key handling, and job enqueue.
- Acceptance Criteria:
  - Duplicate key + same payload returns existing `jobId`.
  - Duplicate key + changed payload returns `409`.

### TKT-WF-002 (P0)
- Type: Story
- Title: Build BullMQ producer and worker skeleton
- Estimate: 5 SP
- Depends On: TKT-PLAT-003
- Description: Add queue producer in API and consumer worker with status transitions.
- Acceptance Criteria:
  - Jobs move through queued -> processing -> terminal state.
  - Failures include normalized error codes.

### TKT-WF-003 (P0)
- Type: Story
- Title: Implement provider adapter (Kie.ai)
- Estimate: 8 SP
- Depends On: TKT-WF-002
- Description: Implement model request mapping, response parsing, and timeout handling.
- Acceptance Criteria:
  - Adapter supports required image and video models.
  - Timeout and provider errors are mapped to retryable/non-retryable classes.

### TKT-WF-004 (P0)
- Type: Story
- Title: Persist media assets and update Firestore node outputs
- Estimate: 3 SP
- Depends On: TKT-WF-003
- Description: On success, store asset metadata and write node output URL/status.
- Acceptance Criteria:
  - MediaAsset row created for completed jobs.
  - Canvas node updates arrive in realtime clients.

### TKT-WF-005 (P0)
- Type: Story
- Title: Add job status endpoint and frontend status polling fallback
- Estimate: 3 SP
- Depends On: TKT-WF-001
- Description: Implement `GET /workflows/jobs/:jobId` and client fallback when listener drops.
- Acceptance Criteria:
  - Endpoint returns canonical job state.
  - UI gracefully recovers from temporary realtime disconnect.

### TKT-WEB-006 (P0)
- Type: Story
- Title: Add node execution UX states
- Estimate: 5 SP
- Depends On: TKT-WF-001
- Description: Display queued/processing/succeeded/failed on canvas nodes with actionable error messages.
- Acceptance Criteria:
  - User sees immediate processing state on execute.
  - Error state includes retry action where appropriate.

---

## Sprint 4

### EPIC-BILL-01 (P0)
- Type: Epic
- Title: Credit ledger and billing-safe execution
- Estimate: 18 SP
- Depends On: TKT-WF-001, TKT-WF-002
- Description: Implement reserve/capture/release model to prevent credit drift and duplicate charges.
- Acceptance Criteria:
  - Credits reserved before provider execution.
  - Credits captured on success, released on hard failure.
  - Ledger remains consistent under retries.

### TKT-BILL-001 (P0)
- Type: Story
- Title: Implement credit reservation at enqueue
- Estimate: 5 SP
- Depends On: TKT-DATA-001
- Description: Atomically check balance and create reservation transaction.
- Acceptance Criteria:
  - Insufficient funds return `402` without enqueuing job.
  - Reservation transaction links to `WorkflowJob`.

### TKT-BILL-002 (P0)
- Type: Story
- Title: Implement capture/release settlement transitions
- Estimate: 5 SP
- Depends On: TKT-BILL-001, TKT-WF-004
- Description: Settle reservation in worker terminal states with transactional guarantees.
- Acceptance Criteria:
  - Success path captures reserved amount exactly once.
  - Hard failure path releases reserved amount exactly once.

### TKT-BILL-003 (P0)
- Type: Task
- Title: Add billing audit log and reconciliation script
- Estimate: 3 SP
- Depends On: TKT-BILL-002
- Description: Emit immutable audit events and periodic reconciliation report.
- Acceptance Criteria:
  - Audit record exists for every billing-affecting event.
  - Reconciliation detects mismatches and outputs incident summary.

### EPIC-OPS-01 (P0)
- Type: Epic
- Title: Reliability, security, and launch readiness
- Estimate: 21 SP
- Depends On: TKT-WF-004, TKT-BILL-002
- Description: Harden the platform with monitoring, security controls, and load validation.
- Acceptance Criteria:
  - SLO dashboards and alerts operational.
  - Rate limiting and security headers enabled.
  - Load and soak tests pass launch thresholds.

### TKT-OPS-001 (P0)
- Type: Story
- Title: Add structured logging and distributed tracing
- Estimate: 5 SP
- Depends On: TKT-WF-002
- Description: Propagate correlation IDs across API, queue, and worker boundaries.
- Acceptance Criteria:
  - `requestId`, `jobId`, `workspaceId` present in logs.
  - End-to-end trace available for representative job flow.

### TKT-OPS-002 (P0)
- Type: Story
- Title: Implement retries, exponential backoff, and DLQ
- Estimate: 5 SP
- Depends On: TKT-WF-002
- Description: Configure retry policy and dead-letter handling for non-recoverable failures.
- Acceptance Criteria:
  - Retryable errors retry with capped backoff.
  - Terminal failures are routed to DLQ with replay metadata.

### TKT-OPS-003 (P0)
- Type: Story
- Title: Enforce rate limiting, CSP, and CORS policies
- Estimate: 5 SP
- Depends On: TKT-AUTH-002
- Description: Apply API gateway throttles and strict security headers.
- Acceptance Criteria:
  - Per-user and per-IP limits enforced.
  - CSP and CORS configured to approved frontend origins only.

### TKT-OPS-004 (P0)
- Type: Story
- Title: Execute performance and queue soak tests
- Estimate: 3 SP
- Depends On: TKT-OPS-002, TKT-BILL-002
- Description: Validate p95 latency, queue pickup times, and sustained processing behavior.
- Acceptance Criteria:
  - Execute endpoint p95 <= 500 ms under target load.
  - Queue pickup p95 <= 2 seconds under target load.

### TKT-OPS-005 (P1)
- Type: Task
- Title: Create operational runbooks (DLQ replay, provider outage)
- Estimate: 3 SP
- Depends On: TKT-OPS-002
- Description: Document operational procedures for support and on-call.
- Acceptance Criteria:
  - Runbooks reviewed by engineering lead.
  - Pager response steps documented and test-run once.

---

## Cross-Sprint QA and Validation Tickets

### TKT-QA-001 (P0)
- Type: Story
- Title: Backend unit test suite for auth, guards, billing, workflow services
- Estimate: 8 SP
- Depends On: Parallel by module
- Description: Add and maintain unit tests as each module is delivered.
- Acceptance Criteria:
  - Critical services and guards reach target coverage.
  - PR checks fail on regressions.

### TKT-QA-002 (P0)
- Type: Story
- Title: API integration test suite for execute lifecycle and failure paths
- Estimate: 8 SP
- Depends On: TKT-WF-001, TKT-BILL-002
- Description: Validate end-to-end API behavior with seeded test dependencies.
- Acceptance Criteria:
  - Happy path and major failure codes are covered.
  - Idempotency conflict and duplicate request cases are covered.

### TKT-QA-003 (P0)
- Type: Story
- Title: End-to-end smoke tests for login -> canvas -> execute -> resolve
- Estimate: 5 SP
- Depends On: TKT-WEB-006, TKT-WF-004
- Description: Automate browser-level smoke tests for critical user journey.
- Acceptance Criteria:
  - Smoke suite passes in CI environment.
  - Failures provide screenshot/log artifacts.

---

## Ready-to-Import CSV Mapping

Use this field mapping for Jira/Linear import:
- `Issue Key` -> ID
- `Issue Type` -> Type
- `Summary` -> Title
- `Description` -> Description + Acceptance Criteria
- `Priority` -> P0/P1/P2
- `Story Points` -> Estimate
- `Parent` -> Epic ID (for stories/tasks)
- `Labels` -> `vanta-lab`, `v1`, `sprint-N`, `backend|frontend|platform|ops`
