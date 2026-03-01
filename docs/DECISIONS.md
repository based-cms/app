# DECISIONS.md — Based CMS

> Why we made the choices we made. Read this before proposing architectural changes.
> Last updated: 2026-02-27 (Phase 5 complete)

---

## proxy.ts over middleware.ts

**Decision**: Use `proxy.ts` with a named export `proxy` instead of `middleware.ts`.

**Why**: Next.js 16 deprecated `middleware.ts`. The new convention is `proxy.ts` with a named
`proxy` export (not a default export named `middleware`). Using the old pattern causes a
deprecation warning and may break in a future Next.js release.

**Constraint**: `proxy.ts` does lightweight work only — Clerk route protection via
`clerkMiddleware()`/`auth.protect()`, but no database calls, no org membership checks, and no
business logic. Org-level authorization lives in Server Components, Server Actions, and Convex
functions where we have full async context and Clerk `auth()`.

---

## No REST API

**Decision**: Client Next.js projects connect directly to Convex. No REST or tRPC layer.

**Why**: Convex provides realtime subscriptions out of the box. Adding a REST layer would:
1. Require polling or SSE for realtime updates
2. Add another deployment to maintain
3. Break the "install one package and get realtime data" promise of the NPM package

The `cms.useSection()` hook wraps Convex's `useQuery` directly. Data updates in the CMS are
immediately visible in client projects without any cache invalidation logic.

---

## No Pages, Slugs, or Metadata in CMS

**Decision**: The CMS has no concept of pages, URL slugs, or SEO metadata.

**Why**: The CMS is content-only. Routing, URL structure, and metadata are owned entirely by the
client Next.js project. Adding these to the CMS would:
1. Create conflicts with the client project's routing
2. Couple the CMS to a specific URL structure
3. Duplicate functionality that Next.js already handles well

If a client wants a "hero" section on their home page, they define a `heroSection` in their
`sections.ts` file. The CMS stores the content. The client project decides where to render it.

---

## section_registry and section_content as Separate Tables

**Decision**: Schema definitions (what fields a section has) are stored separately from content
(the actual data in those fields).

**Why**:
- **Decoupling**: A client project can update its section schema (add a field) without losing
  existing content. The registry updates; the content stays.
- **CMS rendering**: The CMS reads `section_registry.fieldsSchema` to know what form to render.
  It reads `section_content.items` to know what data to show. These are independent reads.
- **Client package**: `registerSections()` only writes to `section_registry`. It never touches
  `section_content`. No risk of accidentally wiping content on a schema update.

**Alternative considered**: A single table with embedded schema. Rejected because schema changes
would require migrating content documents, and the CMS would need to version each document.

---

## fieldsSchema Stored as JSON String

**Decision**: `section_registry.fieldsSchema` is a `v.string()` (JSON-serialized), not a
structured Convex object.

**Why**:
- Convex's validator types (`v.object`, `v.array`) are not designed for dynamic schemas
- The field definitions are code artifacts (from `defineCMSSection` in client projects)
- Storing as JSON string allows arbitrary field metadata (labels, multiline hints, etc.)
  without pre-defining every possible metadata key in the Convex schema

**Gotcha**: Both the CMS (form rendering) and the client package (type context) must parse this
JSON at runtime. Always use `JSON.parse` with a try/catch. Validate the parsed shape before use.

---

## R2 for All File Storage (Not Convex Native Storage)

**Decision**: All media files use the Convex R2 component (`@convex-dev/r2`), not Convex's
built-in file storage.

**Why**:
- Convex native storage has storage and bandwidth limits on lower-tier plans
- R2 has no egress fees — important for a CMS that may serve many image URLs
- R2 integrates cleanly via the official Convex component with presigned uploads
- All clients share one R2 bucket, namespaced by `r2Key` (which includes `orgId`/`projectId`)

**Implication**: The `media` table in Convex is an **index**, not the source of truth.
The actual files live in R2. If a media row is deleted from Convex, the R2 object must also
be deleted (this is handled by the `media.remove` mutation).

---

## Public Reads Using orgSlug (No Auth)

**Decision**: `cms.useSection()` in client Next.js projects requires no authentication.
The `orgSlug` (a human-readable string like `"kunde-ag"`) is the public identifier.

**Why**:
- Client Next.js projects are public websites. Requiring auth for every CMS content read would
  block anonymous visitors from seeing content.
- `orgSlug` is not secret — it's fine to expose in client-side code.
- The data returned (section content) is intended to be public anyway.

**Security boundary**: Only `orgId` (Clerk's internal ID) is the auth boundary. `orgSlug`
provides lookup capability, not write access. All mutations still require a valid Clerk session
with the correct org membership.

---

## Clerk Organizations for Multi-Tenancy

**Decision**: Use Clerk Organizations (not custom user roles) for multi-tenancy.

**Why**:
- Clerk Organizations map exactly to the "one client = one tenant" model
- Org invitations, member management, and org switching are built into Clerk
- The `orgId` is available in every auth context (server and client)
- No custom role/permission system needed — org membership IS the permission

**Implication**: Clients are invited to their org via email. The developer (admin) is a member
of all orgs. CMS UI shows data for the currently active org in Clerk.

---

## Turborepo + pnpm Workspaces

**Decision**: Use Turborepo with pnpm workspaces.

**Why**:
- `apps/cms` and `packages/cms-client` share TypeScript config and dev tooling
- Turborepo's task pipeline ensures `cms-client` is built before `apps/cms` type-checks
- pnpm workspaces have better monorepo support than npm/yarn for cross-package linking

---

## tsup for Package Bundling

**Decision**: Use `tsup` (not Rollup, esbuild directly, or tsc alone) for `packages/cms-client`.

**Why**:
- Dual CJS + ESM output with one config
- Declaration file generation (`dts: true`) included
- External peer deps (react, next, convex) are trivially excluded
- Tree-shaking works correctly for ESM consumers

---

## Polar: Schema Now, UI Deferred

**Decision**: Integrate the Convex Polar component in `convex.config.ts` now, but build no
subscription UI yet.

**Why**: Setting up the Polar component early means its schema tables (subscriptions,
customers, etc.) are present in Convex from day one. Building the UI later requires only
frontend work — no schema migrations, no component re-installation.

**TODO: Polar UI** — to be built in a future phase:
- Subscription plans page in CMS (show current plan, upgrade/downgrade)
- Usage-based gating (e.g., max N projects per plan tier)
- Webhook handler at `app/api/polar/events/route.ts`
- Customer portal link for self-service billing
- `projects` table: add `planTier: "free" | "pro" | "enterprise"` field

---

## Two Env Vars (SLUG + KEY) for Client Config

**Decision**: Use two env vars — `BASED-CMS-SLUG` (org slug) and `BASED-CMS-KEY` (encoded
Convex deployment + registration secret). The key uses a `bcms_<test|live>-<base64>` format.

**Key format**: `bcms_<test|live>-<base64(deploymentName.SECRET24)>`
- `deploymentName` — Convex deployment name (e.g. `elated-tapir-331`), used to derive the URL
- `SECRET24` — 24-char uppercase alphanumeric registration token
- `test` / `live` prefix maps to `preview` / `production` content environment

**Why two vars instead of one**:
- Keeping `BASED-CMS-SLUG` separate makes it easy to copy/read without parsing base64
- The slug is used in public Convex queries — exposing it explicitly is intentional
- The key encodes only what's needed for the registration call (deployment + secret)

**Why not JSON-in-base64**:
- Simpler format, no JSON parsing for the common path
- The deployment name doubles as the Convex URL (just append the region and domain)
- Avoids a `v` versioning field — format is compact and unambiguous

**Security**: `BASED-CMS-KEY` is intentionally in `.env.local` (not `NEXT_PUBLIC_`). It is
only accessed server-side (in `layout.tsx` for `registerSections`). The `BASED-CMS-SLUG`
can safely be used client-side — it is public-facing. The Convex URL derived from the key
is exposed to browsers via `CMSProvider` props, but that is intentional (it's a public endpoint).

**Registration**: The secret (from the key) is used by `sectionRegistry.upsertPublic` —
a Convex mutation that accepts a `registrationToken` and resolves the project via `by_token`
index. No Clerk session is required. This allows server-side registration from any Next.js
deployment without browser-side auth.

Project owners can regenerate the key at any time from the CMS dashboard to revoke old secrets.

---

## Environment Toggle as Data Field (With Optional Test Deployment)

**Decision**: The `production`/`preview` distinction is modeled as `section_content.env`.
Current admin tooling can additionally target an optional test Convex deployment for content
editing, while keeping the same env semantics in each deployment.

**Why**:
- `env` remains a clear content-model primitive (`production` vs `preview`)
- `section_registry` stays shared within a deployment — only content differs by env
- Optional test deployment support enables safer editing/migration workflows
- The client package API remains stable (`CMSProvider` + `useSection`)

**Operational note**: if no test deployment URL is configured, the system behaves as a
single-deployment setup.

---

## Invite-Only Now, Self-Service Later

**Decision**: Phase 1–5 are built invite-only — the developer creates all Clerk orgs manually.
Clerk is configured with "max orgs per user = 0" to prevent clients from creating their own.

**Why**: Keeps the initial deployment simple and controlled. No onboarding UX, no billing gates,
no abuse surface while the product is in early access.

**The architecture already supports self-service** — no schema or auth changes are needed to
flip to public sign-up. When ready, the transition is:

1. **Clerk**: set "max orgs per user" to `1`
2. **Onboarding**: add `/onboarding` page — prompt new users to name their workspace and
   create their first project (replaces manual org creation by developer)
3. **Billing**: activate Polar UI (already integrated in schema, see `convex/polar.ts`) —
   gate features by plan tier (free: N projects, pro: unlimited, etc.)
4. **Superadmin**: `/superadmin` route gated by Clerk `publicMetadata.is_superadmin` —
   view all orgs, manage subscriptions, impersonate for support

Nothing in Convex, the NPM package, or the multi-tenancy model needs to change. The orgId
isolation is already in place and scales to any number of self-service orgs.
