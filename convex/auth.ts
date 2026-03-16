import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { betterAuth, type BetterAuthOptions } from 'better-auth/minimal'
import { organization } from 'better-auth/plugins'
import { emailOTP } from 'better-auth/plugins/email-otp'
import { magicLink } from 'better-auth/plugins/magic-link'
import { sendEmail } from './lib/email'
import {
  otpEmail,
  magicLinkEmail,
  resetPasswordEmail,
} from './lib/emailTemplates'
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

// Convex Components cannot access process.env — env vars must be passed in
// explicitly. The adapter (createApi) and registerRoutes both call this with
// a dummy ctx at module-load time for schema/path extraction; siteUrl is
// irrelevant for those calls, so we default to prod.
export const createAuthOptions = (
  ctx: GenericCtx<DataModel>,
  siteUrl = 'https://based-cms.dev'
): BetterAuthOptions => ({
  baseURL: siteUrl,
  trustedOrigins: [siteUrl],
  database: authComponent.adapter(ctx),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ to: user.email, ...resetPasswordEmail(url) })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      // Fallback — emailOTP's init hook overrides this on signup when
      // sendVerificationOnSignUp is true, sending an OTP instead.
      await sendEmail({
        to: user.email,
        ...otpEmail(token, 'email-verification'),
      })
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-up/email': { window: 300, max: 5 },
      '/forget-password': { window: 60, max: 3 },
    },
    storage: 'memory',
  },
  advanced: {
    cookiePrefix: 'bcms',
    defaultCookieAttributes: {
      httpOnly: true,
      secure: siteUrl.startsWith('https://'),
      sameSite: 'lax' as const,
    },
  },
  plugins: [
    convex({
      authConfig,
      jwt: {
        definePayload: ({ user, session }) => ({
          name: user.name,
          email: user.email,
          sessionId: session.id,
          // Org isolation: include the active org in the Convex JWT so that
          // ctx.auth.getUserIdentity() can read it in queries/mutations.
          activeOrganizationId:
            (session as Record<string, unknown>).activeOrganizationId ?? null,
        }),
      },
    }),
    organization(),
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        await sendEmail({ to: email, ...otpEmail(otp, type) })
      },
      sendVerificationOnSignUp: true,
      otpLength: 6,
      expiresIn: 300,
      disableSignUp: true,
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({ to: email, ...magicLinkEmail(url) })
      },
      expiresIn: 300,
    }),
  ],
})

// ---------------------------------------------------------------------------
// Runtime auth factory — reads SITE_URL from process.env (available in HTTP
// action context) and passes it explicitly into createAuthOptions.
// ---------------------------------------------------------------------------

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = process.env.SITE_URL
  if (!siteUrl) {
    console.warn('[auth] SITE_URL not set, falling back to https://based-cms.dev')
  }
  return betterAuth(createAuthOptions(ctx, siteUrl ?? 'https://based-cms.dev'))
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
