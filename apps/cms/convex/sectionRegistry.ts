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
