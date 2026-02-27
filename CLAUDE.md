# CLAUDE.md — Better CMS

> **Load this file at the start of every session.** It contains everything needed to resume
> work without re-reading the full codebase.

---

## Project Purpose

A two-part system: (1) a central multi-tenant CMS deployed once to Vercel, serving all client
organizations from a single Next.js 16 + Convex deployment; and (2) an NPM package
(`packages/cms-client`) that client Next.js 16 projects install to define their own content
sections and receive realtime, fully-typed data — no REST API, no manual schema duplication.

---

## Stack Versions

| Tool | Version |
|------|---------|
| Next.js | 16 (App Router, TypeScript strict) |
| Convex | latest |
| Clerk | latest |
| Tailwind CSS | 4 |
| shadcn/ui | latest (New York style) |
| Turborepo | latest |
| pnpm | 9.x |
| tsup | 8.x |

---

## Monorepo Structure

```
better-cms/
├── CLAUDE.md                        ← you are here
├── docs/
│   ├── PLAN.md                      ← full phase-by-phase build plan
│   ├── ARCHITECTURE.md              ← data flow, env model, multi-tenancy
│   ├── DECISIONS.md                 ← why certain approaches were chosen
│   ├── FIXES.md                     ← non-obvious fixes with explanation
│   ├── SETUP.md                     ← env vars, Convex/Clerk/R2 setup
│   └── PACKAGE_USAGE.md             ← how to use @[name]/cms in a client project
├── apps/
│   └── cms/
│       ├── proxy.ts                 ← Next.js 16 auth guard (NOT middleware.ts)
│       ├── convex/
│       │   ├── convex.config.ts     ← app.use(r2); app.use(polar)
│       │   ├── schema.ts
│       │   ├── projects.ts
│       │   ├── sectionRegistry.ts
│       │   ├── sectionContent.ts
│       │   ├── media.ts
│       │   └── polar.ts
│       └── app/
│           ├── (auth)/sign-in/
│           └── admin/
│               └── [projectId]/
│                   ├── content/[type]/
│                   └── media/
└── packages/
    ├── cms-client/
    │   ├── src/
    │   │   ├── index.ts             ← public API barrel
    │   │   ├── client.ts            ← createCMSClient factory
    │   │   ├── token.ts             ← encodeToken / decodeToken (bcms_ format)
    │   │   ├── provider.tsx         ← <CMSProvider> wraps ConvexProvider
    │   │   ├── defineSection.ts     ← defineCMSSection + types
    │   │   ├── z.ts                 ← z.string() / z.image() etc
    │   │   ├── hooks/useSection.ts  ← realtime hook, fully typed
    │   │   └── server/registerSections.ts
    │   ├── tsup.config.ts
    │   └── package.json
    └── create-better-cms/
        ├── src/index.ts             ← CLI entry point (npx create-better-cms)
        ├── templates/nextjs/        ← Next.js 16 project template
        ├── tsup.config.ts
        └── package.json
```

---

## Key Architectural Decisions

### Two Env Vars: BETTER-CMS-SLUG + BETTER-CMS-KEY
Client projects need exactly two env vars:
- `BETTER-CMS-SLUG` — public org slug (e.g. `my-project`), passed to `CMSProvider` server-side
- `BETTER-CMS-KEY` — `bcms_<test|live>-<base64(deploymentName.SECRET)>` format, parsed by
  `parseKey()` from `cms-client` to extract the Convex URL and registration secret

`test` key → preview env content; `live` key → production env content.
The key is **not** `NEXT_PUBLIC_` — it's server-side only. The slug is passed as a prop to
`CMSProvider`. See `packages/cms-client/src/token.ts` for `parseKey` / `buildKey`.

### proxy.ts — NOT middleware.ts
Next.js 16 deprecated `middleware.ts`. Use `proxy.ts` with a named export `proxy` (not
`middleware`). Lightweight session cookie check only — full auth happens in Server Components.

### No REST API
Client Next.js projects connect directly to Convex. Data flows via Convex subscriptions.
`cms.useSection()` is a React hook wrapping `useQuery` from Convex.

### Multi-tenancy: Clerk Organizations
Each client = one Clerk Organization. The `orgId` from Clerk is the universal isolation key
present on every Convex table row. All mutations must verify `orgId` from the session.

### Dual Environment Model
`section_content` has an `env: "production" | "preview"` field. The CMS header shows an
**Environment Toggle**. This is a data-level concept within one Convex deployment — not
separate projects. The `section_registry` table is environment-agnostic (schema, not data).

### section_registry vs section_content
These are separate tables intentionally. `section_registry` is written by the client NPM
package on boot (schema definition). `section_content` is written by CMS users (actual data).
This decouples schema evolution from content editing.

### File Storage: R2 Only
All media goes through Convex R2 component (`@convex-dev/r2`). Never use Convex native storage.
Uploaded files are indexed in the `media` table (r2Key, url, filename, mimeType, size).

### Public Reads: orgSlug, No Auth
`useSection()` (from `cms-client/react`) in client projects requires no auth. `orgSlug` is the
public identifier passed via `CMSProvider`. The Convex query does: `projects` → find by `slug`
→ scope all content by `orgId`.

### Polar: Schema Now, UI Deferred
The Convex Polar component is integrated in `convex.config.ts` and its schema merged in.
No billing UI is built yet. See `docs/DECISIONS.md` for the `TODO: Polar UI` note.

---

## Non-Obvious Implementation Details

- **pnpm workspace**: `pnpm-workspace.yaml` covers `apps/*` and `packages/*`. Always use
  `--filter` flag when running commands for a specific workspace.
- **Convex generated code**: Never edit `convex/_generated/`. Run `npx convex dev` to regenerate.
- **fieldsSchema in Convex**: Stored as a JSON string (not native Convex object). Parsed at
  runtime by both the CMS (to render forms) and the client package (for type inference context).
- **Type inference in cms-client**: The `defineCMSSection` function uses TypeScript conditional
  types and mapped types to infer the return type of `useSection` from the `fields` object.
  `z.image()` resolves to `string`; `z.string().optional()` resolves to `string | undefined`.
- **noUncheckedIndexedAccess**: Enabled in strict tsconfig. Array index access returns
  `T | undefined`. Handle explicitly — don't suppress with `!`.
- **Turbopack**: `next dev --turbopack` is default for Next.js 16. Do not revert to webpack.
- **shadcn**: New York style, CSS variables on. Components added via `pnpm dlx shadcn@latest add`.

---

## Convex Schema (Quick Reference)

```ts
// projects — one per client org
projects: defineTable({
  orgId: v.string(),
  name: v.string(),
  slug: v.string(),
  primaryColor: v.string(),
  faviconUrl: v.string(),
  registrationToken: v.optional(v.string()), // secret for registerSections()
}).index("by_org", ["orgId"]).index("by_slug", ["slug"])

// section_registry — written by client package on boot
section_registry: defineTable({
  orgId: v.string(),
  projectId: v.id("projects"),
  sectionType: v.string(),
  label: v.string(),
  fieldsSchema: v.string(),  // JSON-serialized field definitions
}).index("by_project", ["projectId"])
  .index("by_project_type", ["projectId", "sectionType"])

// section_content — actual content per section + env
section_content: defineTable({
  orgId: v.string(),
  projectId: v.id("projects"),
  sectionType: v.string(),
  env: v.union(v.literal("production"), v.literal("preview")),
  items: v.array(v.any()),
}).index("by_project_type_env", ["projectId", "sectionType", "env"])

// media — R2 file index
media: defineTable({
  orgId: v.string(),
  projectId: v.id("projects"),
  r2Key: v.string(),
  url: v.string(),
  filename: v.string(),
  mimeType: v.string(),
  size: v.number(),
  uploadedAt: v.number(),
  folder: v.optional(v.string()),  // "" = root
}).index("by_project", ["projectId"])
  .index("by_project_folder", ["projectId", "folder"])

// folders — virtual folder hierarchy for the Files tab
folders: defineTable({
  orgId: v.string(),
  projectId: v.id("projects"),
  name: v.string(),       // leaf name
  path: v.string(),       // full path, e.g. "images/headers"
  parentPath: v.string(), // "" for root-level
}).index("by_project", ["projectId"])
  .index("by_project_parent", ["projectId", "parentPath"])
```

---

## Git Commit Convention

**Commit after every discrete feature or task — not just at phase boundaries.**

Examples of when to commit:
- Root workspace config created (`turbo.json`, `pnpm-workspace.yaml`)
- `apps/cms` scaffolded
- shadcn/ui initialized
- `packages/cms-client` scaffolded
- Convex schema written
- Each Convex query/mutation file completed
- `proxy.ts` added
- Each admin route built
- Each component built
- `defineCMSSection` implemented
- `useSection` hook implemented
- Any non-obvious bug fixed (also add to `docs/FIXES.md`)

### Commit message format

```
<type>(<scope>): <short description>

[optional body]
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

Scopes: `cms`, `cms-client`, `convex`, `auth`, `ui`, `media`, `docs`

Examples:
```
chore(root): add turbo + pnpm workspace config
feat(cms): scaffold Next.js 16 app with strict TS
feat(cms): init shadcn/ui with New York style
feat(convex): add schema with projects + section tables
feat(convex): add R2 + Polar component config
feat(auth): add proxy.ts with Clerk session guard
feat(ui): add env toggle component
feat(cms-client): implement defineCMSSection with type inference
fix(convex): use correct index for section_content lookup
docs: update CLAUDE.md and PLAN.md after Phase 2
```

---

## Hard Constraints Checklist

- [x] `CLAUDE.md` and `/docs` updated after every phase and every non-obvious fix
- [ ] Git commit after every discrete feature/task (not just phases)
- [ ] No REST API — client projects connect directly to Convex
- [ ] No `pages`, `slugs`, or metadata tables in CMS — content only
- [ ] No hardcoded section types — everything driven by `section_registry`
- [ ] `proxy.ts` lightweight only — full auth in Server Components/Actions
- [ ] All Convex mutations verify `orgId` from Clerk session — no exceptions
- [ ] Public read queries (`useSection`) require no auth — `orgSlug` as identifier
- [ ] File storage via R2 only — not Convex native storage
- [ ] Polar: component integrated now, billing UI deferred

---

## Build Status

- [x] Phase 0 — CLAUDE.md + /docs scaffold + Plan tool → PLAN.md ✅
- [x] Phase 1 — Turborepo monorepo scaffold + workspace config ✅
- [x] Phase 2 — Convex schema + R2 component + Polar component (schema only) ✅
- [x] Phase 3 — Clerk setup + proxy.ts ✅
- [x] Phase 4 — CMS admin UI (dynamic forms, env toggle, media) ✅
- [x] Phase 5 — NPM package (defineCMSSection, z, useSection + full type inference) ✅
- [x] Phase 6 — Final pass (all docs complete and accurate) ✅

---

## Open Topics

See `TODO.md` in the repo root for known rough edges and deferred work.

---

## How to Run Locally

```bash
# Install all workspace deps
pnpm install

# Run all workspaces in dev mode
pnpm dev

# Run only the CMS app
pnpm --filter @better-cms/cms dev

# Build the client package
pnpm --filter cms-client build

# Build the CLI
pnpm --filter create-better-cms build

# Type-check everything
pnpm type-check

# Deploy Convex functions
cd apps/cms && npx convex deploy
```

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `apps/cms/proxy.ts` | Next.js 16 auth guard — named export `proxy`, not `middleware` |
| `apps/cms/convex/schema.ts` | Single source of truth for all Convex tables |
| `apps/cms/convex/convex.config.ts` | R2 + Polar component registration |
| `packages/cms-client/src/token.ts` | bcms_ token encode/decode |
| `packages/cms-client/src/provider.tsx` | `<CMSProvider>` wrapping ConvexProvider |
| `packages/cms-client/src/z.ts` | Custom z namespace — field type helpers |
| `packages/cms-client/src/defineSection.ts` | Type inference engine for section fields |
| `packages/create-better-cms/src/index.ts` | CLI entry point for `npx create-better-cms` |
| `docs/PLAN.md` | Full phase-by-phase build plan |
| `docs/ARCHITECTURE.md` | System design, data flow, multi-tenancy model |
| `docs/DECISIONS.md` | Why we made the choices we made |
