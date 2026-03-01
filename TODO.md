# TODO — Open Topics & Known Issues

> Things that are intentionally deferred, known rough edges, or decisions that need revisiting.
> Not blockers — the system works — but worth addressing before a public launch.
> Last updated: 2026-02-27
>
> **See `docs/ROADMAP.md` for the prioritised sprint plan.**

---

## 1. Hardcoded `eu-west-1` region in `token.ts`

`parseKey()` constructs Convex URLs assuming `eu-west-1`. Works for all current deployments.
Multi-region support deferred — would require encoding region in the key format.

## 2. React 18 compatibility for `CMSProvider`

`CMSProvider` uses React 19 context-as-component syntax (`<CMSContext value={...}>`). Projects
on React 18 would need a wrapper using `CMSContext.Provider`. Not a priority until clients
request it.

## 3. `BASED-CMS-SLUG` exposure pattern

Currently passed as a server-side prop to `CMSProvider`. Not secret, but not `NEXT_PUBLIC_`
either. If a client ever needs it client-side (e.g. for a non-React framework), we may need
a different pattern.

## 4. Polar billing UI

Convex Polar component is integrated (`convex.config.ts`) and schema merged. No UI built.
Sprint 3 item — needs tier definitions, `/admin/billing` route, usage metering.

## 5. Clearer Live/Test environment UX

Environment toggle works but could be more prominent. Color coding, banners, and guardrails
to prevent accidental cross-environment edits are deferred to Sprint 2 continuation.

## 6. Framework compatibility docs

`registerSections` (server) and `getSection` (server) are framework-agnostic. `useSection`
(React hook) and `CMSProvider` (React component) are React-only. Document how to use
cms-client with Nuxt, SvelteKit, Remix, etc.

## 7. `create-based-app` CLI: bake in real CMS URL

Currently the CLI template uses a placeholder URL. Should resolve the actual Convex deployment
URL at build time or prompt for it during `npx create-based-app`.

## 8. Folder delete confirmation + file orphan warning

Deleting a folder doesn't warn about orphaned files. Should show a confirmation dialog
listing affected files and offer to move them or delete them.
