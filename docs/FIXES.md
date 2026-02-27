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
