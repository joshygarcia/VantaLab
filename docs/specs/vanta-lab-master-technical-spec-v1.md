# Vanta Lab - Master Technical Specification (v1)

## 1. Executive Summary

Vanta Lab is a scalable AI influencer creation platform with an infinite canvas workspace for real-time, collaborative media workflows. The product enables creators to define reusable influencer identities and run node-based generation pipelines while preserving strict visual consistency across outputs.

The platform orchestrates external generation providers through a backend-controlled job system so the browser stays responsive during long-running tasks. v1 is optimized for an internal creator team and designed for a clean path to multi-tenant SaaS.

## 2. Tech Stack Definition

### Frontend
- Next.js (App Router), React, TypeScript
- React Flow for node-based infinite canvas
- Zustand for global client state
- Tailwind CSS for UI styling

### Backend
- NestJS (Node.js, TypeScript)
- REST API for public client/backend communication

### Data and Messaging
- PostgreSQL (system of record for users, billing, workspaces, assets)
- Prisma ORM for schema and migrations
- Google Cloud Firestore for real-time canvas node state and synchronization
- Redis + BullMQ for asynchronous job queueing and workers

### Infrastructure
- Google Cloud Run for API and worker services
- Docker containers for deployable runtime artifacts
- GitHub Actions for CI/CD
- Google Cloud Storage + Cloud CDN for generated media delivery

### Security and Access
- OAuth2 (Google/GitHub) + JWT session tokens
- RBAC for Admin and Creator roles
- GCP Secret Manager for provider/API credentials

## 3. System Architecture and Data Flow

Vanta Lab uses an event-driven asynchronous pipeline to separate interactive UI behavior from model execution latency.

1. Client updates canvas state locally and syncs node coordinates/properties to Firestore.
2. User executes a workflow node from the canvas.
3. Frontend sends authenticated request to API with workspace, node, model, and parameters.
4. API validates auth, RBAC, workspace access, request schema, and available credits.
5. API creates a BullMQ job and returns `202 Accepted` with `jobId`.
6. Worker consumes job, invokes provider adapter (Kie.ai in v1), and polls/webhooks for completion.
7. On completion, worker writes asset metadata to PostgreSQL, updates Firestore node output state, and finalizes credit transaction.
8. Client receives Firestore real-time update and renders result directly on canvas.

### Failure and Retry Model
- Queue-level retries with capped exponential backoff.
- Provider timeout moves job to failed state.
- Dead-letter queue stores permanently failed jobs for operator review.
- Credits are reserved at queue time and settled on completion (release on hard failure).

### Idempotency
- `POST /workflows/execute` supports `Idempotency-Key` header.
- Duplicate request with same key and payload returns existing `jobId`.
- Mismatched payload with reused key returns `409 Conflict`.

## 4. Comprehensive File Architecture

```text
vanta-lab-monorepo/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   ├── canvas/[id]/
│   │   │   │   └── page.tsx
│   │   │   ├── components/
│   │   │   │   ├── canvas/
│   │   │   │   ├── influencer/
│   │   │   │   └── shared/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   └── styles/
│   │   └── package.json
│   └── api/                          # NestJS backend
│       ├── src/
│       │   ├── core/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── billing/
│       │   │   ├── users/
│       │   │   ├── workspaces/
│       │   │   ├── influencers/
│       │   │   ├── workflows/
│       │   │   ├── integrations/
│       │   │   └── queue/
│       │   ├── config/
│       │   ├── prisma/
│       │   └── main.ts
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── database/
│   ├── types/
│   └── ui/
└── turbo.json
```

## 5. Core User Stories and Acceptance Criteria

### Story 1: Influencer Identity Vault
As a creator, I define and save strict influencer identity attributes so I can enforce visual consistency across generations.

Acceptance criteria:
- Upload one or more seed images.
- Define negative prompt text.
- Store up to 5 enforced hex palette values.
- Saved identity appears as selectable/draggable entity in canvas.

### Story 2: Node-Based Pipeline Composition
As a creator, I chain text/image/video nodes into executable pipelines.

Acceptance criteria:
- Nodes snap and connect visually.
- Output types map to compatible input types.
- Incompatible connections are blocked with clear error messaging.

### Story 3: Non-Blocking Long-Running Generation
As a creator, I run 1080p cinematic generation without freezing my browser.

Acceptance criteria:
- Clicking Generate sets node status to Processing immediately.
- API response is `202 Accepted` within target latency.
- Node resolves to media URL via Firestore update within 5 seconds of worker completion.

## 6. Database Schema Design (PostgreSQL)

Firestore stores canvas layout and transient node execution state. PostgreSQL stores canonical business records.

### Core entities
- `User`: id, email, password_hash, role, credits_balance, created_at, updated_at
- `Workspace`: id, owner_user_id, title, firestore_doc_id, created_at, updated_at
- `WorkspaceMember`: id, workspace_id, user_id, role, created_at
- `Influencer`: id, user_id, workspace_id, name, seed_image_urls[], negative_prompt, palette_hex[], created_at, updated_at
- `MediaAsset`: id, workspace_id, influencer_id, workflow_node_id, url, type (IMAGE|VIDEO), provider, model_used, created_at
- `WorkflowJob`: id, workspace_id, user_id, node_id, provider, model, status, idempotency_key, error_code, created_at, updated_at
- `CreditTransaction`: id, user_id, workspace_id, job_id, amount, type (RESERVE|CAPTURE|RELEASE|ADJUST), status, created_at

### Relationship summary
- User 1:N Workspace (owner)
- Workspace N:M User through WorkspaceMember
- User 1:N Influencer
- Influencer 1:N MediaAsset
- Workspace 1:N WorkflowJob
- User 1:N CreditTransaction

## 7. API Design Strategy

### Execute Workflow Node
- Route: `POST /api/v1/workflows/execute`
- Auth: Bearer JWT
- Headers: `Idempotency-Key` required

Request:

```json
{
  "workspaceId": "ws_8f7d9a",
  "nodeId": "node_v31_gen_01",
  "model": "veo-3.1",
  "parameters": {
    "prompt": "Cinematic industrial chiaroscuro...",
    "referenceImageUrl": "https://storage/.../seed_1.png",
    "aspectRatio": "16:9"
  }
}
```

Successful response:

```json
{
  "status": "processing",
  "jobId": "job_99x81",
  "message": "Generation queued. Awaiting asynchronous resolution."
}
```

Status codes:
- `202 Accepted`: queued
- `400 Bad Request`: validation failure
- `401 Unauthorized`: invalid auth
- `403 Forbidden`: workspace access denied
- `402 Payment Required`: insufficient credits
- `409 Conflict`: idempotency key reuse with changed payload
- `429 Too Many Requests`: rate limit exceeded

### Job Status Endpoint
- Route: `GET /api/v1/workflows/jobs/:jobId`
- Returns current status (`queued|processing|succeeded|failed`) and error metadata if failed.

## 8. Deployment, Scaling, and Security Standards

### Deployment
- API service and worker service built as separate Docker images.
- Deploy both to Cloud Run with independent autoscaling settings.
- CI/CD pipeline: test -> build -> security scan -> deploy.

### Scaling
- API horizontally scales on request load.
- Worker service scales on queue depth and processing latency.
- PostgreSQL indexes on `user_id`, `workspace_id`, `created_at`.
- Firestore listeners scoped to active workspace to control read costs.

### Observability and Operations
- Structured logs with correlation IDs (`requestId`, `jobId`, `workspaceId`).
- Metrics: queue depth, p95/p99 job duration, provider error rate, credit settlement failures.
- Tracing for API -> queue -> worker -> provider path.
- Runbook for DLQ replay and provider outage mode.

### Security
- Zero-trust service boundaries and least-privilege IAM roles.
- Provider keys only in Secret Manager.
- Strict DTO validation and payload sanitization.
- Helmet CSP and scoped CORS.
- API rate limiting by user and IP.
- Audit log for billing-affecting actions.

## 9. Non-Functional Requirements

- API p95 enqueue latency: <= 500 ms
- Workflow success SLO (provider reachable): >= 99.0%
- Idempotency correctness: 100% for retry-safe execute endpoint
- Multi-tenant isolation: no cross-workspace data leakage

## 10. Open Decisions (v1 Gate)

- Final provider abstraction surface (single adapter vs pluggable provider registry)
- Webhook-first vs poll-first completion strategy per model
- Credit pricing table and per-model cost multipliers
