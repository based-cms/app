import { betterAuth } from 'better-auth'
import Database from 'better-sqlite3'
import { organization } from 'better-auth/plugins'
import { jwt } from 'better-auth/plugins'
import path from 'path'

const dbPath = process.env.BETTER_AUTH_DB_PATH ?? path.join(process.cwd(), 'auth.db')

export const auth = betterAuth({
  database: new Database(dbPath),

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    organization(),
    jwt({
      jwt: {
        issuer: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
        // Include org_id in JWT claims for Convex org-guard compatibility
        definePayload: async ({ user, session }) => {
          // Read activeOrganizationId from the session if available
          const orgId = (session as Record<string, unknown>)['activeOrganizationId'] as string | undefined
          return {
            sub: user.id,
            email: user.email,
            name: user.name,
            org_id: orgId ?? null,
          }
        },
      },
    }),
  ],

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',')
    : ['http://localhost:3000'],
})

export type Session = typeof auth.$Infer.Session.session
export type User = typeof auth.$Infer.Session.user
