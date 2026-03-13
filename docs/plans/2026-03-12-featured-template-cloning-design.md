# Featured Template Cloning Design

**Date:** March 12, 2026

**Goal:** Turn the three featured canvas templates into production-ready workflows that create a new editable custom canvas for the user, prefilled with a complete node graph and ready to run on the API hosted in Cloud Run.

## Scope

- Implement complete featured templates for:
  - `Influencer Launch`
  - `Product Story`
  - `Content Batch`
- Replace the current direct-link template behavior with a modal-based clone flow.
- Create template-owned workflow graphs in the API, not in the client.
- Persist cloned canvases through the existing Prisma-backed workspace canvas storage.

## Product Behavior

When a user selects a featured template:

1. A modal opens.
2. The user chooses:
   - new canvas name
   - protection mode
   - optional shared workspace ids when protection is `team-shared`
3. The web app calls a backend clone endpoint.
4. The API creates a new custom space in the selected owner workspace.
5. The API seeds the new space with the template canvas.
6. The web app redirects to the new `/canvas/:id`.

The result must be an editable custom canvas owned by the user workspace, not a read-only template workspace.

## Architecture

### Backend-owned template registry

Create a server-side registry for the featured templates. Each template definition includes:

- `templateKey`
- display metadata
- default description
- `nodes`
- `edges`
- `viewport`

The registry is the single source of truth for template graphs.

### Atomic clone endpoint

Add a dedicated API route:

- `POST /api/v1/workspaces/:id/spaces/from-template`

This endpoint is responsible for:

- validating access to the owner workspace
- validating template key and protection rules
- creating the custom space
- writing the seeded canvas state to the new space id
- returning the created custom space metadata

This avoids the weaker client-side two-step flow where the web app would create the space first and seed the canvas second.

### Persistence model

The cloned space metadata remains stored in the workspace table through `customSpaceConfig`.

The cloned canvas remains stored in the workspace table through `canvasState`.

This is compatible with Cloud Run because persistence stays in the database-backed path and does not depend on local filesystem writes.

## API Contract

### Request

`POST /api/v1/workspaces/:id/spaces/from-template`

Body:

- `templateKey`: `'influencer-launch' | 'product-story' | 'content-batch'`
- `name`: string
- `description?`: optional string override
- `protection`: `'standard' | 'locked' | 'team-shared' | 'template-only'`
- `sharedWorkspaceIds?`: string[]

### Response

- `item`: created custom space metadata
- `canvasSeeded`: `true`

## Web Flow

Update the featured template cards in `apps/web/src/app/(studio)/canvas/page.tsx` so they no longer navigate directly to fake template workspace ids.

Instead:

- clicking a featured template opens a modal
- the modal is prefilled with the template name and description
- default protection is `standard`
- submit calls the new clone endpoint
- success updates local custom space state and redirects to `/canvas/:newSpaceId`
- failure keeps the modal open and shows a specific error

## Template Workflow Graphs

The seeded graphs should use the stable runnable node types already supported by the current canvas:

- `text-prompt`
- `agent`
- `image-generator`
- `video-generator`

Avoid depending on hidden `prompt-list` and `image-list` nodes for the initial pass.

### Influencer Launch

Nodes:

- `Campaign Brief` (`text-prompt`)
- `Persona Prompt Builder` (`agent`)
- `Hero Portrait Generator` (`image-generator`)
- `Launch Clip Prompt` (`agent`)
- `Launch Video Generator` (`video-generator`)

Connections:

- `Campaign Brief -> Persona Prompt Builder`
- `Persona Prompt Builder -> Hero Portrait Generator` on `prompt-in`
- `Campaign Brief -> Launch Clip Prompt`
- `Hero Portrait Generator -> Launch Video Generator` on `image-in`
- `Launch Clip Prompt -> Launch Video Generator` on `prompt-in`

### Product Story

Nodes:

- `Product Brief` (`text-prompt`)
- `Hero Concept Writer` (`agent`)
- `Hero Image Generator` (`image-generator`)
- `Story Angle Writer` (`agent`)
- `Story Video Generator` (`video-generator`)

Connections:

- `Product Brief -> Hero Concept Writer`
- `Hero Concept Writer -> Hero Image Generator`
- `Product Brief -> Story Angle Writer`
- `Hero Image Generator -> Story Angle Writer` on `image-in`
- `Story Angle Writer -> Story Video Generator` on `prompt-in`
- `Hero Image Generator -> Story Video Generator` on `image-in`

### Content Batch

Nodes:

- `Weekly Content Brief` (`text-prompt`)
- `Content Strategist` (`agent`)
- `Post A Prompt` (`agent`)
- `Post A Image` (`image-generator`)
- `Post B Prompt` (`agent`)
- `Post B Image` (`image-generator`)
- `Short Video Script` (`agent`)
- `Weekly Video` (`video-generator`)

Connections:

- `Weekly Content Brief -> Content Strategist`
- `Content Strategist -> Post A Prompt`
- `Content Strategist -> Post B Prompt`
- `Content Strategist -> Short Video Script`
- `Post A Prompt -> Post A Image`
- `Post B Prompt -> Post B Image`
- `Short Video Script -> Weekly Video`
- `Post A Image -> Weekly Video` on `image-in`

## Error Handling

- Reject unknown `templateKey` with `BadRequestException`.
- Reject invalid sharing combinations using the same rules as normal custom spaces.
- Return failure only when the full clone operation fails.
- Do not redirect on partial failure.
- Keep the modal values intact after failure so the user can retry.

## Testing Strategy

Follow TDD.

API:

- add failing tests for template registry lookup and clone behavior
- verify created spaces are seeded with non-empty `nodes` and `edges`
- verify invalid template keys are rejected
- verify protection and sharing rules still apply

Web:

- use typecheck/build as the quality gate
- manually verify the modal flow, redirect, and persisted canvas load

## Validation

At minimum:

- `npm run test --workspace apps/api -- src/modules/workspaces/workspaces.service.spec.ts`
- `npx tsc -p apps/api/tsconfig.json --noEmit`
- `npx tsc -p apps/web/tsconfig.json --noEmit`
- `npm run build --workspace apps/api`
- `npm run build --workspace apps/web`
