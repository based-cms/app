# DISCREPANCY_LEDGER.md

> Date: 2026-02-27
> Purpose: map documentation claims to current implementation state, with concrete fix direction.

---

## Scope Audited

- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/SETUP.md`
- `docs/PACKAGE_USAGE.md`
- `docs/FIXES.md`
- `docs/ROADMAP.md`
- `docs/PLAN.md` (kept historical; only critical factual drift corrected)
- `apps/cms/README.md`

---

## Confirmed Discrepancies

## 1) Admin media route naming

- **Doc claim**: main admin media route is `/admin/[projectId]/media`.
- **Implementation evidence**:
  - `apps/cms/app/admin/[projectId]/files/page.tsx` is the actual Files UI route.
  - `apps/cms/app/admin/[projectId]/media/page.tsx` is a redirect shim to `/files`.
- **Impact**: stale route examples and architecture descriptions can mislead new implementation work.
- **Fix direction**: update docs to treat `/files` as canonical and mention `/media` as backward-compatible redirect where relevant.

## 2) `section_content.items` schema type in plan docs

- **Doc claim**: `section_content.items: v.string()` (JSON-serialized).
- **Implementation evidence**:
  - `apps/cms/convex/schema.ts` defines `items: v.array(v.any())`.
  - content editors read/write array values directly.
- **Impact**: implementation guidance in `docs/PLAN.md` is materially incorrect for current schema behavior.
- **Fix direction**: patch critical `PLAN.md` schema snippets/notes to match `v.array(v.any())` while preserving the document as a historical build plan.

## 3) Proxy auth implementation model

- **Doc claim**: proxy uses manual session-cookie check.
- **Implementation evidence**:
  - `apps/cms/proxy.ts` uses `clerkMiddleware`, `createRouteMatcher`, and `await auth.protect()`.
  - this aligns with `docs/FIXES.md` phase note about replacing manual cookie checks.
- **Impact**: incorrect auth guidance can lead to broken Clerk integration.
- **Fix direction**: update docs to describe Clerk middleware behavior as current state.

## 4) Environment/deployment model wording drift

- **Doc claim**: preview/production is only an env field in one deployment, with no deployment switching.
- **Implementation evidence**:
  - `apps/cms/components/providers/DeploymentProvider.tsx` supports `live`/`test` deployment mode.
  - `apps/cms/components/admin/ContentDeploymentGate.tsx` switches content area provider for test deployment and creates a shadow project when needed.
  - `apps/cms/.env.local` includes `NEXT_PUBLIC_CONVEX_TEST_URL`.
- **Impact**: docs understate current behavior and operational setup.
- **Fix direction**: reword architecture/decisions docs to reflect current dual-layer model:
  - content still uses `production`/`preview` env values,
  - and admin can optionally switch between live/test deployments.

## 5) Field helper surface area (`z`)

- **Doc claim**: helper set ends at `z.image()`.
- **Implementation evidence**:
  - `packages/cms-client/src/z.ts` includes `z.video()` and `z.document()`.
  - `apps/cms/components/admin/DynamicFieldRenderer.tsx` supports `image | video | document`.
- **Impact**: package docs are incomplete for current supported features.
- **Fix direction**: extend API docs to include `video` and `document`.

## 6) Token region example inconsistency

- **Doc/code mismatch**:
  - `packages/cms-client/src/token.ts` example comment shows `eu-central-1`,
  - implementation returns `eu-west-1`.
- **Impact**: avoidable confusion during onboarding/debugging.
- **Fix direction**: align comment example with current implementation (no runtime behavior change).

## 7) Workspace README is stale scaffold text

- **Doc claim**: `apps/cms/README.md` is default create-next-app boilerplate.
- **Implementation evidence**: repo is a custom multi-tenant CMS with Convex/Clerk/R2 workflows.
- **Impact**: poor local onboarding and incorrect commands/context.
- **Fix direction**: replace with a concise workspace-specific README.

---

## Working-Tree Context

Current codebase contains in-progress admin UI updates in:

- `apps/cms/app/admin/[projectId]/content/[type]/page.tsx`
- `apps/cms/app/admin/[projectId]/page.tsx`
- `apps/cms/components/admin/AdminNav.tsx`
- `apps/cms/components/admin/EnvToggle.tsx`
- `apps/cms/app/admin/[projectId]/error.tsx` (new)

These are treated as part of current truth for this reconciliation pass.
