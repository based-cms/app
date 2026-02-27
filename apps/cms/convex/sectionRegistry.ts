import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireOrgId } from './lib/orgGuard'

// ─── Queries ────────────────────────────────────────────────────────────────

/** List all registered section types for a project */
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) return []

    return ctx.db
      .query('section_registry')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect()
  },
})

/** Get a single section registry entry by type */
export const getByType = query({
  args: {
    projectId: v.id('projects'),
    sectionType: v.string(),
  },
  handler: async (ctx, { projectId, sectionType }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) return null

    return ctx.db
      .query('section_registry')
      .withIndex('by_project_type', (q) =>
        q.eq('projectId', projectId).eq('sectionType', sectionType)
      )
      .unique()
  },
})

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Upsert a section registry entry.
 * Called by cms.registerSections() in client Next.js projects on boot.
 * Safe to call repeatedly — idempotent on (projectId, sectionType).
 */
export const upsert = mutation({
  args: {
    projectId: v.id('projects'),
    sectionType: v.string(),
    label: v.string(),
    fieldsSchema: v.string(), // JSON string from defineCMSSection
  },
  handler: async (ctx, { projectId, sectionType, label, fieldsSchema }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) {
      throw new Error('Project not found')
    }

    const existing = await ctx.db
      .query('section_registry')
      .withIndex('by_project_type', (q) =>
        q.eq('projectId', projectId).eq('sectionType', sectionType)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { label, fieldsSchema })
    } else {
      await ctx.db.insert('section_registry', {
        orgId,
        projectId,
        sectionType,
        label,
        fieldsSchema,
      })
    }
  },
})

/**
 * Public upsert — called by cms.registerSections() from a client Next.js project.
 * Auth is via registrationToken instead of Clerk (this runs server-side, not in-browser).
 * Idempotent: safe to call on every app boot.
 */
export const upsertPublic = mutation({
  args: {
    orgSlug: v.string(),
    registrationToken: v.string(),
    sectionType: v.string(),
    label: v.string(),
    fieldsSchema: v.string(),
  },
  handler: async (ctx, { orgSlug, registrationToken, sectionType, label, fieldsSchema }) => {
    // Resolve project by public slug
    const project = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', orgSlug))
      .unique()
    if (!project) throw new Error(`No project with slug "${orgSlug}"`)

    // Verify the registration token
    if (!project.registrationToken || project.registrationToken !== registrationToken) {
      throw new Error('Invalid registration token')
    }

    const existing = await ctx.db
      .query('section_registry')
      .withIndex('by_project_type', (q) =>
        q.eq('projectId', project._id).eq('sectionType', sectionType)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { label, fieldsSchema })
    } else {
      await ctx.db.insert('section_registry', {
        orgId: project.orgId,
        projectId: project._id,
        sectionType,
        label,
        fieldsSchema,
      })
    }
  },
})

/** Remove a section type from the registry */
export const remove = mutation({
  args: {
    projectId: v.id('projects'),
    sectionType: v.string(),
  },
  handler: async (ctx, { projectId, sectionType }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) {
      throw new Error('Project not found')
    }

    const entry = await ctx.db
      .query('section_registry')
      .withIndex('by_project_type', (q) =>
        q.eq('projectId', projectId).eq('sectionType', sectionType)
      )
      .unique()

    if (entry) await ctx.db.delete(entry._id)
  },
})
