# TODO — Open Topics & Known Issues

> Things that are intentionally deferred, known rough edges, or decisions that need revisiting.
> Not blockers — the system works — but worth addressing before a public launch.
> Last updated: 2026-02-27

---

## 1. token.ts — Hardcoded Region (`eu-west-1`)

**File**: `packages/cms-client/src/token.ts:73`

`parseKey` constructs the Convex URL as:
```ts
convexUrl: `https://${deploymentName}.eu-west-1.convex.cloud`
```

This hardcodes the AWS region. Convex deployments can live in other regions
(`us-east-1`, `eu-central-1`, etc.). If a CMS deployment is created outside `eu-west-1`,
the derived URL will be wrong and all `useSection` / `registerSections` calls will fail silently.

**Options**:
- Embed the full Convex URL in the key (increases key length slightly)
- Embed only the region suffix in the key
- Query the Convex API at runtime to resolve the URL from the deployment name
- Document "eu-west-1 only for now" and revisit when first non-EU deployment needed

---

## 2. CMSProvider — React 19 Requirement

**File**: `packages/cms-client/src/provider.tsx`

Uses React 19's context-as-component syntax:
```tsx
<CMSContext value={...}>
```

This syntax (`<Context value={}>` instead of `<Context.Provider value={}>`) was introduced in
React 19. It is **not compatible with React 18**.

**Current state**: The template (`create-better-cms/templates/nextjs`) targets Next.js 16 which
ships React 19 by default, so this is fine for the intended use case.

**Risk**: If a user tries to install `cms-client` in a Next.js 14/15 project (React 18),
`CMSProvider` will throw at runtime with a cryptic error.

**Fix**: Add a React version check in the README / PACKAGE_USAGE.md. Optionally support both
syntaxes by detecting the React version at runtime or using `Context.Provider`.

---

## 3. BETTER-CMS-KEY is in `.env.local` but BETTER-CMS-SLUG needs to be accessible in Client Components

**Files**: `apps/cms/app/admin/[projectId]/page.tsx`, template `components/providers.tsx`

The `CMSProvider` needs `slug` and `convexUrl` as props, which are passed from a Server
Component (`layout.tsx`). The slug comes from `process.env['BETTER-CMS-SLUG']` which is
a server-only env var (no `NEXT_PUBLIC_` prefix).

This works because the server component reads it and passes it as a prop. But it's a subtle
pattern — if a developer tries to use `useSection` without going through the template's
`layout.tsx`→`Providers` chain, they'll get a confusing "no CMSContext" error.

**Improvement**: Document this clearly in PACKAGE_USAGE.md, or expose a `NEXT_PUBLIC_BETTER_CMS_SLUG`
option as an alternative for projects that need the slug client-side directly.

---

## 4. Polar Billing UI

**Status**: Convex Polar component integrated in schema. No UI built.

**What's needed**:
- `/admin/billing` route — show current plan, upgrade/downgrade
- Webhook handler at `app/api/polar/events/route.ts`
- Customer portal link (Polar hosted page for self-service billing)
- `projects` table: add `planTier: "free" | "pro" | "enterprise"` field
- Gate features by plan tier (e.g., max N projects on free, unlimited on pro)

See `docs/DECISIONS.md` → "Polar: Schema Now, UI Deferred" for full TODO list.

---

## 5. Self-Service Onboarding

**Status**: Invite-only. Developer creates all Clerk orgs manually.

**What's needed**:
1. Clerk: set "max orgs per user" to `1`
2. `/onboarding` page — prompt new users to name their workspace and create first project
3. Activate Polar UI (billing gates on free tier)
4. `/superadmin` route — restricted to developer's Clerk userId

See `docs/DECISIONS.md` → "Invite-Only Now, Self-Service Later" for full transition plan.

---

## 6. `getSection` Server Helper (SSR Support)

**Status**: Not implemented. `useSection` is client-only (Convex subscription).

**What's needed**:
```ts
// Server Component usage
import { getSection } from 'cms-client/server'
const team = await getSection(cms, teamSection)
```

This would use `ConvexHttpClient.query()` to fetch once at render time (no realtime),
enabling proper SSR with content visible in the initial HTML.

Tracked in `docs/PACKAGE_USAGE.md` → FAQ as a known gap.

---

## 7. `create-better-cms` — Placeholder Dashboard URL

**File**: `packages/create-better-cms/src/index.ts:145`

```ts
initial: 'https://cms.your-domain.com',
```

The "Open CMS dashboard" flow prompts for a URL with a generic placeholder.
When the CMS is deployed to a real domain, this should default to the actual URL.

**Options**:
- Bake the CMS URL into the CLI at build time via an env var (e.g., `process.env.CMS_URL`)
- Accept a `--cms-url` flag
- Publish the URL to a well-known endpoint that the CLI fetches

---

## 8. Files Tab — Delete Folder Moves Files to Parent (No Confirmation)

**File**: `apps/cms/convex/folders.ts` → `remove` mutation

Deleting a folder silently moves all contained files to the parent folder path.
There is no confirmation dialog or warning about orphaned file paths.

**Improvement**:
- Show the file count before confirming deletion
- Offer "delete folder + all files" vs "delete folder, keep files at parent" options
- Consider a trash/soft-delete model

---

## 9. Media URLs are Permanent Once Stored

If a file is renamed or an R2 key changes, the stored URL in `section_content.items` becomes
stale. There is currently no mechanism to update references when files are moved or renamed.

**Current behavior**: Rename only updates the `filename` display field in the `media` table.
The `url` (r2Key-based CDN URL) does not change. Renames are purely cosmetic labels.

**Implication**: Safe as long as users understand renaming files doesn't break existing content.
Document this clearly in the CMS UI.

---

## 10. CLAUDE.md Build Status is Stale

`CLAUDE.md` shows Phase 2, 3, 4, 5 as incomplete but they are all done.

**Fix**: Update the Build Status checklist in `CLAUDE.md` to reflect actual completion state.
