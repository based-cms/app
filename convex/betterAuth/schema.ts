/**
 * Better Auth schema for the local-install Convex component.
 *
 * Generated via: cd convex/betterAuth && npx @better-auth/cli generate -y
 *
 * If you add/remove Better Auth plugins, regenerate this file by running
 * the command above. Custom indexes can be preserved by generating to
 * `generatedSchema.ts` and importing from there.
 */
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const tables = {
  user: defineTable({
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    role: v.optional(v.string()),
    banned: v.optional(v.boolean()),
    banReason: v.optional(v.string()),
    banExpires: v.optional(v.number()),
  }).index('email', ['email']),

  session: defineTable({
    expiresAt: v.number(),
    token: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    userId: v.string(),
    activeOrganizationId: v.optional(v.string()),
  })
    .index('token', ['token'])
    .index('userId', ['userId']),

  account: defineTable({
    accountId: v.string(),
    providerId: v.string(),
    userId: v.string(),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    idToken: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
    refreshTokenExpiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
    password: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('userId', ['userId'])
    .index('accountId_providerId', ['accountId', 'providerId']),

  verification: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index('identifier', ['identifier']),

  // ── Organization plugin tables ──────────────────────────────────────────────

  organization: defineTable({
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  }).index('slug', ['slug']),

  member: defineTable({
    organizationId: v.string(),
    userId: v.string(),
    role: v.string(),
    createdAt: v.number(),
  })
    .index('organizationId', ['organizationId'])
    .index('userId', ['userId'])
    .index('organizationId_userId', ['organizationId', 'userId']),

  invitation: defineTable({
    organizationId: v.string(),
    email: v.string(),
    role: v.string(),
    status: v.string(),
    expiresAt: v.number(),
    inviterId: v.string(),
    teamId: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index('organizationId', ['organizationId'])
    .index('email', ['email']),
}

export default defineSchema(tables)
