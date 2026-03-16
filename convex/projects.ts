import { v } from 'convex/values'
import { query, mutation, internalQuery, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { requireOrgId, getOrgId } from './lib/orgGuard'
import { requireProjectAccess } from './lib/requireProjectAccess'
import { validateSlug, validateName } from './lib/validators'
import { checkProjectLimit } from './lib/checkLimit'
import { sha256 } from './lib/hash'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Cascade-delete all data associated with a project. */
async function cascadeDeleteProject(
  ctx: MutationCtx,
  projectId: Id<'projects'>
) {
  // 1. Collect R2 keys before deleting media records
  const media = await ctx.db
    .query('media')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()
  const r2Keys = media.map((m) => m.r2Key)

  // 2. section_registry
  const registry = await ctx.db
    .query('section_registry')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()
  for (const doc of registry) await ctx.db.delete(doc._id)

  // 3. section_content
  const content = await ctx.db
    .query('section_content')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()
  for (const doc of content) await ctx.db.delete(doc._id)

  // 4. media metadata
  for (const doc of media) await ctx.db.delete(doc._id)

  // 5. folders
  const folders = await ctx.db
    .query('folders')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()
  for (const doc of folders) await ctx.db.delete(doc._id)

  // 6. project itself
  await ctx.db.delete(projectId)

  // 7. Schedule batch R2 cleanup (non-blocking)
  if (r2Keys.length > 0) {
    await ctx.scheduler.runAfter(0, internal.projects.cleanupR2Objects, { r2Keys })
  }
}

/** Safe projection — strips sensitive fields from project document. */
function safeProject(project: {
  _id: Id<'projects'>
  _creationTime: number
  orgId: string
  name: string
  slug: string
  primaryColor: string
  faviconUrl: string
}) {
  return {
    _id: project._id,
    _creationTime: project._creationTime,
    orgId: project.orgId,
    name: project.name,
    slug: project.slug,
    primaryColor: project.primaryColor,
    faviconUrl: project.faviconUrl,
  }
}

// ─── Internal Queries / Mutations ────────────────────────────────────────────

/** Get a project by ID — no auth, for use by other Convex functions only */
export const getInternal = internalQuery({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    return ctx.db.get(projectId)
  },
})

/** Batch delete R2 objects — scheduled by cascadeDeleteProject */
export const cleanupR2Objects = internalMutation({
  args: { r2Keys: v.array(v.string()) },
  handler: async (_ctx, { r2Keys: _r2Keys }) => {
    // R2 deletion requires an action context (R2 component).
    // For now, log the keys for manual cleanup. A proper implementation
    // would schedule an internal action that calls r2.deleteObject for each key.
    // TODO: Implement batch R2 deletion via internal action
    console.warn(`Orphaned R2 keys pending cleanup: ${_r2Keys.length} objects`)
  },
})

/** One-time migration: hash existing plaintext registration tokens. */
export const migrateHashTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query('projects').collect()
    let migrated = 0
    for (const project of projects) {
      if (project.registrationToken && !project.registrationTokenHash) {
        const hash = await sha256(project.registrationToken)
        await ctx.db.patch(project._id, { registrationTokenHash: hash })
        migrated++
      }
    }
    console.log(`Migrated ${migrated} registration token(s) to hashed storage`)
  },
})

// ─── Queries ────────────────────────────────────────────────────────────────

/** List all projects for the current org — strips registrationToken.
 *  Returns empty array if org isn't in the JWT yet (auth handshake). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx)
    if (!orgId) return []
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_org', (q) => q.eq('orgId', orgId))
      .take(100)
    return projects.map(safeProject)
  },
})

/** Get a single project by ID — verifies org ownership, strips token */
export const get = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) return null
    return safeProject(project)
  },
})

/** Get a project by slug — public, no auth required */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const project = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()

    if (!project) return null

    // Public lookup intentionally returns a safe subset only.
    return {
      _id: project._id,
      name: project.name,
      slug: project.slug,
      primaryColor: project.primaryColor,
      faviconUrl: project.faviconUrl,
    }
  },
})

/** Get registration token for a project — dedicated query for settings page */
export const getRegistrationToken = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const { project } = await requireProjectAccess(ctx, projectId)
    return project.registrationToken ?? null
  },
})

/**
 * List ALL projects across all orgs — superadmin only.
 * Returns [] when unauthenticated or not superadmin instead of throwing.
 * Strips registrationToken from all results.
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    // Check superadmin status via allowlist table (email-based)
    const email = identity.email
    if (!email) return []
    const entry = await ctx.db
      .query('superadmins')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique()
    if (!entry) return []

    const projects = await ctx.db.query('projects').take(500)
    return projects.map(safeProject)
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
    await checkProjectLimit(ctx, orgId)

    const safeName = validateName(name)
    const safeSlug = validateSlug(slug)

    // Ensure slug is unique
    const existing = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', safeSlug))
      .unique()
    if (existing) throw new Error(`Slug "${safeSlug}" is already taken`)

    return ctx.db.insert('projects', {
      orgId,
      name: safeName,
      slug: safeSlug,
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
    await requireProjectAccess(ctx, projectId)

    // Validate inputs
    if (fields.name !== undefined) validateName(fields.name)
    if (fields.slug !== undefined) validateSlug(fields.slug)

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
 * Stores both plaintext (for backwards compat) and SHA-256 hash.
 * Uses rejection sampling to avoid modulo bias.
 */
export const generateRegistrationToken = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    await requireProjectAccess(ctx, projectId)

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    let token = ''
    // Rejection sampling: 256 % 36 = 4, so reject bytes >= 252 (= 36 * 7)
    const limit = 252
    let idx = 0
    while (token.length < 24) {
      if (idx >= bytes.length) {
        crypto.getRandomValues(bytes)
        idx = 0
      }
      if (bytes[idx]! < limit) {
        token += chars[bytes[idx]! % chars.length]
      }
      idx++
    }

    const hash = await sha256(token)
    await ctx.db.patch(projectId, {
      registrationToken: token,
      registrationTokenHash: hash,
    })
    return token
  },
})

/** Delete a project and all its data (cascade) */
export const remove = mutation({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const { project } = await requireProjectAccess(ctx, projectId)
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
    const hash = await sha256(registrationToken)
    await ctx.db.patch(project._id, { registrationToken, registrationTokenHash: hash })
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
    if (existing) {
      if (existing.orgId !== orgId) {
        throw new Error('Slug is already in use by another organization')
      }
      return existing._id
    }

    await checkProjectLimit(ctx, orgId)

    return ctx.db.insert('projects', {
      orgId,
      name,
      slug,
      primaryColor: primaryColor ?? '#000000',
      faviconUrl: faviconUrl ?? '',
    })
  },
})
