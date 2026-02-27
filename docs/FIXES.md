# FIXES.md — Better CMS

> Non-obvious fixes made during the build, with explanation.
> Add entries here whenever a fix is not immediately self-evident from the code change.
> Format: ## [Phase X] — Short description
> Last updated: 2026-02-27 (Phase 0 — no fixes yet)

---

## [Phase 1] — Disable `exactOptionalPropertyTypes` in Next.js tsconfig

**Symptom**: `tsc --noEmit` fails on shadcn-generated components with TS2375 errors:
- `dropdown-menu.tsx`: `checked: CheckedState | undefined` not assignable to `CheckedState`
- `sonner.tsx`: `theme: "system" | "light" | "dark" | undefined` not assignable to `"system" | "light" | "dark"`

**Root cause**: `exactOptionalPropertyTypes: true` (inherited from `base.json`) is stricter than
`strict: true` — it disallows passing `T | undefined` where `T` is expected, even for optional
props. Shadcn's generated component code doesn't account for this setting.

**Fix**: Override `exactOptionalPropertyTypes: false` in `packages/tsconfig/nextjs.json`.
The `library.json` (used by `cms-client`) keeps it `true` — it only applies to our own code.

**Note**: `exactOptionalPropertyTypes` remains enabled for `packages/cms-client` via
`library.json`, since we control that code entirely.

---

## [Phase 1] — Install `tw-animate-css` and `shadcn` packages

**Symptom**: `next build` fails with `Can't resolve 'tw-animate-css'` then `Can't resolve 'shadcn/tailwind.css'`.

**Root cause**: shadcn's `init` writes `@import "tw-animate-css"` and `@import "shadcn/tailwind.css"` into `globals.css` but its automated `pnpm add` step failed due to the nested workspace issue (see above). Even after the workspace was fixed, `tw-animate-css` and `shadcn` itself were not listed as dependencies.

**Fix**: `pnpm --filter @better-cms/cms add tw-animate-css shadcn`.

Both packages must be direct dependencies of `apps/cms` — they are CSS imports, not JS imports, so they won't appear in the module graph until the build actually runs.

---

## [Phase 1] — `create-next-app` creates nested `pnpm-workspace.yaml`

**Symptom**: `shadcn init` fails with `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` — cannot resolve `@better-cms/tsconfig@workspace:*` from inside `apps/cms`.

**Root cause**: `create-next-app` created `apps/cms/pnpm-workspace.yaml` and `apps/cms/pnpm-lock.yaml`, making `apps/cms` treat itself as the root of a separate workspace. This broke cross-workspace resolution.

**Fix**: Delete `apps/cms/pnpm-workspace.yaml` and `apps/cms/pnpm-lock.yaml`, then run `pnpm install` from the monorepo root. The app is then correctly treated as a workspace package within the root workspace.
