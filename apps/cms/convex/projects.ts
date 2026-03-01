import { v } from 'convex/values'
import { query, mutation, internalQuery } from './_generated/server'
import { requireOrgId, assertOrgAccess } from './lib/orgGuard'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Cascade-delete all data associated with a project. */
async function cascadeDeleteProject(
  ctx: MutationCtx,
  projectId: Id<'projects'>
) {
  // 1. section_registry
  const registry = await ctx.db
    .query('section_registry')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()
  for (const doc of registry) await ctx.db.delete(doc._id)

  // 2. section_content
  const content = await ctx.db
    .query('section_content')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()
  for (const doc of content) await ctx.db.delete(doc._id)

  // 3. media metadata (R2 objects remain — separate cleanup if needed)
  const media = await ctx.db
    .query('media')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()
  for (const doc of media) await ctx.db.delete(doc._id)

  // 4. folders
  const folders = await ctx.db
    .query('folders')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()
  for (const doc of folders) await ctx.db.delete(doc._id)

  // 5. project itself
  await ctx.db.delete(projectId)
}

// ─── Internal Queries ────────────────────────────────────────────────────────

/** Get a project by ID — no auth, for use by other Convex functions only */
export const getInternal = internalQuery({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    return ctx.db.get(projectId)
  },
})

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

/** List ALL projects across all orgs — superadmin only */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')

    // is_superadmin must be added to the Clerk JWT template from user.public_metadata
    const isSuperadmin = (identity as Record<string, unknown>)['is_superadmin'] === true
    if (!isSuperadmin) {
      throw new Error('Unauthorized: superadmin access required')
    }

    return ctx.db.query('projects').collect()
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

/** Update project fields (name, slug, branding) */
export const update = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
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

    // Validate slug uniqueness if changing
    if (fields.slug !== undefined) {
      const existing = await ctx.db
        .query('projects')
        .withIndex('by_slug', (q) => q.eq('slug', fields.slug!))
        .unique()
      if (existing && existing._id !== projectId) {
        throw new Error(`Slug "${fields.slug}" is already taken`)
      }
    }

    const patch: Record<string, string> = {}
    if (fields.name !== undefined) patch.name = fields.name
    if (fields.slug !== undefined) patch.slug = fields.slug
    if (fields.primaryColor !== undefined) patch.primaryColor = fields.primaryColor
    if (fields.faviconUrl !== undefined) patch.faviconUrl = fields.faviconUrl

    await ctx.db.patch(projectId, patch)
  },
})

/**
 * Generate (or regenerate) the registration token for a project.
 * Stores a 24-char random string (uppercase A-Z + digits 0-9).
 * The CMS admin page constructs the full bcms_ key for display to users.
 */
export const generateRegistrationToken = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) throw new Error('Project not found')

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    let token = ''
    for (let i = 0; i < 24; i++) {
      token += chars[bytes[i]! % chars.length]
    }

    await ctx.db.patch(projectId, { registrationToken: token })
    return token
  },
})

/** Delete a project and all its data (cascade) */
export const remove = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) {
      throw new Error('Project not found')
    }

    await cascadeDeleteProject(ctx, projectId)
    return { slug: project.slug }
  },
})

// ─── Cross-deployment sync mutations ─────────────────────────────────────────

/**
 * Delete a project by slug — for cross-deployment cleanup
 * where project IDs differ between deployments.
 */
export const removeBySlug = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
    if (!project || project.orgId !== orgId) {
      throw new Error('Project not found')
    }

    await cascadeDeleteProject(ctx, project._id)
  },
})

/**
 * Sync a registration token to a project identified by slug.
 * Used after generating a token on the primary deployment.
 */
export const syncRegistrationToken = mutation({
  args: {
    slug: v.string(),
    registrationToken: v.string(),
  },
  handler: async (ctx, { slug, registrationToken }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
    if (!project || project.orgId !== orgId) {
      throw new Error('Project not found')
    }
    await ctx.db.patch(project._id, { registrationToken })
  },
})

/**
 * Ensure a project exists on this deployment (create if missing).
 * Used to create "shadow" project records on the test deployment
 * so that section_content mutations pass project existence checks.
 * Returns the project ID (existing or newly created).
 */
export const ensureExists = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    primaryColor: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
  },
  handler: async (ctx, { slug, name, primaryColor, faviconUrl }) => {
    const orgId = await requireOrgId(ctx)
    const existing = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
    if (existing) return existing._id

    return ctx.db.insert('projects', {
      orgId,
      name,
      slug,
      primaryColor: primaryColor ?? '#000000',
      faviconUrl: faviconUrl ?? '',
    })
  },
})
