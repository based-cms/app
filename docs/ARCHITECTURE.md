# ARCHITECTURE.md — Based CMS

> Last updated: 2026-02-27 (Phase 5 complete)

---

## System Overview

Based CMS is a two-part system:

1. **`apps/cms`** — a central multi-tenant CMS deployed once to Vercel. All clients share this
   single deployment. Auth and data isolation are handled via Clerk Organizations + Convex `orgId`.

2. **`packages/cms-client`** — an NPM package installed by client Next.js 16 projects. It
   connects directly to Convex (no REST layer), lets clients define their own content sections,
   and returns realtime fully-typed data via React hooks.

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Turborepo Monorepo                           │
│                                                                     │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐   │
│  │      apps/cms           │    │    packages/cms-client       │   │
│  │  Next.js 16 App Router  │    │    NPM package (tsup)        │   │
│  │  Vercel — 1 deployment  │    │                              │   │
│  │                         │    │  createCMSClient(...)        │   │
│  │  Clerk Auth (Org-scoped)│    │  defineCMSSection(...)       │   │
│  │  /admin/** → guarded    │    │  z.string() / z.image()...   │   │
│  │                         │    │  cms.registerSections(...)   │   │
│  │                         │    │  useSection(section)         │   │
│  └────────────┬────────────┘    └──────────────┬───────────────┘   │
│               │                                │                   │
│               └──────────────┬─────────────────┘                   │
│                              │                                     │
│                       ┌──────▼──────┐                              │
│                       │   Convex    │                              │
│                       │  1 project  │                              │
│                       │             │                              │
│                       │  projects   │                              │
│                       │  section_   │                              │
│                       │  registry   │                              │
│                       │  section_   │                              │
│                       │  content    │                              │
│                       │  media      │                              │
│                       └──────┬──────┘                              │
│                              │                                     │
│               ┌──────────────┴──────────────┐                     │
│               │                             │                     │
│        ┌──────▼──────┐             ┌────────▼──────┐              │
│        │  Cloudflare │             │  Polar.sh     │              │
│        │     R2      │             │  (schema now, │              │
│        │  (media)    │             │   UI deferred)│              │
│        └─────────────┘             └───────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenancy Model

- Each client = one **Clerk Organization**
- The `orgId` (Clerk Organization ID) is present on every Convex table row
- All Convex mutations verify `orgId` from the authenticated Clerk session
- All Convex queries filter by `orgId` — cross-org data leakage is impossible at the query level
- The admin (developer) creates orgs and invites clients by email — clients need no GitHub account

### Public Read Flow (no auth required)

Client Next.js projects read CMS content without authentication:

```
useSection(teamSection)   (from 'cms-client/react')
  → Convex query: sectionContent.getPublic
  → finds project by orgSlug (public identifier, from CMSProvider context)
  → returns items for (projectId, sectionType, env)
```

`orgSlug` is a public-safe identifier. It does NOT expose the `orgId` (internal Clerk ID).

---

## Dual Environment Model

Each `section_content` document has `env: "production" | "preview"`.

- The CMS header always shows an **Environment Toggle** (`Prod / Dev`)
- The toggle sets `targetEnv` in client state (React context or URL param)
- All reads and writes go through the selected `env` value
- `section_registry` is **environment-agnostic** — schema definitions apply to both envs
- This is a data-level concept within **one Convex deployment** — not separate projects

```
Client project A
├── section_content { sectionType: "team", env: "production", items: [...] }
└── section_content { sectionType: "team", env: "preview",    items: [...] }
```

---

## Data Flow: Content Editing

```
1. Client Next.js project boots
2. cms.registerSections([teamSection, faqSection])
   → ConvexHttpClient → Convex mutation: sectionRegistry.upsertPublic
   → authenticated by registrationToken (from BASED-CMS-KEY, resolved via by_token index)
   → writes { orgId, projectId, sectionType, label, fieldsSchema } per section

3. CMS admin visits /admin/[projectId]/content
   → reads section_registry for this project
   → renders a list of registered section types

4. Admin clicks on "Team Members"
   → /admin/[projectId]/content/team
   → reads section_content for (projectId, "team", currentEnv)
   → renders dynamic form from fieldsSchema (JSON-parsed)

5. Admin edits an item and blurs
   → auto-save: Convex mutation sectionContent.setItems
   → updates section_content document

6. useSection(teamSection) in client Next.js (from 'cms-client/react')
   → Convex subscription fires with new data
   → React component re-renders with latest content
```

---

## Data Flow: File Upload (Files Tab)

```
1. Admin navigates to /admin/[projectId]/files
2. Optional: create nested folders (folders table, path-based hierarchy)
3. Admin selects file(s) — dropped or via uploader — from current folder path
4. Client calls Convex action media.generateUploadUrl
   → returns { uploadUrl (S3 presigned PUT), r2Key, publicUrl (CDN URL) }
5. Browser PUTs file directly to R2 S3 endpoint (uploadUrl)
6. On success: Convex mutation media.create writes index row
   { orgId, projectId, r2Key, url (publicUrl), filename, mimeType, size, uploadedAt, folder }
7. File appears in current folder; URL available for copy-paste into image fields
```

Files can be renamed, moved between folders, or deleted. Folder renames cascade to all
contained files and subfolders in a single Convex mutation.

---

## Convex Schema

See `apps/cms/convex/schema.ts` for canonical definition. Summary:

| Table | Purpose | Key Indexes |
|-------|---------|------------|
| `projects` | One per org — stores slug, branding, registration token | `by_slug`, `by_token` |
| `section_registry` | Schema definitions per section type | `by_project_type` |
| `section_content` | Actual content per section + env | `by_project_type_env` |
| `media` | R2 file index (with optional `folder` path) | `by_project`, `by_project_folder` |
| `folders` | Nested folder hierarchy for media | `by_project`, `by_project_parent` |

---

## Auth Guard: proxy.ts

`apps/cms/proxy.ts` — Next.js 16 pattern (replaces deprecated `middleware.ts`):

```ts
export function proxy(request: NextRequest) {
  const session = request.cookies.get('__session')
  if (!session && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }
  return NextResponse.next()
}
```

- Lightweight cookie check only — no JWT verification in proxy
- Full auth (Clerk `auth()`, org membership check) happens in Server Components and Actions
- Never add business logic or database calls to proxy.ts

---

## Package: cms-client

The NPM package (`packages/cms-client`) provides two entry points:

### `cms-client` (server-safe, no `'use client'`)

| Export | Description |
|--------|-------------|
| `createCMSClient` | Factory — returns `{ registerSections }` |
| `defineCMSSection` | Define a section with typed fields |
| `z` | Field type helpers (string, number, boolean, image) |
| `parseKey` | Parse a `bcms_` key into its parts |
| `buildKey` | Build a `bcms_` key from parts |

### `cms-client/react` (client components only, has `'use client'`)

| Export | Description |
|--------|-------------|
| `CMSProvider` | Wraps app with Convex + CMS context |
| `useSection` | React hook — realtime, fully typed |

### Type Inference

```ts
const teamSection = defineCMSSection({
  name: 'team',
  label: 'Team Members',
  fields: {
    name:  z.string().label('Full Name'),   // → string
    bio:   z.string().optional(),           // → string | undefined
    image: z.image(),                       // → string (URL)
    order: z.number().default(0),           // → number (never undefined)
  }
})

const team = cms.useSection(teamSection)
// → { name: string; bio?: string; image: string; order: number }[]
```

The return type is **fully inferred** from the `fields` object. No manual type declarations.

---

## Deployment Architecture

```
Vercel
└── apps/cms (Next.js 16)
    ├── NEXT_PUBLIC_CONVEX_URL=...
    ├── NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
    └── CLERK_SECRET_KEY=...

Convex Cloud
└── 1 project, 1 deployment
    ├── R2_TOKEN / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
    ├── R2_ENDPOINT / R2_BUCKET
    ├── POLAR_ACCESS_TOKEN
    └── POLAR_WEBHOOK_SECRET

Cloudflare R2
└── 1 bucket — all orgs, all projects, namespaced by r2Key

Client Next.js projects
├── BASED-CMS-SLUG=my-project
└── BASED-CMS-KEY=bcms_<test|live>-<base64>
    (Convex URL derived from key via parseKey — no separate CONVEX_URL needed)
```

---

## What the CMS Does NOT Do

- No routing or URL management — owned by client projects
- No page types or page templates
- No SEO metadata
- No slug management
- No user-facing frontend — purely admin + data layer
