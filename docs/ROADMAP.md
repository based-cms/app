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

- [ ] **Never display ENV vars permanently in the project setup UI** (`TODO.md` #existing)
      — Show keys once after generation, then mask them. Add a "copy" button.
- [ ] **R2 paths: use `project-slug` instead of Convex document ID**
      — File keys in Cloudflare R2 should be human-readable (`my-project/images/hero.png`
      not `jd7x9k2m/images/hero.png`). Set this before the first real client deployment.
      — Also reflect folder renames/file renames in the R2 key (or document that renaming is
      cosmetic-only and the URL stays stable — see `TODO.md` #9).

### Features

- [ ] **File/image picker in content forms — URL dropdown with folder hierarchy**
      — When a field is of type `z.image()` or any URL field, show a media picker instead of a
      plain text input. Display files grouped by folder (matching the Files tab hierarchy).
      — Selecting a file inserts its public URL into the field.
- [ ] **Admin pages + overall design refresh**
      — Admin UI polish: consistent spacing, clear hierarchy, professional feel.
      — Goal: something you can confidently show to clients.

### Quality

- [ ] **Document that renaming files is cosmetic** (URL stays stable)
      — Add a tooltip/note in the Files tab so clients don't expect URLs to update on rename.

---

## Sprint 2 — Stability & Growth

> Improve the day-to-day experience for both developer and client users.
> Prepare for self-service onboarding.

### Features

- [ ] **Archived sections (not hard-deleted)**
      — When a section type is removed from the client codebase, mark it as "archived" in
      `section_registry` rather than leaving it as a ghost entry.
      — Archived sections appear collapsed/greyed in the admin sidebar with a "Delete permanently"
      option. Prevents accidental data loss from a code change or PR merge.

- [ ] **Clearer Live/Test environment separation in the UI**
      — Make the environment toggle more visually prominent (color coding, banner, etc.).
      — Consider separate Convex deployments for preview vs. production instead of a single
      deployment with an `env` data field. This is a larger architectural decision — evaluate
      trade-offs before committing.

- [ ] **Self-service org onboarding** (see `TODO.md` #5)
      — `/onboarding` flow for new users: name workspace, create first project, copy env vars.
      — Clerk: limit to 1 org per user (free tier).
      — `/superadmin` route restricted to developer's Clerk userId.

- [ ] **Rename: better-cms → based-cms**
      — Update all `package.json` names, import paths, env var prefixes (`BETTER-CMS-*` →
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
- [ ] `create-better-cms` CLI: bake in real CMS URL at build time (see `TODO.md` #7)
- [ ] `getSection` server helper for SSR (see `TODO.md` #6)

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
- `BETTER-CMS-SLUG` server-only vs. client-accessible pattern (see `TODO.md` #3)
- Multi-region Convex support (see `TODO.md` #1)
