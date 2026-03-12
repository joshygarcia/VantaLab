# Kie Model Catalog Design

**Date:** March 9, 2026

**Goal:** Replace the current hardcoded Kie model handling with a shared catalog that powers pricing, validation, canvas controls, and request mapping for image, video, and agent workflows.

## Scope

- Expand the existing image workflow support from a few hardcoded models to all Kie models that are both:
  - documented in the local `kie.ai api docs` folder, and
  - priced in Kie's current pricing sources
- Add a real `video-generator` canvas node backed by the same catalog.
- Add an `agent` canvas node for Kie chat-completions models.
- Implement `kling-2.6/motion-control` as the only specialized endpoint beyond the normal image/video/chat generators.

## Inclusion Rule

The implementation will include only models that have both request-shape documentation and reliable pricing data.

Included:
- Image generation/edit models documented locally and priced by Kie
- Video generation models documented locally and priced by Kie
- Chat models currently priced by Kie and backed by local chat docs
- `kling-2.6/motion-control`

Excluded for now:
- Claude chat models, because local docs exist but neither the local chat pricing CSV nor Kie's live pricing table currently exposes Claude credit pricing
- Pricing-only rows without local endpoint docs
- Specialized Veo endpoints other than normal generation

## Architecture

### Shared model catalog

Create a single source of truth for:
- model id
- display label
- category (`image`, `video`, `agent`)
- supported inputs
- supported outputs
- control schema
- pricing strategy

This catalog will drive:
- DTO validation
- credit calculation
- request mapping to Kie APIs
- canvas node model selectors

### Backend execution

Keep asynchronous media execution under the existing workflow job system.

Add agent execution as a workflow-backed path as well so the canvas runner can treat image, video, and agent nodes uniformly. Agent results will store text output instead of media, but still reuse job creation, credit reservation, and status handling.

### Canvas nodes

Use three runnable node classes:
- `image-generator`
- `video-generator`
- `agent`

The node surface stays intentionally small. Model-specific behavior comes from the selected model and its allowed controls rather than separate node types per model.

## Motion Control Design

`kling-2.6/motion-control` will be exposed as a model option inside the `video-generator` node.

Canvas contract:
- Inputs:
  - `prompt-in`
  - `image-in`
  - `video-in`
- Output:
  - `video-out`

Controls:
- `mode`: `720p` or `1080p`
- `character_orientation`: `image` or `video`
- `motion_duration_seconds`: `3-30`

Notes:
- Kie prices this endpoint per second, but the endpoint does not accept duration as a request field.
- The duration control exists for internal credit estimation and billing.
- The API request will send only the documented fields: `prompt`, `input_urls`, `video_urls`, `mode`, and `character_orientation`.

## Agent Node Design

The agent node will call Kie chat-completions endpoints.

Inputs:
- `prompt-in`
- optional `image-in` for multimodal chat models that accept images

Outputs:
- `prompt-out`

Initial controls:
- model
- reasoning effort where supported

Deliberately out of scope for the first pass:
- tool calling UI
- structured output schema editor
- multi-turn memory management

## Error Handling

- Reject runs when the selected model requires an input that is missing.
- Keep validation close to the API boundary with explicit messages.
- If a model/control combination is unsupported, fail before the Kie API request.
- Preserve the current run-to-toast failure behavior in the canvas.

## Testing Strategy

Follow TDD:
- add failing pricing tests first
- add failing DTO validation tests for new fields/models
- add failing service/queue mapping tests for representative image, video, motion-control, and agent cases
- then implement the minimum code to pass

## Validation

At minimum:
- `npm run test --workspace apps/api`
- `npx tsc -p apps/api/tsconfig.json --noEmit`
- `npx tsc -p apps/web/tsconfig.json --noEmit`

