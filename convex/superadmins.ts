import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get the caller's email from the JWT, or null if unauthenticated. */
async function getCallerEmail(ctx: { auth: { getUserIdentity: () => Promise<{ email?: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity()
  return identity?.email ?? null
}

/** Assert the caller is a superadmin. Throws if not. */
export async function assertSuperadmin(ctx: { auth: { getUserIdentity: () => Promise<{ email?: string } | null> } } & { db: any }) {
  const email = await getCallerEmail(ctx)
  if (!email) throw new Error('Not authenticated')
  const entry = await ctx.db
    .query('superadmins')
    .withIndex('by_email', (q: any) => q.eq('email', email))
    .unique()
  if (!entry) throw new Error('Not a superadmin')
}

// ─── Queries ────────────────────────────────────────────────────────────────

/** Check if the current caller is a superadmin. Returns false for unauthenticated users. */
export const isSuperadmin = query({
  args: {},
  handler: async (ctx) => {
    const email = await getCallerEmail(ctx)
    if (!email) return false
    const entry = await ctx.db
      .query('superadmins')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique()
    return entry !== null
  },
})

/** List all superadmin entries. Requires superadmin access. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await assertSuperadmin(ctx)
    return ctx.db.query('superadmins').collect()
  },
})

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Add an email to the superadmin allowlist. Requires superadmin access. */
export const add = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    await assertSuperadmin(ctx)

    const normalized = email.toLowerCase().trim()
    const existing = await ctx.db
      .query('superadmins')
      .withIndex('by_email', (q) => q.eq('email', normalized))
      .unique()
    if (existing) throw new Error('Email is already a superadmin')

    return ctx.db.insert('superadmins', {
      email: normalized,
      addedAt: Date.now(),
    })
  },
})

/** Remove an email from the superadmin allowlist. Requires superadmin access. */
export const remove = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    await assertSuperadmin(ctx)

    const normalized = email.toLowerCase().trim()
    const entry = await ctx.db
      .query('superadmins')
      .withIndex('by_email', (q) => q.eq('email', normalized))
      .unique()
    if (!entry) throw new Error('Email is not a superadmin')

    await ctx.db.delete(entry._id)
  },
})
