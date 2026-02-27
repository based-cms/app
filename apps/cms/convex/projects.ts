import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireOrgId, assertOrgAccess } from './lib/orgGuard'

// ─── Queries ────────────────────────────────────────────────────────────────

/** List all projects for the current org */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await requireOrgId(ctx)
    return ctx.db
      .query('projects')
      .withIndex('by_org', (q) => q.eq('orgId', orgId))
      .collect()
  },
})

/** Get a single project by ID — verifies org ownership */
export const get = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) return null
    return project
  },
})

/** Get a project by slug — public, no auth required */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
  },
})

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Create a new project for the current org */
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    primaryColor: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
  },
  handler: async (ctx, { name, slug, primaryColor, faviconUrl }) => {
    const orgId = await requireOrgId(ctx)

    // Ensure slug is unique
    const existing = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
    if (existing) throw new Error(`Slug "${slug}" is already taken`)

    return ctx.db.insert('projects', {
      orgId,
      name,
      slug,
      primaryColor: primaryColor ?? '#000000',
      faviconUrl: faviconUrl ?? '',
    })
  },
})

/** Update project branding */
export const update = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, ...fields }) => {
    const orgId = await requireOrgId(ctx)
    await assertOrgAccess(ctx, orgId)

    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) {
      throw new Error('Project not found')
    }

    const patch: Partial<typeof fields> = {}
    if (fields.name !== undefined) patch.name = fields.name
    if (fields.primaryColor !== undefined) patch.primaryColor = fields.primaryColor
    if (fields.faviconUrl !== undefined) patch.faviconUrl = fields.faviconUrl

    await ctx.db.patch(projectId, patch)
  },
})

/**
 * Generate (or regenerate) the registration token for a project.
 * The token is a `bcms_<base64>` string containing the Convex URL, org slug,
 * and a secret key. Displayed in the CMS project page — users set it as
 * NEXT_PUBLIC_BETTER_CMS_TOKEN in their client project.
 */
export const generateRegistrationToken = mutation({
  args: {
    projectId: v.id('projects'),
    convexUrl: v.string(),
  },
  handler: async (ctx, { projectId, convexUrl }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) throw new Error('Project not found')

    // Encode everything into a single token: bcms_<base64 JSON>
    const key = crypto.randomUUID()
    const payload = JSON.stringify({ v: 1, url: convexUrl, slug: project.slug, key })
    const token = `bcms_${btoa(payload)}`

    await ctx.db.patch(projectId, { registrationToken: token })
    return token
  },
})

/** Delete a project and all its data */
export const remove = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) {
      throw new Error('Project not found')
    }
    await ctx.db.delete(projectId)
  },
})
