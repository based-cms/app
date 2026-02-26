# PLAN.md — Better CMS: Multi-Tenant Central CMS + NPM Client Package

```markdown
# PLAN.md — Better CMS

> **System**: A two-part system consisting of a central multi-tenant CMS (`apps/cms`) deployed
> once to Vercel serving all clients, and an NPM package (`packages/cms-client`) that client
> Next.js 16 projects install to connect, define content sections, and receive realtime typed data.
>
> **Last updated**: 2026-02-27
> **Git**: Commit after every discrete task — not just phase boundaries. See CLAUDE.md for convention.
> **Status**: Pre-implementation — planning complete, no code written yet.

---

## Table of Contents

1. [Architecture Summary](#architecture-summary)
2. [Monorepo Directory Map](#monorepo-directory-map)
3. [Cross-Phase Dependency Graph](#cross-phase-dependency-graph)
4. [Phase 0 — Bootstrap & Documentation Scaffold](#phase-0--bootstrap--documentation-scaffold)
5. [Phase 1 — Turborepo Monorepo Scaffold](#phase-1--turborepo-monorepo-scaffold)
6. [Phase 2 — Convex Schema + Components (R2, Polar)](#phase-2--convex-schema--components-r2-polar)
7. [Phase 3 — Clerk Auth + proxy.ts](#phase-3--clerk-auth--proxyts)
8. [Phase 4 — CMS Admin UI](#phase-4--cms-admin-ui)
9. [Phase 5 — NPM Package: cms-client](#phase-5--npm-package-cms-client)
10. [Phase 6 — Final Pass](#phase-6--final-pass)
11. [Hard Constraints Reference](#hard-constraints-reference)
12. [Key Architectural Decisions & Rationale](#key-architectural-decisions--rationale)
13. [Open Questions & Deferred Work](#open-questions--deferred-work)

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Turborepo Monorepo                           │
│                                                                     │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐   │
│  │      apps/cms           │    │    packages/cms-client       │   │
│  │  (Next.js 16 App Router)│    │    (NPM package, tsup)       │   │
│  │  Vercel — 1 deployment  │    │                              │   │
│  │  All clients, all orgs  │    │  createCMSClient(...)        │   │
│  │                         │    │  defineCMSSection(...)       │   │
│  │  Clerk Auth (Org-scoped)│    │  z.string() / z.image() ... │   │
│  │  /admin/** → guarded    │    │  cms.registerSections(...)  │   │
│  │  /api/... → guarded     │    │  cms.useSection(section)     │   │
│  └────────────┬────────────┘    └──────────────┬───────────────┘   │
│               │                                │                   │
│               └────────────┬───────────────────┘                   │
│                            │                                        │
│                     ┌──────▼──────┐                                 │
│                     │   Convex    │                                 │
│                     │  (1 project)│                                 │
│                     │  projects   │                                 │
│                     │  section_   │                                 │
│                     │  registry   │                                 │
│                     │  section_   │                                 │
│                     │  content    │                                 │
│                     │  media      │                                 │
│                     └──────┬──────┘                                 │
│                            │                                        │
│               ┌────────────┴─────────────┐                         │
│               │                          │                         │
│        ┌──────▼──────┐          ┌────────▼──────┐                 │
│        │  Cloudflare │          │  Polar.sh     │                 │
│        │     R2      │          │  (schema now, │                 │
│        │  (media)    │          │   UI deferred)│                 │
│        └─────────────┘          └───────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Multi-tenancy model**: Each client = one Clerk Organization. The `orgId` from Clerk is the
universal isolation key on every Convex table. Public reads use `orgSlug` (no auth required).

**Dual environment model**: `section_content` has an `env` field (`"production"` | `"preview"`).
The CMS admin UI exposes a toggle per-project. This is a data-level concept within a single
Convex deployment — not separate Convex projects. This keeps billing simple and queries
straightforward.

---

## Monorepo Directory Map

```
better-cms/
├── .changeset/
│   └── config.json
├── .claude/
│   └── (reserved for Claude Code context)
├── docs/
│   ├── PLAN.md                     ← this file
│   ├── ARCHITECTURE.md
│   ├── CONVEX_SCHEMA.md
│   ├── CMS_CLIENT_API.md
│   └── DEPLOYMENT.md
├── CLAUDE.md                       ← mandatory, updated every phase
├── apps/
│   └── cms/
│       ├── app/
│       │   ├── (auth)/             ← Clerk-protected group
│       │   │   └── admin/
│       │   │       ├── page.tsx
│       │   │       ├── [projectId]/
│       │   │       │   ├── page.tsx
│       │   │       │   ├── content/
│       │   │       │   │   ├── page.tsx
│       │   │       │   │   └── [type]/
│       │   │       │   │       └── page.tsx
│       │   │       │   └── media/
│       │   │       │       └── page.tsx
│       │   │       └── layout.tsx  ← admin shell, org context
│       │   ├── layout.tsx          ← root layout, ConvexProvider + ClerkProvider
│       │   └── globals.css
│       ├── convex/
│       │   ├── _generated/
│       │   ├── convex.config.ts    ← app.use(r2); app.use(polar)
│       │   ├── schema.ts
│       │   ├── projects.ts
│       │   ├── sectionRegistry.ts
│       │   ├── sectionContent.ts
│       │   ├── media.ts
│       │   └── lib/
│       │       └── orgGuard.ts     ← shared mutation guard helper
│       ├── components/
│       │   ├── ui/                 ← shadcn components
│       │   ├── admin/
│       │   │   ├── ProjectCard.tsx
│       │   │   ├── SectionEditor.tsx
│       │   │   ├── DynamicFieldRenderer.tsx
│       │   │   ├── EnvToggle.tsx
│       │   │   └── MediaUploader.tsx
│       │   └── providers/
│       │       └── ConvexClerkProvider.tsx
│       ├── lib/
│       │   └── utils.ts
│       ├── proxy.ts                ← Next.js 16 auth guard (lightweight only)
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
└── packages/
    └── cms-client/
        ├── src/
        │   ├── index.ts            ← public API barrel
        │   ├── client.ts           ← createCMSClient factory
        │   ├── defineSection.ts    ← defineCMSSection + FieldSchema type
        │   ├── z.ts                ← custom z namespace (string/number/boolean/image)
        │   ├── hooks/
        │   │   └── useSection.ts   ← realtime hook, type-inferred
        │   └── server/
        │       └── registerSections.ts ← Server Component action
        ├── tsup.config.ts
        ├── tsconfig.json
        └── package.json
```

---

## Cross-Phase Dependency Graph

```
Phase 0 (docs scaffold)
    └── Phase 1 (monorepo scaffold)
            └── Phase 2 (Convex schema + components)
                    └── Phase 3 (Clerk + proxy.ts)
                            ├── Phase 4 (CMS Admin UI)
                            │       depends on: Phase 2 (schema), Phase 3 (auth)
                            └── Phase 5 (NPM package)
                                    depends on: Phase 2 (Convex queries), Phase 3 (orgSlug)
                                        └── Phase 6 (final pass)
                                                depends on: all phases complete
```

**Key cross-phase dependencies to watch**:
- Phase 3's `proxy.ts` pattern must be established before Phase 4 builds any admin route.
- Phase 2's `fieldsSchema` column definition directly controls Phase 5's type inference design.
- Phase 5's `useSection` must match the exact shape of Phase 4's `sectionContent` mutations.
- Phase 4's `DynamicFieldRenderer` and Phase 5's `z` namespace must use matching field type tokens.

---

## Phase 0 — Bootstrap & Documentation Scaffold

**Goal**: Establish the documentation and AI context infrastructure before any code is written.
This phase produces no runtime code. Every subsequent phase begins with CLAUDE.md in a known
good state.

### Tasks

#### 0.1 Create CLAUDE.md at repo root

**File**: `CLAUDE.md`

Content must include:
- Project name and one-line description
- Stack versions: Next.js 16, Convex (latest), Clerk (latest), Tailwind 4, shadcn/ui
- Monorepo structure overview
- Key architectural decisions (verbatim from requirements — proxy.ts, no REST, no pages/slugs,
  section_registry vs section_content separation, R2 only, Polar deferred UI)
- How to run locally: pnpm install, pnpm dev
- How to deploy: `npx convex deploy`, Vercel CLI
- Active constraints list (hard constraints section)
- Phase completion tracker: checkboxes for Phase 0–6

**Acceptance criteria**:
- File exists at repo root
- Every hard constraint listed in the requirements is present in CLAUDE.md
- Can be understood by Claude Code mid-session without any other context

#### 0.2 Create /docs directory and scaffold all doc files

**Files**:
- `docs/PLAN.md` — this file (full plan)
- `docs/ARCHITECTURE.md` — C4-style description of system components and their relationships
- `docs/CONVEX_SCHEMA.md` — schema tables, field types, index definitions, access patterns
- `docs/CMS_CLIENT_API.md` — full API reference for `packages/cms-client`
- `docs/DEPLOYMENT.md` — Vercel setup, Convex deploy keys, Clerk env vars, R2 credentials,
  Polar webhook setup

**Acceptance criteria**:
- All five files exist with at least skeleton headings
- PLAN.md contains the full phase breakdown (this document)
- No placeholder "TODO" headings left unfilled in ARCHITECTURE.md

#### 0.3 Initialize git repository

**Acceptance criteria**:
- `git init` run at repo root
- `.gitignore` covers: `node_modules`, `.next`, `.convex`, `dist`, `.env*.local`,
  `.turbo`, `*.tsbuildinfo`
- Initial commit with message `chore: initial scaffold — Phase 0`

**Gotchas**:
- `.env.local` files must never be committed. The `.gitignore` entry for `*.local` is critical.
- Add `.changeset/` directory to git from the start so Changesets CI works correctly later.

---

## Phase 1 — Turborepo Monorepo Scaffold

**Goal**: Create a working monorepo with two workspaces (`apps/cms` and `packages/cms-client`)
that build and type-check cleanly. No business logic yet — structure only.

**Prereqs**: Phase 0 complete.

### Tasks

#### 1.1 Root workspace configuration

**Files**: `package.json` (root), `pnpm-workspace.yaml`, `turbo.json`

**Root `package.json`**:
```json
{
  "name": "better-cms",
  "private": true,
  "packageManager": "pnpm@9.x.x",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean"
  }
}
```

**`pnpm-workspace.yaml`**:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**`turbo.json`** pipeline:
```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Acceptance criteria**:
- `pnpm install` succeeds from root
- `pnpm build` succeeds (both workspaces build)
- `pnpm dev` starts the CMS app

#### 1.2 Bootstrap `apps/cms`

**Method**: `pnpm dlx create-next-app@latest apps/cms --typescript --app --tailwind --eslint --src-dir=false --import-alias="@/*"`

Post-creation changes:
- Set `"strict": true` in `tsconfig.json`
- Install shadcn/ui: `pnpm dlx shadcn@latest init` (use New York style, CSS variables on)
- Add initial shadcn components: `button`, `card`, `input`, `label`, `select`, `badge`,
  `dialog`, `dropdown-menu`, `toast`, `separator`, `scroll-area`, `table`
- Delete default Next.js boilerplate from `app/page.tsx`

**`apps/cms/package.json`** key entries:
```json
{
  "name": "@better-cms/cms",
  "version": "0.0.1",
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "type-check": "tsc --noEmit"
  }
}
```

**Acceptance criteria**:
- `pnpm --filter @better-cms/cms dev` starts the dev server on port 3000
- TypeScript strict mode enabled, zero type errors
- shadcn/ui components importable from `@/components/ui/*`
- No default Next.js boilerplate remaining

#### 1.3 Bootstrap `packages/cms-client`

**Method**: Manual scaffold (not create-next-app)

**`packages/cms-client/package.json`**:
```json
{
  "name": "cms-client",
  "version": "0.1.0",
  "description": "Client SDK for connecting Next.js projects to Better CMS",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./server": {
      "import": "./dist/server/index.mjs",
      "require": "./dist/server/index.js",
      "types": "./dist/server/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "type-check": "tsc --noEmit"
  },
  "peerDependencies": {
    "convex": ">=1.0.0",
    "next": ">=16.0.0",
    "react": ">=19.0.0"
  },
  "devDependencies": {
    "tsup": "^8.x",
    "typescript": "^5.x"
  }
}
```

**`packages/cms-client/tsup.config.ts`**:
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'server/index': 'src/server/registerSections.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'next', 'convex'],
});
```

**`packages/cms-client/tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Create stub `src/index.ts`:
```typescript
export { createCMSClient } from './client';
export { defineCMSSection } from './defineSection';
export { z } from './z';
```

**Acceptance criteria**:
- `pnpm --filter cms-client build` produces `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts`
- No TypeScript errors
- `peerDependencies` list is correct — no React/Next bundled into the output

#### 1.4 Shared TypeScript config (optional but recommended)

Create `packages/tsconfig/` with a shared `base.json` that both workspaces extend:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "skipLibCheck": true
  }
}
```

**Acceptance criteria**:
- Both workspaces' `tsconfig.json` files extend `@better-cms/tsconfig/base.json`
- `pnpm type-check` passes from root

#### 1.5 Changesets configuration

```json
// .changeset/config.json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@better-cms/cms"]
}
```

Note: `apps/cms` is ignored from publishing — only `cms-client` is ever published to npm.

**Acceptance criteria**:
- `pnpm changeset` runs without error
- `ignore` list correctly excludes the CMS app

**Gotchas for Phase 1**:
- Next.js 16 requires React 19. Ensure `peerDependencies` in `cms-client` declares `react: ">=19.0.0"`.
- Turbopack (`next dev --turbopack`) is the default for Next.js 16 dev mode — do not revert to webpack.
- The `packages/cms-client` workspace must NOT import from `apps/cms`. The dependency direction
  is one-way: cms app depends on convex; client package depends on convex as a peer dep.
- `noUncheckedIndexedAccess: true` will cause issues with array indexing in generated code —
  be prepared to handle this explicitly.
- Do not add `"type": "module"` to the root `package.json`. Let tsup handle dual CJS/ESM output.

---

## Phase 2 — Convex Schema + R2 Component + Polar Component

**Goal**: Define the complete Convex schema, integrate the R2 and Polar components, and
establish all Convex functions (queries + mutations) that the CMS and client package will use.
No UI yet.

**Prereqs**: Phase 1 complete. Convex account + project created.

### Tasks

#### 2.1 Install and initialize Convex in `apps/cms`

```bash
pnpm --filter @better-cms/cms add convex
pnpm dlx convex dev --once  # creates convex/ directory and _generated/
```

**Acceptance criteria**:
- `apps/cms/convex/` directory exists with `_generated/` and `schema.ts`
- `CONVEX_DEPLOYMENT` in `.env.local` is set

#### 2.2 Install Convex R2 component

```bash
pnpm --filter @better-cms/cms add @convex-dev/r2
```

**`apps/cms/convex/convex.config.ts`**:
```typescript
import { defineApp } from 'convex/server';
import r2 from '@convex-dev/r2/convex.config';
import polar from '@convex-dev/polar/convex.config';

const app = defineApp();
app.use(r2);
app.use(polar);

export default app;
```

R2 environment variables required in Convex dashboard:
- `R2_TOKEN`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT` (e.g., `https://<account-id>.r2.cloudflarestorage.com`)
- `R2_BUCKET`

**Acceptance criteria**:
- `npx convex dev` starts without errors
- R2 and Polar components appear in Convex dashboard under Components

#### 2.3 Install Convex Polar component (schema only)

```bash
pnpm --filter @better-cms/cms add @convex-dev/polar
```

Polar requires a webhook endpoint. Register in `apps/cms/app/api/polar/events/route.ts` as a
stub that does nothing but return 200, to be completed in Phase 6.

No Polar UI is built in this phase. The component is wired into `convex.config.ts` so its
schema tables are established now, avoiding a future schema migration.

**Acceptance criteria**:
- Polar tables appear in Convex dashboard
- No Polar UI referenced anywhere in Phase 2

#### 2.4 Define `apps/cms/convex/schema.ts`

```typescript
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  projects: defineTable({
    orgId: v.string(),
    name: v.string(),
    slug: v.string(),
    primaryColor: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
  })
    .index('by_org', ['orgId'])
    .index('by_slug', ['slug']),

  section_registry: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    sectionType: v.string(),
    label: v.string(),
    // Serialized JSON of field definitions — the "schema" for a section.
    // Shape: Array<{ name: string; type: FieldType; label?: string; optional?: boolean;
    //               multiline?: boolean; default?: unknown }>
    // FieldType: "string" | "number" | "boolean" | "image"
    fieldsSchema: v.string(),
  })
    .index('by_org', ['orgId'])
    .index('by_project', ['orgId', 'projectId'])
    .index('by_type', ['orgId', 'projectId', 'sectionType']),

  section_content: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    sectionType: v.string(),
    env: v.union(v.literal('production'), v.literal('preview')),
    // items is a JSON array of records. Shape is validated against fieldsSchema at write time.
    items: v.string(),
  })
    .index('by_org', ['orgId'])
    .index('by_project_type_env', ['orgId', 'projectId', 'sectionType', 'env']),

  media: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    r2Key: v.string(),
    url: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    uploadedAt: v.number(),
  })
    .index('by_org', ['orgId'])
    .index('by_project', ['orgId', 'projectId']),
});
```

**Rationale for `fieldsSchema: v.string()` and `items: v.string()`**:
Storing as serialized JSON strings rather than Convex's `v.any()` or nested validators gives
full schema flexibility without requiring Convex schema migrations when section types change.
Type safety is enforced at the application layer (in the CMS editor and in `cms-client`'s
type inference).

**Acceptance criteria**:
- `npx convex dev` pushes schema without errors
- All four tables visible in Convex dashboard
- All indexes created correctly

#### 2.5 Create Convex query and mutation functions

**`apps/cms/convex/lib/orgGuard.ts`**:
```typescript
import { MutationCtx } from './_generated/server';

/**
 * Extracts orgId from Clerk JWT identity and asserts it is present.
 * Used in all mutations to prevent cross-org data writes.
 */
export async function requireOrgId(ctx: MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthenticated');
  const orgId = identity.tokenIdentifier.split('|org_')[1]
    ?? (identity as any).org_id;
  if (!orgId) throw new Error('No organization context');
  return orgId;
}
```

> **Note**: The exact shape of the Clerk JWT org claim must be verified against live tokens
> during Phase 3. The pattern above is a placeholder — adjust field name after inspecting
> actual token claims with `console.log(identity)` in a test mutation.

**`apps/cms/convex/projects.ts`** — queries and mutations:

```typescript
// Public query — no auth required, orgSlug is the identifier
export const getBySlug = query({ ... });

// Guarded mutations
export const create = mutation({ ... });   // requireOrgId
export const update = mutation({ ... });   // requireOrgId + verify ownership
```

**`apps/cms/convex/sectionRegistry.ts`**:

```typescript
// Public query — client projects call this during section registration
export const getByProject = query({ ... });  // args: { orgSlug, projectSlug }

// Guarded mutations
export const upsert = mutation({ ... });     // requireOrgId
export const remove = mutation({ ... });     // requireOrgId
```

**`apps/cms/convex/sectionContent.ts`**:

```typescript
// Public query — client projects subscribe to this for realtime data
export const get = query({
  args: {
    orgSlug: v.string(),
    projectSlug: v.string(),
    sectionType: v.string(),
    env: v.union(v.literal('production'), v.literal('preview')),
  },
  handler: async (ctx, args) => { ... }
});

// Guarded mutations — CMS admin only
export const set = mutation({ ... });    // requireOrgId
export const append = mutation({ ... }); // requireOrgId
export const remove = mutation({ ... }); // requireOrgId
```

**`apps/cms/convex/media.ts`**:

```typescript
// Generate R2 signed upload URL — guarded
export const generateUploadUrl = mutation({ ... }); // requireOrgId, returns presigned URL

// Record upload completion — guarded
export const recordUpload = mutation({ ... }); // requireOrgId

// Public list query
export const list = query({ args: { orgSlug, projectSlug }, handler: ... });

// Delete — guarded, also calls r2.delete(ctx, r2Key)
export const remove = mutation({ ... }); // requireOrgId
```

**Acceptance criteria**:
- All functions push without TypeScript errors
- Public queries (`getBySlug`, `get`, `list`) work without auth headers
- Mutations reject when called without valid Clerk JWT
- `requireOrgId` tested manually via Convex dashboard function runner

**Gotchas for Phase 2**:
- `v.id('projects')` is a strong Convex ID — do NOT store as a plain string in `section_registry`
  or `section_content`. This ensures referential integrity at the database level.
- `fieldsSchema` and `items` stored as JSON strings means you MUST validate them with
  `JSON.parse` / `JSON.stringify` at every read/write boundary. Never assume they are valid JSON.
- The Polar component registers its own tables in the schema. Do NOT create tables that conflict
  with Polar's internal table names. Check `@convex-dev/polar/convex.config` source before naming.
- R2 does NOT use Convex native file storage. Do not use `ctx.storage` anywhere.
  All file operations go through the R2 component's `r2.generateUploadUrl(ctx, ...)` and
  `r2.delete(ctx, ...)` APIs.
- The `env` field in `section_content` is a data-level concept stored in the database.
  There is only ONE Convex deployment. "Preview" vs "production" content is distinguished by
  this field, not by Convex deployment environments.

---

## Phase 3 — Clerk Auth + proxy.ts

**Goal**: Wire Clerk authentication into `apps/cms`, establish the org-scoped session context,
and implement the `proxy.ts` auth guard for admin routes. All auth must be lightweight.

**Prereqs**: Phase 1 complete. Clerk account + application created with Organizations enabled.

### Tasks

#### 3.1 Install Clerk in `apps/cms`

```bash
pnpm --filter @better-cms/cms add @clerk/nextjs
```

Environment variables required in `apps/cms/.env.local`:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/admin
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/admin
```

#### 3.2 Create `proxy.ts` at `apps/cms/` root

In Next.js 16, `middleware.ts` is replaced by `proxy.ts`. The file is located at the same
level as `app/` (i.e., `apps/cms/proxy.ts`).

```typescript
// apps/cms/proxy.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    await auth.protect();
  }
  // Public routes (including Convex public queries via fetch) pass through.
  // Heavy auth logic (org membership checks, etc.) lives in Server Components and
  // Convex mutations — NOT here.
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

**Critical constraint**: `proxy.ts` is ONLY for routing decisions and lightweight redirects.
No database calls, no Convex queries, no heavy logic. This follows the Next.js 16 proxy
philosophy: the proxy is a routing layer, not a business logic layer.

**Acceptance criteria**:
- Visiting `/admin` without being signed in redirects to `/sign-in`
- Visiting `/admin` while signed in proceeds normally
- Public pages (`/`, `/api/health`) are not affected
- No database calls in `proxy.ts`
- TypeScript strict mode passes with no errors in `proxy.ts`

#### 3.3 Wire ClerkProvider + ConvexProvider in root layout

**`apps/cms/app/layout.tsx`**:
```typescript
import { ClerkProvider } from '@clerk/nextjs';
import { ConvexClientProvider } from '@/components/providers/ConvexClerkProvider';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

**`apps/cms/components/providers/ConvexClerkProvider.tsx`**:
```typescript
'use client';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ConvexReactClient } from 'convex/react';
import { useAuth } from '@clerk/nextjs';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
```

**Acceptance criteria**:
- Clerk auth state available in all Client Components via `useUser()` / `useAuth()`
- Convex queries with auth work (Clerk JWT automatically attached)
- Public Convex queries work without any auth headers

#### 3.4 Create admin layout with org guard

**`apps/cms/app/(auth)/admin/layout.tsx`**:
```typescript
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }) {
  const { orgId, userId } = await auth();
  
  if (!userId) redirect('/sign-in');
  if (!orgId) redirect('/select-org'); // Clerk's built-in org selection page
  
  return (
    <div className="min-h-screen flex">
      <AdminSidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

**Acceptance criteria**:
- User with no org membership redirected to org selection
- User with org membership sees admin shell
- `orgId` available for all Convex mutations in admin routes

#### 3.5 Create sign-in and sign-up pages

Create `apps/cms/app/sign-in/[[...sign-in]]/page.tsx` and
`apps/cms/app/sign-up/[[...sign-up]]/page.tsx` using Clerk's hosted components.

**Acceptance criteria**:
- Sign in / sign up flows work end-to-end
- After auth, user lands at `/admin`

**Gotchas for Phase 3**:
- In Next.js 16, the file is `proxy.ts` NOT `middleware.ts`. Using the wrong filename means
  no auth guard at all — verify with `pnpm build` output that the proxy is being picked up.
- `auth.protect()` in `clerkMiddleware` is synchronous-seeming but async — always `await` it.
- Clerk's `organizationSyncOptions` can be configured in `clerkMiddleware` to automatically
  activate the correct org based on URL slug. Consider this for Phase 4 when org-scoped URLs
  are needed, but do not over-engineer it in Phase 3.
- `ConvexProviderWithClerk` from `convex/react-clerk` is the correct integration. Do NOT use
  `ConvexProvider` directly alongside Clerk — auth token will not be attached to Convex calls.
- The `select-org` redirect path assumes Clerk's default org selector. If using a custom org
  selector, update the redirect target accordingly.

---

## Phase 4 — CMS Admin UI

**Goal**: Build all admin routes with dynamic forms driven by `section_registry`, an environment
toggle, and R2-backed media management. The UI must be fully functional for a CMS admin user
to create/edit content for any registered section type.

**Prereqs**: Phase 2 (schema + Convex functions), Phase 3 (auth).

### Tasks

#### 4.1 `/admin` — Project overview page

**`apps/cms/app/(auth)/admin/page.tsx`** (Server Component):

- Fetches all `projects` for the current `orgId` using Convex `preloadQuery` (Server Component
  pattern) or client-side `useQuery` from a Client Component child
- Displays `ProjectCard` for each project: name, slug, primary color swatch, link to project
  dashboard
- "New Project" button opens a dialog with project creation form

**Components**:
- `components/admin/ProjectCard.tsx` — project card with color swatch
- `components/admin/CreateProjectDialog.tsx` — dialog with name + slug fields

**Acceptance criteria**:
- Page loads and shows all projects for the authenticated org
- Creating a new project persists to Convex and appears immediately (realtime)
- Project cards link to `/admin/[projectId]`

#### 4.2 `/admin/[projectId]` — Project dashboard + env toggle

**Components required**:
- `components/admin/EnvToggle.tsx` — a client component that stores selected env
  (`"production"` | `"preview"`) in a URL search param (`?env=production`) or React state.
  The env selection must propagate to all child pages/components that read content.

**Env toggle design**:
The selected env is stored in the URL: `/admin/[projectId]?env=production`. This makes
the env context bookmarkable and shareable. All `sectionContent` queries in child pages
read `env` from `searchParams`.

**Page content**:
- Project name + settings (edit primary color, favicon URL via media picker)
- Env toggle: `production` | `preview` (default: `production`)
- Quick navigation links to Content and Media sub-pages
- Stats: count of registered sections, count of media files

**Acceptance criteria**:
- Env toggle updates URL and all child content queries reflect the selected env
- Project settings editable (name, primaryColor, faviconUrl)
- Switching between projects maintains the last-used env per project (stored in URL)

#### 4.3 `/admin/[projectId]/content` — Section list

**Page**: Lists all sections registered in `section_registry` for this project.

Each row shows:
- `sectionType` slug
- `label` (human-readable name)
- Field count (parsed from `fieldsSchema`)
- Link to edit: `/admin/[projectId]/content/[type]`

**Acceptance criteria**:
- All registered sections visible
- Empty state with helpful message: "No sections registered yet. Deploy your client app to register sections."
- Sections linked to their edit pages

#### 4.4 `/admin/[projectId]/content/[type]` — Section content editor

This is the most complex page. It renders a dynamic form based on the `fieldsSchema` stored
in `section_registry`.

**Architecture**:

1. Load `section_registry` record for `{ projectId, sectionType }` — get `fieldsSchema`
2. Load `section_content` for `{ projectId, sectionType, env }` — get `items` array
3. Render each item using `DynamicFieldRenderer`

**`components/admin/DynamicFieldRenderer.tsx`**:

Receives a parsed `FieldDefinition[]` and an `item` object. Renders the appropriate
shadcn/ui input for each field:

| Field type token | Rendered input |
|-----------------|----------------|
| `string`        | `<Input>` |
| `string.multiline` | `<Textarea>` |
| `number`        | `<Input type="number">` |
| `boolean`       | `<Switch>` |
| `image`         | `<MediaPicker>` (custom, shows R2 media grid, returns URL) |

Field types are driven by the `fieldsSchema` JSON. The renderer must be resilient to unknown
field types (render a plain text input as fallback).

**`FieldDefinition` TypeScript type** (shared between Phase 4 and Phase 5):
```typescript
interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'image';
  label?: string;
  optional?: boolean;
  multiline?: boolean;   // only for type === 'string'
  default?: string | number | boolean;
}
```

This type must be defined in ONE canonical location. Recommendation: define it in
`packages/cms-client/src/types.ts` and re-export it from both the package and
reference it directly from the `apps/cms` workspace via the pnpm workspace link.

**Acceptance criteria**:
- Editing an item in a section saves to Convex and reflects immediately (realtime)
- Adding / removing items works
- Switching env (via URL param) shows different content for `production` vs `preview`
- `image` fields open a media picker modal populated with R2 media for the project
- Form validation respects `optional` flag: required fields show error if empty on save
- `multiline` string fields render as textarea
- Number fields with `default` pre-fill the default value for new items

#### 4.5 `/admin/[projectId]/media` — Media management

**Architecture**:
1. List all `media` records for the project (query by `orgId + projectId`)
2. Upload flow: call `generateUploadUrl` mutation → get presigned R2 URL → PUT file directly
   to R2 from browser → call `recordUpload` mutation to persist metadata
3. Delete flow: call `media.remove` mutation which calls `r2.delete` then removes the record

**`components/admin/MediaUploader.tsx`**:
- Dropzone (use `react-dropzone`)
- Shows upload progress (track via local state, not Convex)
- After upload completes: optimistically adds to media grid
- Accepts image types only for now (`image/*`)

**Media grid**:
- Thumbnail grid of all uploaded images
- Click to copy URL to clipboard
- Delete button with confirmation dialog

**Acceptance criteria**:
- File uploads to R2 successfully (verify in Cloudflare R2 dashboard)
- `media` table record created with correct metadata
- Deleted files removed from both R2 and `media` table
- Media picker in DynamicFieldRenderer shows same grid, returns selected file URL

**Gotchas for Phase 4**:
- The `env` toggle must be a URL param, NOT React context or local state. This ensures that
  the admin can share a link to preview content with a colleague.
- `fieldsSchema` is stored as a JSON string. Always use `JSON.parse` with a try/catch. If
  parsing fails, show an error state rather than crashing the page.
- R2 direct upload (browser → R2) requires the R2 bucket CORS policy to allow `PUT` requests
  from the CMS domain. This is a deployment configuration step, not a code step — document it
  in `docs/DEPLOYMENT.md`.
- The `image` type field in the CMS editor should store the full CDN URL of the R2 file as the
  field value. Do not store the R2 key — store the public URL directly so `cms-client` can
  use it without a lookup.
- Media uploads are NOT atomic with Convex mutations. If the R2 PUT succeeds but `recordUpload`
  fails, the file is orphaned in R2. Add a cleanup note to `docs/DEPLOYMENT.md`. Consider a
  periodic Convex cron job to reconcile orphaned R2 files (deferred to Phase 6).

---

## Phase 5 — NPM Package: `cms-client`

**Goal**: Build the complete `packages/cms-client` package with full TypeScript type inference,
including `createCMSClient`, `defineCMSSection`, the custom `z` namespace, `useSection`, and
`registerSections`. Client Next.js 16 projects should get end-to-end type safety from section
field definitions through to rendered data.

**Prereqs**: Phase 2 (Convex functions defined), Phase 3 (orgSlug pattern established),
Phase 4's `FieldDefinition` type finalized.

### Tasks

#### 5.1 Custom `z` namespace — `src/z.ts`

The `z` namespace is NOT Zod. It is a custom DSL that mirrors the feel of Zod but produces
`FieldDefinition` objects that can be serialized to JSON and stored in `section_registry`.

**Design rationale**: Zod schemas cannot be serialized to JSON directly. By building a thin
custom `z` namespace that returns plain `FieldDefinition` objects, we get:
1. Familiar API for client developers
2. JSON-serializable output (critical for storage in Convex)
3. Full TypeScript type inference from field definitions

**`src/z.ts`** — partial implementation sketch:

```typescript
type StringFieldDef = FieldDefinition & { type: 'string'; _tsType: string };
type NumberFieldDef = FieldDefinition & { type: 'number'; _tsType: number };
type BooleanFieldDef = FieldDefinition & { type: 'boolean'; _tsType: boolean };
type ImageFieldDef = FieldDefinition & { type: 'image'; _tsType: string };

interface StringBuilder {
  optional(): StringFieldDef & { optional: true; _tsType: string | undefined };
  multiline(): StringBuilder & { _def: { multiline: true } };
  label(label: string): StringBuilder;
  _build(name: string): StringFieldDef;
}

export const z = {
  string(): StringBuilder { ... },
  number(): NumberBuilder { ... },
  boolean(): BooleanFieldDef { ... },
  image(): ImageFieldDef { ... },
};
```

**Type inference from field defs to output type**:

The key design challenge is mapping a `FieldDefinition[]` to a TypeScript object type.
This requires a mapped type utility:

```typescript
type InferSectionItem<T extends Record<string, AnyFieldDef>> = {
  [K in keyof T]: T[K]['_tsType']
};
```

**Acceptance criteria**:
- `z.string()` returns a builder where `._build('name')` produces a valid `FieldDefinition`
- `z.string().optional()` correctly marks the field optional and the inferred TS type is
  `string | undefined`
- `z.image()` produces a field that the CMS renders as a media picker and the client receives
  as a `string` URL
- `z.number().default(0)` produces a field with `default: 0` in the `FieldDefinition`
- The entire `z` namespace has zero runtime dependencies beyond TypeScript itself

#### 5.2 `defineCMSSection` — `src/defineSection.ts`

```typescript
import { z, AnyFieldDef } from './z';
import { FieldDefinition } from './types';

interface SectionDefinition<
  TName extends string,
  TFields extends Record<string, AnyFieldDef>
> {
  name: TName;
  label: string;
  fields: TFields;
  // Derived at definition time:
  _fieldsArray: FieldDefinition[];
  _type: InferSectionItem<TFields>;
}

export function defineCMSSection<
  TName extends string,
  TFields extends Record<string, AnyFieldDef>
>(config: {
  name: TName;
  label: string;
  fields: TFields;
}): SectionDefinition<TName, TFields> {
  const fieldsArray = Object.entries(config.fields).map(([name, builder]) =>
    builder._build(name)
  );
  return {
    ...config,
    _fieldsArray: fieldsArray,
    _type: undefined as any, // phantom type only
  };
}
```

**Usage example** (client project):
```typescript
const heroSection = defineCMSSection({
  name: 'hero',
  label: 'Hero Banner',
  fields: {
    title: z.string().label('Heading'),
    subtitle: z.string().optional(),
    backgroundImage: z.image(),
    ctaText: z.string().label('CTA Button Text'),
    isFullWidth: z.boolean(),
  },
});
```

**Acceptance criteria**:
- `defineCMSSection` returns a typed `SectionDefinition`
- `_fieldsArray` is serializable to JSON (no function values)
- TypeScript infers field types correctly when inspecting `.fields`

#### 5.3 `createCMSClient` factory — `src/client.ts`

```typescript
import { ConvexReactClient } from 'convex/react';
import { SectionDefinition } from './defineSection';

interface CMSClientOptions {
  convexUrl: string;
  orgSlug: string;
  projectSlug: string;
}

interface CMSClient {
  _convex: ConvexReactClient;
  _options: CMSClientOptions;
  registerSections: (sections: SectionDefinition<any, any>[]) => Promise<void>;
  useSection: <TDef extends SectionDefinition<any, any>>(
    section: TDef,
    options?: { env?: 'production' | 'preview' }
  ) => InferSectionItem<TDef['fields']>[] | undefined;
}

export function createCMSClient(options: CMSClientOptions): CMSClient {
  const convex = new ConvexReactClient(options.convexUrl);
  return {
    _convex: convex,
    _options: options,
    registerSections: ...,
    useSection: ...,
  };
}
```

**Acceptance criteria**:
- `createCMSClient` returns a `CMSClient` object with `registerSections` and `useSection`
- The `convexUrl` connects to the same Convex deployment as `apps/cms`
- `orgSlug` and `projectSlug` are stored on the client instance and passed to all queries

#### 5.4 `registerSections` — `src/server/registerSections.ts`

This is a Server Component function. When called, it writes to `section_registry` via a
Convex mutation. It should be called once per project during the Next.js build or in a
Server Component that runs at startup.

**Implementation approach**:
- Use Convex's `fetchMutation` (HTTP-based, works in Server Components without a React client)
- `fetchMutation` requires a Convex deployment URL and a Convex auth token (or anonymous
  for public mutations)
- The `upsert` mutation in `sectionRegistry.ts` must be publicly callable (no auth guard)
  with `orgSlug` as the identifier, OR the client project must provide an API key

**Design decision — public vs authenticated `registerSections`**:
- Option A (public): `sectionRegistry.upsert` requires `orgSlug` only. Any caller who knows
  the org slug can overwrite section schemas. This is acceptable since section schemas are
  not sensitive — they are structural definitions, not content.
- Option B (token): The client project is given a Convex deploy key in their env vars and
  calls a guarded mutation. More secure but more setup friction.

**Recommendation**: Use Option A (public upsert with `orgSlug`) for Phase 5. Document the
security trade-off in `docs/CMS_CLIENT_API.md`. Revisit in Phase 6 if needed.

**Acceptance criteria**:
- `cms.registerSections([heroSection, teamSection])` runs in a Next.js Server Component
- The `section_registry` table in Convex is updated with the correct `fieldsSchema` JSON
- Calling `registerSections` is idempotent (upserts, does not duplicate)
- Works without a React context (uses `fetchMutation`, not `useMutation`)

#### 5.5 `useSection` hook — `src/hooks/useSection.ts`

```typescript
import { useQuery } from 'convex/react';
import { api } from '../../../apps/cms/convex/_generated/api'; // ← PROBLEM: see gotchas

export function useSection<TDef extends SectionDefinition<any, any>>(
  client: CMSClient,
  section: TDef,
  options: { env?: 'production' | 'preview' } = {}
): InferSectionItem<TDef['fields']>[] | undefined {
  const result = useQuery(api.sectionContent.get, {
    orgSlug: client._options.orgSlug,
    projectSlug: client._options.projectSlug,
    sectionType: section.name,
    env: options.env ?? 'production',
  });
  
  if (!result) return undefined;
  
  // Parse items JSON string from Convex
  const items = JSON.parse(result.items) as unknown[];
  return items as InferSectionItem<TDef['fields']>[];
}
```

**The API import problem**: `cms-client` cannot import from `apps/cms/convex/_generated/api`
because it is a separate package. The generated API types are tightly coupled to one Convex
deployment.

**Solution**: The `api` object must be passed in by the client project. Two approaches:

- **Approach A** (recommended): `useSection` accepts the Convex `api` object as a parameter
  at the point where `createCMSClient` is called:
  ```typescript
  createCMSClient({ convexUrl, orgSlug, projectSlug, api })
  ```
  The client project imports its own generated `api` and passes it in.

- **Approach B**: `cms-client` re-exports generic query utilities (using Convex's
  `makeFunctionReference`) with hardcoded function paths as strings. This avoids needing
  to pass the `api` object but loses compile-time function reference checking.

**Recommendation**: Use Approach A. Document in `docs/CMS_CLIENT_API.md` that clients must
pass their own `api` object. The Convex deployment for `cms-client` usage is the same
deployment as `apps/cms` — clients connect directly to it.

**Updated `createCMSClient` signature**:
```typescript
import type { FunctionReference } from 'convex/server';

interface CMSClientOptions {
  convexUrl: string;
  orgSlug: string;
  projectSlug: string;
  queries: {
    getSectionContent: FunctionReference<'query'>;
  };
  mutations: {
    upsertSectionRegistry: FunctionReference<'mutation'>;
  };
}
```

**Acceptance criteria**:
- `useSection(heroSection)` returns `Array<{ title: string; subtitle?: string; backgroundImage: string; ctaText: string; isFullWidth: boolean }>` — fully typed
- Returns `undefined` while loading (Convex query pending)
- Updates in realtime when content changes in the CMS admin
- TypeScript catches field name typos: `item.titlee` is a type error

#### 5.6 Package barrel export — `src/index.ts`

```typescript
export { createCMSClient } from './client';
export type { CMSClient, CMSClientOptions } from './client';
export { defineCMSSection } from './defineSection';
export type { SectionDefinition } from './defineSection';
export { z } from './z';
export type { AnyFieldDef, FieldDefinition } from './types';
```

**Server-only exports** in `src/server/index.ts`:
```typescript
export { registerSections } from './registerSections';
```

**Acceptance criteria**:
- `import { createCMSClient, defineCMSSection, z } from 'cms-client'` works in a client project
- `import { registerSections } from 'cms-client/server'` works in a Server Component
- No server-only code (node: imports, `'use server'` functions) leaks into the main bundle
- `pnpm --filter cms-client build` produces all exports correctly

#### 5.7 Integration test — connect to live Convex

Create a minimal test Next.js project or use a fixture within the monorepo to validate:
1. `registerSections` writes to `section_registry`
2. `useSection` subscribes and returns typed data
3. Editing content in the CMS admin causes `useSection` to re-render with new data

**Acceptance criteria**:
- End-to-end realtime update demonstrated (admin edit → client re-render in < 500ms)
- TypeScript strict mode passes in the test consumer project

**Gotchas for Phase 5**:
- The `_tsType` phantom property on `FieldDefinition` must NOT appear in the serialized
  `_fieldsArray`. It is a TypeScript-only fiction. Use `Omit` or a type assertion to strip it
  before JSON serialization.
- `useQuery` from `convex/react` requires a `ConvexProvider` ancestor in the React tree. The
  client project must wrap their app in `<ConvexProvider client={convex}>`. Document this in
  `docs/CMS_CLIENT_API.md`.
- The `items` JSON string from Convex must be validated on parse. If the stored JSON does not
  match the field definitions, silently return an empty array rather than throwing, and log
  a warning.
- Tree-shaking: the server module (`registerSections`) must not import from `convex/react`
  (which is browser-only). Keep the server barrel completely separate.
- The `env` parameter in `useSection` defaults to `'production'`. Client projects in
  staging environments must explicitly pass `env: 'preview'` — document this clearly.

---

## Phase 6 — Final Pass

**Goal**: Ensure all documentation is accurate, all edge cases handled, all hard constraints
verified, and the system is ready for real-world use. No new features — only hardening,
documentation, and cleanup.

**Prereqs**: All of Phases 0–5 complete and passing.

### Tasks

#### 6.1 CLAUDE.md final update

Update CLAUDE.md to reflect the completed system:
- All phase checkboxes marked complete
- Exact package versions pinned (run `pnpm list` to capture them)
- Known issues and workarounds section
- Common gotchas encountered during build (distilled from phase notes)
- Convex function names and their access control status (public/guarded)
- How to add a new section type to a client project (3-step guide)
- How to onboard a new client org (Clerk org creation + first project creation)

#### 6.2 Update all /docs files

**`docs/ARCHITECTURE.md`** — fill in all sections completely:
- System context diagram (prose description if ASCII art not feasible)
- Component descriptions for `apps/cms`, `packages/cms-client`, Convex, Clerk, R2, Polar
- Data flow for the critical paths:
  1. Client project startup → `registerSections` → Convex `section_registry` write
  2. CMS admin edit → Convex `section_content` mutation → realtime push → client re-render
  3. Media upload → R2 signed URL → direct browser PUT → `recordUpload` mutation
- Security model: orgId isolation, public query access pattern, `proxy.ts` scope

**`docs/CONVEX_SCHEMA.md`** — final schema with:
- All tables, fields, types
- All indexes and their query patterns
- Access control for every function (public / requires orgId)
- JSON shapes for `fieldsSchema` and `items` with examples

**`docs/CMS_CLIENT_API.md`** — complete API reference:
- `createCMSClient` — all options, required vs optional
- `defineCMSSection` — field definition API
- `z.*` — all builders, their TypeScript output types, CMS rendering
- `cms.registerSections` — when to call, idempotency, Server Component requirement
- `cms.useSection` — return type, loading state, env option
- Full example: hero section definition → CMS content → typed client data
- Provider setup requirements (`ConvexProvider` wrapper)

**`docs/DEPLOYMENT.md`** — complete deployment guide:
- Convex project creation and deploy key setup
- Convex environment variables (R2 credentials, Polar webhook secret)
- Clerk application setup: Organizations enabled, allowed redirect URLs
- Vercel deployment: env vars, build command (`pnpm build --filter @better-cms/cms`)
- Cloudflare R2: bucket creation, CORS policy for CMS domain, public access setup
- Polar: product creation, webhook endpoint registration (`/api/polar/events`)
- How to provision a new client org: step-by-step checklist
- R2 orphaned file cleanup process

#### 6.3 Polar webhook stub → real handler

Complete the Polar webhook handler at `apps/cms/app/api/polar/events/route.ts`:

```typescript
import { polar } from '@/lib/polar'; // initialize Polar component client
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  return polar.handleWebhook(req);
}
```

This wires up the Polar component's subscription event handling so that billing data stays
in sync. No UI is built. The handler is ready for when billing UI is added.

**Acceptance criteria**:
- Polar webhook endpoint returns 200 for valid events
- Polar subscription events update Convex tables correctly
- No billing UI exposed anywhere

#### 6.4 Security audit

Verify every Convex function:

| Function | Expected Access | Check |
|----------|----------------|-------|
| `projects.getBySlug` | Public | Accessible without auth token |
| `projects.create` | guarded | Rejects without valid Clerk JWT |
| `projects.update` | guarded | Rejects if orgId mismatch |
| `sectionRegistry.getByProject` | Public | Accessible without auth token |
| `sectionRegistry.upsert` | Semi-public (orgSlug) | Accepts orgSlug, no JWT needed |
| `sectionRegistry.remove` | guarded | Rejects without valid Clerk JWT |
| `sectionContent.get` | Public | Accessible without auth token |
| `sectionContent.set` | guarded | Rejects without valid Clerk JWT |
| `sectionContent.append` | guarded | Rejects without valid Clerk JWT |
| `sectionContent.remove` | guarded | Rejects without valid Clerk JWT |
| `media.generateUploadUrl` | guarded | Rejects without valid Clerk JWT |
| `media.recordUpload` | guarded | Rejects without valid Clerk JWT |
| `media.list` | Public | Accessible without auth token |
| `media.remove` | guarded | Rejects without valid Clerk JWT |

**Acceptance criteria**:
- All guarded functions tested manually with a request missing auth header
- All public functions tested with no auth header and return correct data
- Cross-org access tested: Clerk JWT from Org A cannot write to Org B's data

#### 6.5 End-to-end smoke test checklist

Run through the following scenarios manually:

1. Create a new Clerk org → log into CMS → `/admin` shows empty state
2. Create a new project → verify in Convex dashboard
3. Deploy a test client project using `cms-client` with a hero section definition
4. Verify `section_registry` populated in Convex dashboard
5. Edit hero section content in CMS admin → verify client renders new content in realtime
6. Toggle env to `preview` → edit preview content → verify client does NOT see it unless
   `env: 'preview'` passed
7. Upload a media file → verify R2 upload + `media` table record
8. Use media picker in section editor → select image → verify URL stored in `section_content`
9. Delete a media file → verify removed from R2 and `media` table
10. Sign in as a different org → verify cannot see first org's projects

**Acceptance criteria**:
- All 10 scenarios pass
- No console errors during any scenario
- TypeScript strict mode: `pnpm type-check` passes from root with zero errors

#### 6.6 `cms-client` package publish readiness

- `README.md` in `packages/cms-client` with full quickstart example
- `CHANGELOG.md` generated by Changesets
- `package.json` `"version"` at `"0.1.0"`
- `"files"` array in `package.json` excludes `src/`, `*.test.ts`, `tsup.config.ts`
- License field set

**Acceptance criteria**:
- `pnpm changeset publish --dry-run` shows the correct files that would be published
- `dist/` directory contains expected files: `index.js`, `index.mjs`, `index.d.ts`,
  `server/index.js`, `server/index.mjs`, `server/index.d.ts`

**Gotchas for Phase 6**:
- Polar webhook validation requires the raw request body. Ensure the webhook handler reads
  the raw body, not `req.json()`, to avoid signature validation failures.
- The `docs/DEPLOYMENT.md` R2 CORS section is critical — missing it will cause silent upload
  failures for new deployments. Make this the most prominent warning in the doc.
- `pnpm type-check` from root runs type checking on ALL workspaces. It will fail if
  `packages/cms-client` has unresolved types from `convex/react` (which is a peer dep).
  Ensure all peer deps are listed in `devDependencies` as well for local type-checking.

---

## Hard Constraints Reference

The following constraints are non-negotiable and must be preserved across all phases.
Any deviation requires explicit documentation and justification.

| # | Constraint | Where Enforced |
|---|-----------|----------------|
| 1 | `proxy.ts` only (no `middleware.ts`) | `apps/cms/proxy.ts` — must be lightweight only |
| 2 | Clerk Organizations = one org per client | Clerk dashboard + `requireOrgId` in Convex |
| 3 | Dual env via `section_content.env` field | Convex schema + all content queries |
| 4 | No REST API — Convex only | No `app/api/` routes except Polar webhook |
| 5 | No pages, slugs, or metadata in CMS | Convex schema has none of these fields |
| 6 | No hardcoded section types | `section_registry` is the source of truth |
| 7 | All Convex mutations protected by `orgId` | `requireOrgId` in every mutation |
| 8 | Public reads: `orgSlug` only, no auth | All public queries accept `orgSlug` as arg |
| 9 | R2 only for file storage | `ctx.storage` never used; R2 component only |
| 10 | Polar: component now, UI deferred | `convex.config.ts` wires it; no UI in Phase 6 |
| 11 | CLAUDE.md + /docs updated every phase | Phase completion checklist in CLAUDE.md |

---

## Key Architectural Decisions & Rationale

### proxy.ts instead of middleware.ts
Next.js 16 renamed `middleware.ts` to `proxy.ts` to better reflect its role as a lightweight
routing layer. The hard constraint to keep it lightweight means: no Convex queries, no heavy
auth checks, no business logic. Org-level authorization lives in Convex mutations via
`requireOrgId` and in Server Component layouts via `auth()`.

### Single Convex deployment, `env` field for content environments
Rather than provisioning separate Convex projects per client (which would require separate
deploy keys, billing, and operational overhead), a single Convex deployment serves all clients.
The `env` field in `section_content` is a first-class data concept, not an infrastructure
concept. This simplifies operations dramatically while maintaining the preview/production
content separation that CMS clients expect.

### `fieldsSchema` and `items` stored as JSON strings
Using `v.string()` for these fields rather than Convex's nested validator types (`v.array(v.object(...))`) keeps the Convex schema stable even as section definitions evolve. Field shape
validation is the responsibility of the application layer — the CMS editor validates on write,
and `cms-client` validates on read. This avoids frequent schema migrations for what is
essentially a schema-on-read content store.

### `section_registry` and `section_content` as separate tables
Separating schema (registry) from data (content) means:
- A section can be registered without having any content yet (valid state)
- The registry can be inspected independently for building the CMS admin form UI
- Content can be queried without knowing the schema (raw JSON), which is useful for
  migration scripts and analytics

### Custom `z` namespace instead of real Zod
Real Zod schemas are not JSON-serializable. By building a thin custom `z` DSL that returns
plain `FieldDefinition` objects, we achieve: familiar API, JSON serializability, and full
TypeScript inference — the three requirements that Zod alone cannot satisfy simultaneously.

### `useSection` returns typed data without a code generator
The type inference chain is:
```
defineCMSSection({ fields: { title: z.string() } })
  → SectionDefinition<'hero', { title: StringFieldDef }>
    → InferSectionItem<{ title: StringFieldDef }>
      → { title: string }
```
This is purely compile-time inference. No codegen, no build step, no schema introspection at
runtime. The `_tsType` phantom property on each field builder carries the TypeScript type
without emitting any runtime value.

---

## Open Questions & Deferred Work

| Item | Deferred To | Notes |
|------|-------------|-------|
| Polar billing UI | Post-Phase 6 | Component wired, webhook active, no UI surfaces |
| R2 orphaned file reconciliation cron | Post-Phase 6 | Document in DEPLOYMENT.md as known gap |
| Multi-image field type (`z.imageArray()`) | Post-Phase 6 | Defer until needed by a real client |
| Rich text field type (`z.richText()`) | Post-Phase 6 | Requires portable text or markdown decision |
| `registerSections` auth (Option B — token) | Evaluate post-Phase 5 | May be needed for sensitive section schemas |
| Client-side ConvexProvider wrapping | Phase 5 consumer docs | Must document clearly in CMS_CLIENT_API.md |
| Vercel Edge Runtime compatibility | Phase 6 | Verify proxy.ts works on Edge; clerkMiddleware supports it |
| Rate limiting on public queries | Post-Phase 6 | Convex does not currently support per-query rate limits |
| `defineCMSSection` type for list vs singleton | Phase 5 | Default behavior: all sections are lists of items. Singleton support (max 1 item) is a Phase 5 stretch goal. |

---

*End of PLAN.md*
