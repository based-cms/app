# ROADMAP — based-cms

> **Goal**: Get the product production-ready for real client websites, then grow into a
> scalable SaaS with a public launch.
>
> Last updated: 2026-02-27

---

## Sprint 1 — Production-Ready for Own Clients

> Everything needed before using this for real client projects.
> No client should see a broken flow, missing UX, or raw internal IDs.

### Bug Fixes

- [x] **Never display ENV vars permanently in the project setup UI** (`TODO.md` #existing)
      — Keys shown only immediately after generation (`justGenerated` state). Page reload
      masks them. Copy buttons still work when masked. Regeneration requires confirmation.
- [x] **R2 paths: use `project-slug` instead of Convex document ID**
      — Slug is now resolved server-side in `generateUploadUrl` via internal query.
      Client code no longer passes `slug` — eliminates fallback to Convex doc ID.

### Features

- [x] **File/image picker in content forms — URL dropdown with folder hierarchy**
      — `MediaPicker` component integrated into `DynamicFieldRenderer` for image/video/document
      fields. Files grouped by folder with upload support directly from the picker.
- [x] **Admin pages + overall design refresh**
      — Project sidebar layout, colored project cards, icon backgrounds, step-numbered
      setup flow, dark code blocks, save status indicator, collapsible drop zone,
      amber-tinted dev mode toggle. Consistent hierarchy across all pages.

### Quality

- [x] **Document that renaming files is cosmetic** (URL stays stable)
      — Persistent info note in Files page header + tooltip on rename button + inline text during
      rename. Clients see this context at all times.

---

## Sprint 2 — Stability & Growth

> Improve the day-to-day experience for both developer and client users.
> Prepare for self-service onboarding.

### Features

- [x] **Archived sections (not hard-deleted)**
      — `archivedAt` field on `section_registry`. `syncPublic` mutation archives sections
      no longer in client code. Admin UI shows archived sections greyed with Restore /
      Delete permanently. Content preserved until explicit deletion.

- [ ] **Clearer Live/Test environment separation in the UI**
      — Make the environment toggle more visually prominent (color coding, banner, etc.).
      — Current code already supports optional live/test deployment switching for content flows.
      Next step is hardening UX and guardrails (clear banners, safer migration states, fewer
      accidental cross-environment edits).

- [x] **Self-service org onboarding**
      — `/onboarding` multi-step wizard: org creation → project name/slug → API keys display.
      — `/superadmin` route gated by Clerk `publicMetadata.is_superadmin` (cross-org project list).
      — Empty-state "Get started" button in admin links to onboarding.

- [x] **Rename: better-cms → based-cms**
      — Update all `package.json` names, import paths, env var prefixes (`BASED-CMS-*` →
      `BASED-CMS-*`), Vercel project name, Convex deployment name, CLI package name on npm.
      — Token prefix: keep `bcms_` or switch to `based_` (decide before public launch to avoid
      breaking change).

- [ ] **Framework compatibility documentation**
      — `registerSections` (server) is already framework-agnostic.
      — Document how to use `cms-client` with Nuxt, SvelteKit, Remix, etc. by calling the
      HTTP registration endpoint directly and setting up their own reactive queries.

### Technical Debt

- [ ] Fix hardcoded `eu-west-1` region in `token.ts` (see `TODO.md` #1)
- [ ] Fix folder delete confirmation + file orphan warning (see `TODO.md` #8)
- [ ] `create-based-cms` CLI: bake in real CMS URL at build time (see `TODO.md` #7)
- [x] `getSection` server helper for SSR — `cms.getSection(section, slug)` via ConvexHttpClient

---

## Sprint 3 — Business & Scale

> Monetisation, open-source strategy, and enterprise features.
> Only after the core product is stable and live with real clients.

### Features

- [ ] **Analytics dashboard**
      — Per-org request counts, media storage usage, section read frequency.
      — Goal: visibility into Convex + R2 costs per customer before bills arrive.
      — Can start with Convex usage API + a simple admin view.

- [ ] **Polar billing UI + premium tiers** (see `TODO.md` #4)
      — `/admin/billing` route: current plan, upgrade/downgrade.
      — Convex Polar component is already integrated in the schema.
      — Define tiers: Free (N projects, limited requests), Pro (unlimited), Enterprise (custom).
      — Pay-as-you-go option for R2 overages.

- [ ] **CI/CD pipeline**
      — Vercel auto-deploys on push (already working).
      — Add GitHub Actions: typecheck + lint on PRs, `npx convex deploy` on merge to main.
      — Only required once there is a team or external contributors.

- [ ] **Open-source strategy & license decision**
      — Recommendation: **BSL 1.1** (Business Source License) — code is readable and
      self-hostable, but competing hosted services require a commercial license. Converts
      to MIT after a defined period (e.g. 4 years).
      — "Community Edition" = self-hosted, "Cloud" = managed by us.
      — Decide before any public repo or marketing goes live.

- [ ] **Bring Your Own Bucket (BYOB)**
      — Allow enterprise clients to supply their own Cloudflare R2 or AWS S3 credentials.
      — Requires multi-bucket routing in the media upload/fetch path.
      — Relevant for GDPR-strict clients who need data residency control.

---

## Parking Lot (No Sprint Assigned)

- React 18 compatibility for `CMSProvider` (see `TODO.md` #2)
- `BASED-CMS-SLUG` server-only vs. client-accessible pattern (see `TODO.md` #3)
- Multi-region Convex support (see `TODO.md` #1)
