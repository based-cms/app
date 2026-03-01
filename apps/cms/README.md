# @based-cms/cms

Central multi-tenant CMS app for Based CMS.

## Local Development

From the app repo root:

```bash
pnpm install
pnpm --dir apps/cms dev
```

In a separate terminal, run Convex dev:

```bash
cd apps/cms
npx convex dev
```

## Required Environment Variables

Create `apps/cms/.env.local` with at least:

```bash
NEXT_PUBLIC_CONVEX_URL=https://<live-deployment>.convex.cloud
NEXT_PUBLIC_CONVEX_TEST_URL=https://<test-deployment>.convex.cloud
CONVEX_DEPLOYMENT=<deployment-name>

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/admin
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/admin
```

R2 and Clerk issuer values are configured in Convex dashboard environment variables
(see `docs/SETUP.md`).

## Key Routes

- Admin dashboard: `/admin`
- Project content: `/admin/[projectId]/content`
- Files manager: `/admin/[projectId]/files` (`/media` redirects here)

## Related Docs

- `CLAUDE.md` (repo root)
- `docs/ARCHITECTURE.md` (repo root)
- `docs/SETUP.md` (repo root)

## Related Repositories

- `based-cms-client` (npm package repo)
- `based-cms-cli` (create-based-app CLI repo)
