# FIXES.md — Based CMS

> Non-obvious fixes made during the build, with explanation.
> Add entries here whenever a fix is not immediately self-evident from the code change.
> Format: ## [Phase X] — Short description
> Last updated: 2026-02-27 (Phase 5 complete)

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

**Fix**: `pnpm --filter @based-cms/cms add tw-animate-css shadcn`.

Both packages must be direct dependencies of `apps/cms` — they are CSS imports, not JS imports, so they won't appear in the module graph until the build actually runs.

---

## [Phase 4] — proxy.ts must use clerkMiddleware(), not a manual cookie check

**Symptom**: `auth()` in `app/admin/layout.tsx` throws:
> "Clerk: auth() was called but Clerk can't detect usage of clerkMiddleware()"

**Root cause**: Clerk's `auth()` Server Component helper requires `clerkMiddleware()` to have
run on the request — it communicates via request headers set by the middleware. Our original
`proxy.ts` did a manual `__session` cookie check and called `NextResponse.next()`, which never
set those headers, so `auth()` had no context.

**Fix**: Replace manual cookie check with `clerkMiddleware()` from `@clerk/nextjs/server`.
Use `createRouteMatcher` to protect `/admin(.*)` routes. The matcher is also widened to cover
all routes (not just `/admin`) so Clerk can attach auth headers on every request.

---

## [Phase 2] — R2 `generateUploadUrl` takes no `ctx` argument

**Symptom**: `tsc --noEmit` fails with `Expected 0-1 arguments, but got 3` on `media.ts:86`.

**Root cause**: The `@convex-dev/r2` R2 class method `generateUploadUrl` has the signature
`generateUploadUrl(customKey?: string): Promise<{key, url}>`. It uses the S3Client directly
(not Convex internals) so it requires no `ctx` and no options object. Initial implementation
incorrectly passed `(ctx, r2Key, { expiresIn, httpMetadata })`.

**Fix**: Change to `r2.generateUploadUrl(r2Key)`. Also remove unused `mimeType` arg from
the action handler since metadata options aren't supported this way.

---

## [Phase 4] — orgGuard reads `org_id` not `orgId` from Convex identity

**Symptom**: `requireOrgId` throws `No active organization in session` even though the Clerk JWT
contains `org_id`. Debug token endpoint confirms `org_id` is present in the JWT claims.

**Root cause**: Convex's `getUserIdentity()` returns JWT claims by their **original key names** —
it does NOT camelCase custom claims. The Clerk JWT uses `org_id` (snake_case), but the code
was reading `identity.orgId` (camelCase), which is always `undefined`.

**Fix**: Use `(identity as Record<string, unknown>)['org_id']` instead of `identity.orgId`
in both `requireOrgId` and `assertOrgAccess` in `convex/lib/orgGuard.ts`.

---

## [Phase 1] — `create-next-app` creates nested `pnpm-workspace.yaml`

**Symptom**: `shadcn init` fails with `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND` — cannot resolve `@based-cms/tsconfig@workspace:*` from inside `apps/cms`.

**Root cause**: `create-next-app` created `apps/cms/pnpm-workspace.yaml` and `apps/cms/pnpm-lock.yaml`, making `apps/cms` treat itself as the root of a separate workspace. This broke cross-workspace resolution.

**Fix**: Delete `apps/cms/pnpm-workspace.yaml` and `apps/cms/pnpm-lock.yaml`, then run `pnpm install` from the monorepo root. The app is then correctly treated as a workspace package within the root workspace.

---

## [Phase 5] — R2 presigned upload CORS error

**Symptom**: File uploads fail in the browser with:
> Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource
> at `https://<bucket>.r2.dev/...`. Reason: CORS request did not succeed.

**Root cause**: `R2_ENDPOINT` was set to the `r2.dev` public CDN URL (e.g. `https://based-cms-media.r2.dev`) instead of the S3 API endpoint (e.g. `https://<account-id>.r2.cloudflarestorage.com`). The Convex R2 component uses `R2_ENDPOINT` to generate presigned `PUT` upload URLs. Presigned S3 uploads must go to the S3 API hostname — not the CDN hostname. Browsers sent the `PUT` to the CDN URL which has no CORS configuration for uploads.

Additionally, after upload the public URL was being derived by stripping the query string from the presigned upload URL. This gave a `cloudflarestorage.com` URL that browsers cannot fetch (private S3 endpoint).

**Fix**:
1. Set `R2_ENDPOINT` back to `https://<account-id>.r2.cloudflarestorage.com`
2. Add a new Convex env var `R2_PUBLIC_BASE_URL=https://<bucket>.r2.dev`
3. In `convex/media.ts` `generateUploadUrl`: construct `publicUrl = process.env.R2_PUBLIC_BASE_URL + '/' + r2Key` and return it alongside `uploadUrl`
4. In `MediaUploader.tsx` and `files/page.tsx`: use the returned `publicUrl` as the stored URL (not a derived URL from the upload endpoint)

**Rule of thumb**: Two R2 URLs serve different purposes and must never be swapped:
- `R2_ENDPOINT` (`cloudflarestorage.com`) — write-only S3 API, never exposed to browsers
- `R2_PUBLIC_BASE_URL` (`r2.dev`) — read-only CDN, served to browsers

---

## [Phase 5] — `exactOptionalPropertyTypes` error in registerSections spread

**Symptom**: `tsc` fails in `packages/cms-client/src/server/registerSections.ts` with:
> Type `string | undefined` is not assignable to type `string` (TS2322)

on a mutation argument that has an optional field.

**Root cause**: `exactOptionalPropertyTypes: true` in `packages/tsconfig/library.json` means you cannot pass `{ field: value | undefined }` where `{ field?: string }` is expected, even when `value` is `undefined`. TypeScript treats the presence of the key (with `undefined` value) as different from the key being absent.

**Fix**: Use conditional spread to only include the key when the value is defined:
```ts
...(value !== undefined ? { field: value } : {})
```
This ensures the key is entirely absent from the object when the value is undefined, satisfying `exactOptionalPropertyTypes`.
