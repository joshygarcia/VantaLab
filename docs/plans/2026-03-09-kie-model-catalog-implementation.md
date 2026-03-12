# Kie Model Catalog Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a shared Kie model catalog, expand supported Kie models and pricing, add a real video generator node, and add an agent node with `kling-2.6/motion-control` support.

**Architecture:** The work keeps the current workflow job system, but replaces scattered hardcoded model branches with a catalog that defines model capabilities, controls, and pricing. Media nodes remain async workflow jobs, and agent runs are added through the same workflow stack so the canvas runner can stay consistent.

**Tech Stack:** Next.js 15, React 19, NestJS 10, Prisma, Jest, React Flow, TypeScript

---

### Task 1: Document the approved design

**Files:**
- Create: `docs/plans/2026-03-09-kie-model-catalog-design.md`
- Create: `docs/plans/2026-03-09-kie-model-catalog-implementation.md`

**Step 1: Write the design and plan**

Write the approved scope, inclusion rule, architecture, and TDD task list.

**Step 2: Verify files exist**

Run: `Get-ChildItem docs\\plans`
Expected: both March 9, 2026 Kie plan files are present.

### Task 2: Write failing pricing tests for the expanded catalog

**Files:**
- Modify: `apps/api/src/modules/workflows/workflow-credit-cost.spec.ts`
- Modify: `apps/api/src/modules/workflows/workflow-credit-cost.ts`
- Modify: `apps/web/src/components/canvas/workflow-credit-cost.ts`

**Step 1: Write the failing test**

Add assertions for:
- `nano-banana-2`
- `google/nano-banana`
- `qwen/text-to-image`
- `qwen/image-to-image`
- `qwen/image-edit`
- `grok-imagine/text-to-image`
- `grok-imagine/image-to-image`
- `grok-imagine/text-to-video`
- `grok-imagine/image-to-video`
- `sora-2-text-to-video`
- `sora-2-image-to-video`
- `kling-2.6/motion-control` at both `720p` and `1080p`
- token pricing for agent models

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- src/modules/workflows/workflow-credit-cost.spec.ts`
Expected: FAIL because the current calculator does not know the new models or token pricing.

**Step 3: Write minimal implementation**

Refactor the pricing helper to use catalog-driven pricing.

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/api -- src/modules/workflows/workflow-credit-cost.spec.ts`
Expected: PASS

### Task 3: Write failing DTO validation tests for new workflow inputs

**Files:**
- Modify: `apps/api/src/modules/workflows/dto/execute-workflow.dto.ts`
- Create: `apps/api/src/modules/workflows/dto/execute-workflow.dto.spec.ts`

**Step 1: Write the failing test**

Add tests that:
- accept new image, video, and agent model ids
- require a video URL for `kling-2.6/motion-control`
- require `characterOrientation` and `mode` for `kling-2.6/motion-control`
- reject unsupported values

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- src/modules/workflows/dto/execute-workflow.dto.spec.ts`
Expected: FAIL because the DTO does not expose the new model ids or fields.

**Step 3: Write minimal implementation**

Add the new parameters and validation rules.

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/api -- src/modules/workflows/dto/execute-workflow.dto.spec.ts`
Expected: PASS

### Task 4: Write failing workflow service tests for credit reservation with new models

**Files:**
- Modify: `apps/api/src/modules/workflows/workflows.service.spec.ts`
- Modify: `apps/api/src/modules/workflows/workflows.service.ts`

**Step 1: Write the failing test**

Add one reservation test using `kling-2.6/motion-control` parameters and one using an agent model with token pricing fields.

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- src/modules/workflows/workflows.service.spec.ts`
Expected: FAIL because new pricing inputs are not supported end-to-end.

**Step 3: Write minimal implementation**

Update workflow parameter typing and reservation logic only as needed to satisfy the tests.

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/api -- src/modules/workflows/workflows.service.spec.ts`
Expected: PASS

### Task 5: Write failing queue mapping tests for representative Kie requests

**Files:**
- Modify: `apps/api/src/modules/workflows/workflow-queue.service.ts`
- Create: `apps/api/src/modules/workflows/workflow-queue.service.spec.ts`

**Step 1: Write the failing test**

Cover at least:
- one normal image request
- one normal video request
- one `kling-2.6/motion-control` request
- one agent chat-completions request

Verify the outbound Kie request bodies use the documented field names.

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- src/modules/workflows/workflow-queue.service.spec.ts`
Expected: FAIL because the queue service does not yet expose request-building helpers for these cases.

**Step 3: Write minimal implementation**

Extract request builders and implement the missing mappings.

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/api -- src/modules/workflows/workflow-queue.service.spec.ts`
Expected: PASS

### Task 6: Add the shared Kie model catalog

**Files:**
- Create: `apps/api/src/modules/workflows/kie-model-catalog.ts`
- Create: `apps/web/src/components/canvas/kie-model-catalog.ts`
- Modify: `packages/types/index.ts`

**Step 1: Write the failing test**

Add or extend existing tests so they import the catalog-backed model ids instead of raw string branches.

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- src/modules/workflows/workflow-credit-cost.spec.ts`
Expected: FAIL until the catalog exists and the code is wired to it.

**Step 3: Write minimal implementation**

Create the catalog entries and exported type unions.

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/api -- src/modules/workflows/workflow-credit-cost.spec.ts`
Expected: PASS

### Task 7: Implement agent execution in the API

**Files:**
- Modify: `apps/api/src/modules/workflows/workflows.controller.ts`
- Modify: `apps/api/src/modules/workflows/workflows.service.ts`
- Modify: `apps/api/src/modules/workflows/workflow-queue.service.ts`
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Write the failing test**

Add a service or queue test that expects an agent workflow job to call Kie chat-completions and persist text output.

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- src/modules/workflows/workflow-queue.service.spec.ts -t "agent"`
Expected: FAIL because chat execution is not implemented.

**Step 3: Write minimal implementation**

Add agent workflow handling and response persistence with the smallest change that satisfies the test.

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/api -- src/modules/workflows/workflow-queue.service.spec.ts -t "agent"`
Expected: PASS

### Task 8: Add the video generator and agent nodes to the canvas

**Files:**
- Modify: `apps/web/src/components/canvas/add-node-menu.ts`
- Modify: `apps/web/src/components/canvas/nodes/MainNode.tsx`
- Create: `apps/web/src/components/canvas/nodes/VideoGeneratorNode.tsx`
- Create: `apps/web/src/components/canvas/nodes/AgentNode.tsx`
- Modify: `apps/web/src/components/canvas/canvas-workspace.tsx`
- Modify: `apps/web/src/store/canvas-store.ts`

**Step 1: Write the failing test**

If no web test harness exists, use type-safe integration as the red phase by first wiring imports and node types so `tsc` fails on missing node implementations.

**Step 2: Run test to verify it fails**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: FAIL until the node components and types exist.

**Step 3: Write minimal implementation**

Add the new node types, model selectors, ports, and preview behavior.

**Step 4: Run test to verify it passes**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS

### Task 9: Wire model-specific canvas execution

**Files:**
- Modify: `apps/web/src/components/canvas/canvas-workspace.tsx`
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Write the failing test**

Use the queue mapping tests and TypeScript compilation as the red phase for the new parameter shapes.

**Step 2: Run test to verify it fails**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: FAIL until motion-control and agent parameters are passed correctly.

**Step 3: Write minimal implementation**

Build request parameters for:
- normal image models
- normal video models
- `kling-2.6/motion-control`
- agent models

**Step 4: Run test to verify it passes**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS

### Task 10: Run focused validation, then the broader checks

**Files:**
- Modify only if validation reveals defects

**Step 1: Run focused API tests**

Run:
- `npm run test --workspace apps/api -- src/modules/workflows/workflow-credit-cost.spec.ts`
- `npm run test --workspace apps/api -- src/modules/workflows/dto/execute-workflow.dto.spec.ts`
- `npm run test --workspace apps/api -- src/modules/workflows/workflows.service.spec.ts`
- `npm run test --workspace apps/api -- src/modules/workflows/workflow-queue.service.spec.ts`

Expected: PASS

**Step 2: Run typechecks**

Run:
- `npx tsc -p apps/api/tsconfig.json --noEmit`
- `npx tsc -p apps/web/tsconfig.json --noEmit`

Expected: PASS

**Step 3: Run full API suite**

Run: `npm run test --workspace apps/api`
Expected: PASS
