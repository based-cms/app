# SETUP.md — Based CMS

> Step-by-step setup guide for local development and production deployment.
> Last updated: 2026-02-27 (Phase 5 complete)

---

## Prerequisites

- Node.js 20+
- pnpm 9.x (`npm install -g pnpm`)
- A Convex account (https://convex.dev)
- A Clerk account (https://clerk.dev)
- A Cloudflare account with R2 enabled
- A Polar account (https://polar.sh) — optional until billing UI is built

---

## Environment Variables

### `apps/cms/.env.local`

```bash
# Convex
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
CONVEX_DEPLOYMENT=<your-deployment-name>

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/admin
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/admin
```

### Convex Dashboard Environment Variables

Set these in the Convex dashboard under your deployment → Settings → Environment Variables:

```bash
# Cloudflare R2 — S3 API (upload endpoint — NOT the r2.dev URL)
R2_TOKEN=<cloudflare-api-token>
R2_ACCESS_KEY_ID=<r2-access-key-id>
R2_SECRET_ACCESS_KEY=<r2-secret-access-key>
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET=<bucket-name>

# Cloudflare R2 — Public CDN URL (for serving uploaded files to browsers)
# Must be the r2.dev public URL or a custom domain, NOT the .cloudflarestorage.com endpoint
R2_PUBLIC_BASE_URL=https://<your-bucket>.r2.dev

# Polar (deferred — add when billing UI is built)
# POLAR_ACCESS_TOKEN=<polar-access-token>
# POLAR_WEBHOOK_SECRET=<polar-webhook-secret>
```

---

## Convex Setup

1. Create a Convex account at https://convex.dev
2. Create a new project
3. Install Convex CLI: `pnpm add -g convex`
4. From `apps/cms/`, run: `npx convex dev --once`
   - This creates `convex/_generated/` and links to your project
   - Copy the deployment URL to `.env.local` as `NEXT_PUBLIC_CONVEX_URL`
5. Set R2 environment variables in the Convex dashboard
6. Deploy functions: `npx convex deploy`

---

## Clerk Setup

1. Create a Clerk application at https://dashboard.clerk.com
2. Enable **Organizations** in Clerk dashboard → Organizations settings
3. Set "Create organizations" permission to admins only (prevent clients from creating orgs)
4. Copy publishable key and secret key to `.env.local`
5. Configure redirect URLs in Clerk dashboard:
   - Sign-in redirect: `/admin`
   - After sign-up redirect: `/admin`
6. Add `http://localhost:3000` to allowed origins

### Configure Convex JWT Template (Required)

This step is what allows Convex to verify Clerk sessions and read `orgId` from the JWT.

1. Clerk dashboard → Configure → JWT Templates
2. Click **New template** → choose **Convex**
3. The template is pre-filled — do not change it
4. Click **Save**
5. Copy the **Issuer** URL shown (e.g. `https://flying-mule-67.clerk.accounts.dev`)
6. In Convex dashboard → your project → Settings → Environment Variables, add:
   - `CLERK_ISSUER_URL` = the issuer URL you copied

Without this step, `auth()` in Server Components and `requireOrgId()` in Convex functions will fail.

### Creating Client Organizations

As the admin developer:
1. Go to Clerk dashboard → Organizations
2. Create a new org per client (e.g., "Kunde AG")
3. Note the Organization ID (starts with `org_`)
4. Invite the client by email — they'll create a Clerk account (email + password, no GitHub needed)
5. Create a matching `projects` document in Convex with the same `orgId`

---

## Cloudflare R2 Setup

1. Go to Cloudflare dashboard → R2 Object Storage
2. Create a new bucket (e.g., `based-cms-media`)
3. Enable **public access** on the bucket (or set up a custom domain)
4. Create an API token with R2 read/write permissions
5. Note two distinct URLs — **do not mix them up**:
   - **S3 endpoint** (`R2_ENDPOINT`): `https://<account-id>.r2.cloudflarestorage.com`
     Used by Convex to generate presigned upload URLs. Never exposed to browsers.
   - **Public CDN URL** (`R2_PUBLIC_BASE_URL`): `https://<your-bucket>.r2.dev`
     Used to construct the public URL returned after upload. Served directly to browsers.
6. Set all R2 variables as Convex environment variables (see above)

> **Common mistake**: setting `R2_ENDPOINT` to the `r2.dev` URL causes CORS errors because
> browsers cannot upload to the S3 API endpoint through the public CDN URL.
> See `docs/FIXES.md` → Phase 5 — R2 presigned URL CORS error.

---

## Local Development

```bash
# Clone the repo
git clone <repo-url>
cd based-cms

# Install all dependencies
pnpm install

# Set up .env.local in apps/cms (see above)

# Start Convex dev server (separate terminal)
cd apps/cms && npx convex dev

# Start Next.js dev server (separate terminal)
pnpm --filter @based-cms/cms dev

# Or start everything together
pnpm dev
```

The CMS will be available at http://localhost:3000.

---

## Production Deployment

### Convex

```bash
cd apps/cms
npx convex deploy --prod
```

### Vercel

1. Connect the repo to Vercel
2. Set root directory to `apps/cms` (or use Vercel's monorepo detection)
3. Add all environment variables from `.env.local` to Vercel project settings
4. Deploy: `vercel --prod` or push to `main`

### Client NPM Package

```bash
# Build the package
pnpm --filter cms-client build

# Publish to npm (requires changeset)
pnpm changeset
pnpm changeset version
pnpm changeset publish
```

---

## Troubleshooting

### `npx convex dev` fails with "missing environment variables"
→ Set R2 environment variables in Convex dashboard before running dev mode.

### Clerk auth loop (redirecting to /sign-in repeatedly)
→ Check that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set correctly in `.env.local`.
→ Ensure Clerk organization feature is enabled in the Clerk dashboard.

### `pnpm install` fails with workspace resolution errors
→ Ensure `pnpm-workspace.yaml` covers both `apps/*` and `packages/*`.
→ Run `pnpm install --force` to clear resolution cache.

### Type errors in generated Convex code
→ Run `npx convex dev --once` to regenerate `convex/_generated/`.
→ Never manually edit files in `_generated/`.
