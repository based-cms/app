import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal'
import { organization } from 'better-auth/plugins'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import { query } from './_generated/server'
import authConfig from './auth.config'
import authSchema from './betterAuth/schema'

// ---------------------------------------------------------------------------
// Convex component client (local install with org schema)
// ---------------------------------------------------------------------------

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: {
      schema: authSchema,
    },
  }
)

// ---------------------------------------------------------------------------
// Better Auth options (shared between runtime and schema generation)
// ---------------------------------------------------------------------------

const siteUrl = process.env.SITE_URL ?? 'http://localhost:3000'

export const createAuthOptions = (
  ctx: GenericCtx<DataModel>
): BetterAuthOptions => ({
  baseURL: siteUrl,
  database: authComponent.adapter(ctx),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    convex({
      authConfig,
      jwt: {
        definePayload: ({ user, session }) => ({
          name: user.name,
          email: user.email,
          role: user.role,
          sessionId: session.id,
          // Org isolation: include the active org in the Convex JWT so that
          // ctx.auth.getUserIdentity() can read it in queries/mutations.
          activeOrganizationId:
            (session as Record<string, unknown>).activeOrganizationId ?? null,
        }),
      },
    }),
    organization(),
  ],
})

// ---------------------------------------------------------------------------
// Runtime auth factory
// ---------------------------------------------------------------------------

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx))
}

// ---------------------------------------------------------------------------
// Public query — returns the current authenticated user
// ---------------------------------------------------------------------------

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx)
  },
})

// Exposes the active organization claim as seen by Convex JWT auth.
// Used by onboarding to avoid creating org-scoped records before token propagation.
export const getSessionOrganization = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    return (
      (identity as Record<string, unknown>).activeOrganizationId as string | null
    ) ?? null
  },
})
