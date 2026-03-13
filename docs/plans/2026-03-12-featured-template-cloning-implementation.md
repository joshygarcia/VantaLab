# Featured Template Cloning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add backend-owned featured canvas templates that clone into new editable custom spaces through a modal flow in the web app.

**Architecture:** The API will own the three featured template graphs and expose an atomic clone endpoint that creates a custom space and seeds its `canvasState` in one server-side flow. The web app will replace the current direct template links with a modal that collects clone options, calls the new endpoint, and redirects to the new canvas id.

**Tech Stack:** Next.js 15, React 19, NestJS 10, Prisma, Jest, React Flow, TypeScript

---

### Task 1: Document the approved design and plan

**Files:**
- Create: `docs/plans/2026-03-12-featured-template-cloning-design.md`
- Create: `docs/plans/2026-03-12-featured-template-cloning-implementation.md`

**Step 1: Write the design and plan**

Capture the approved architecture, template graphs, API contract, and TDD implementation steps.

**Step 2: Verify files exist**

Run: `Get-ChildItem docs\\plans`
Expected: both March 12, 2026 featured template cloning plan files are present.

### Task 2: Add failing API tests for the clone-from-template workflow

**Files:**
- Modify: `apps/api/src/modules/workspaces/workspaces.service.spec.ts`

**Step 1: Write the failing test**

Add tests that:
- create a new custom space from `influencer-launch`
- seed non-empty `nodes` and `edges` onto the new space record
- reject an unknown `templateKey`
- preserve team-shared validation rules

Use Prisma mocks for:
- `workspace.upsert`
- `workspace.findUnique`
- `workspace.updateMany`

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- src/modules/workspaces/workspaces.service.spec.ts`
Expected: FAIL because the template clone service method and template registry do not exist yet.

**Step 3: Write minimal implementation**

Add only the code needed for the new service tests to compile and fail for the intended reason.

**Step 4: Run test to verify the failure is correct**

Run: `npm run test --workspace apps/api -- src/modules/workspaces/workspaces.service.spec.ts`
Expected: FAIL with missing method or incorrect result assertions, not test setup errors.

### Task 3: Add the template registry and DTOs in the API

**Files:**
- Create: `apps/api/src/modules/workspaces/dto/create-space-from-template.dto.ts`
- Create: `apps/api/src/modules/workspaces/template-canvas-registry.ts`
- Modify: `apps/api/src/modules/workspaces/workspaces.controller.ts`
- Modify: `apps/api/src/modules/workspaces/workspaces.service.ts`

**Step 1: Write the failing test**

If needed, add DTO validation coverage in:
- `apps/api/src/modules/workspaces/dto/create-space-from-template.dto.spec.ts`

Cover:
- accepted template keys
- required `name`
- protection values
- optional `sharedWorkspaceIds`

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- src/modules/workspaces/workspaces.service.spec.ts`
Expected: FAIL because the registry and DTO are not wired to the service yet.

**Step 3: Write minimal implementation**

Create:
- a `FEATURED_TEMPLATE_KEYS` union and validator
- a template registry exporting three template definitions
- a controller route `POST :id/spaces/from-template`

Keep the first pass registry local to the workspaces module.

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/api -- src/modules/workspaces/workspaces.service.spec.ts`
Expected: PASS for registry resolution and DTO-backed service behavior.

### Task 4: Implement atomic clone creation in the workspaces service

**Files:**
- Modify: `apps/api/src/modules/workspaces/workspaces.service.ts`
- Modify: `apps/api/src/modules/workspaces/workspaces.service.spec.ts`

**Step 1: Write the failing test**

Add a focused test for atomic behavior:
- if seeding canvas persistence fails, the service does not report success
- the returned payload includes `item` and `canvasSeeded: true` only on full success

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- src/modules/workspaces/workspaces.service.spec.ts -t "template"`
Expected: FAIL because the service does not yet create the custom space and seed the canvas in one flow.

**Step 3: Write minimal implementation**

Implement a new service method that:
- validates workspace access
- validates template key
- validates sharing rules
- generates a new custom space id
- persists `customSpaceConfig`
- persists `canvasState` for the same space id
- best-effort syncs the legacy custom space store only after DB persistence

Return:

```ts
{
  item: createdSpace,
  canvasSeeded: true
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/api -- src/modules/workspaces/workspaces.service.spec.ts -t "template"`
Expected: PASS

### Task 5: Define the three production-ready template graphs

**Files:**
- Modify: `apps/api/src/modules/workspaces/template-canvas-registry.ts`

**Step 1: Write the failing test**

Add assertions that each registry entry contains:
- non-empty `nodes`
- non-empty `edges`
- a `viewport`
- expected node titles for the three approved flows

**Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- src/modules/workspaces/workspaces.service.spec.ts -t "registry"`
Expected: FAIL until the graphs are fully defined.

**Step 3: Write minimal implementation**

Encode the three graphs:
- `influencer-launch`
- `product-story`
- `content-batch`

Use only supported stable node types:
- `text-prompt`
- `agent`
- `image-generator`
- `video-generator`

Create helper builders in the registry for:
- node ids
- control ids
- standard node sizes
- edge creation with explicit `sourceHandle` and `targetHandle`

**Step 4: Run test to verify it passes**

Run: `npm run test --workspace apps/api -- src/modules/workspaces/workspaces.service.spec.ts -t "registry"`
Expected: PASS

### Task 6: Add the web API client for cloning templates

**Files:**
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Write the failing test**

Use TypeScript compilation as the red phase by adding a new exported client function signature before implementation:

```ts
export async function createSpaceFromTemplate(...) { ... }
```

Reference it from the canvas hub page so the web build fails until implemented.

**Step 2: Run test to verify it fails**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: FAIL because the page references a missing or incomplete client function.

**Step 3: Write minimal implementation**

Add a typed API helper that posts to:
- `/workspaces/${workspaceId}/spaces/from-template`

Return:

```ts
Promise<{ item: CustomSpaceItem; canvasSeeded: boolean }>
```

**Step 4: Run test to verify it passes**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS for the API client layer.

### Task 7: Replace featured template links with a modal-based clone flow

**Files:**
- Modify: `apps/web/src/app/(studio)/canvas/page.tsx`

**Step 1: Write the failing test**

Use TypeScript compilation as the red phase by:
- introducing modal state for the selected featured template
- wiring template cards to open the modal instead of navigating
- referencing the new clone submit handler before implementing it

**Step 2: Run test to verify it fails**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: FAIL until the modal state and clone handler are complete.

**Step 3: Write minimal implementation**

Add:
- selected template state
- clone modal fields for `name`, `description`, `protection`, `sharedWorkspaceIds`
- submit handler calling `createSpaceFromTemplate`
- redirect on success to `/canvas/${response.item.id}`
- inline error/status handling on failure

Keep existing custom canvas create/edit/delete flows intact.

**Step 4: Run test to verify it passes**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS

### Task 8: Align featured template metadata with the backend registry keys

**Files:**
- Modify: `apps/web/src/app/(studio)/canvas/page.tsx`
- Modify: `apps/api/src/modules/workspaces/template-canvas-registry.ts`

**Step 1: Write the failing test**

Add or enforce a shared string mapping in the page so the featured cards use:
- `influencer-launch`
- `product-story`
- `content-batch`

Type the page data so fake workspace ids like `template-influencer-launch` are no longer valid for featured clone actions.

**Step 2: Run test to verify it fails**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: FAIL until the page stops treating featured templates as routable workspace ids.

**Step 3: Write minimal implementation**

Split template metadata into:
- cloneable featured templates with `templateKey`
- visual-only template cards if needed for non-featured placeholders

Use backend template keys for clone actions and keep preview assets unchanged.

**Step 4: Run test to verify it passes**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS

### Task 9: Run focused validation for the API and web changes

**Files:**
- Modify only if validation exposes defects

**Step 1: Run focused API tests**

Run: `npm run test --workspace apps/api -- src/modules/workspaces/workspaces.service.spec.ts`
Expected: PASS

**Step 2: Run API typecheck**

Run: `npx tsc -p apps/api/tsconfig.json --noEmit`
Expected: PASS

**Step 3: Run web typecheck**

Run: `npx tsc -p apps/web/tsconfig.json --noEmit`
Expected: PASS

**Step 4: Run API build**

Run: `npm run build --workspace apps/api`
Expected: PASS

**Step 5: Run web build**

Run: `npm run build --workspace apps/web`
Expected: PASS

### Task 10: Manual verification of the end-to-end clone flow

**Files:**
- No code changes expected unless defects are found

**Step 1: Launch the app**

Run: `npm run dev`
Expected: web and API start successfully.

**Step 2: Verify the featured template modal**

Open Canvas Hub and click each featured template.

Expected:
- modal opens
- name is prefilled
- protection defaults to `standard`

**Step 3: Verify clone success**

Submit each featured template once.

Expected:
- new custom space is created
- browser redirects to `/canvas/:id`
- seeded nodes and edges are visible immediately

**Step 4: Verify persistence**

Refresh the new canvas page.

Expected:
- seeded graph reloads from backend
- no blank canvas fallback

**Step 5: Verify editability**

Move a node or edit text in one cloned canvas.

Expected:
- changes save successfully
- cloned canvases behave like normal editable custom spaces
