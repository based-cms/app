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
      await ctx.db.patch(existing._id, { label, fieldsSchema, archivedAt: undefined })
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
 * Public upsert — called by older @based-cms/client versions on boot.
 * Auth is via registrationToken (UUID) instead of a user session.
 * Kept for backwards compatibility. Does NOT trigger archiving —
 * upgrade to syncPublic (via updated @based-cms/client) for archive support.
 */
export const upsertPublic = mutation({
  args: {
    registrationToken: v.string(),
    sectionType: v.string(),
    label: v.string(),
    fieldsSchema: v.string(),
  },
  handler: async (ctx, { registrationToken, sectionType, label, fieldsSchema }) => {
    const project = await ctx.db
      .query('projects')
      .withIndex('by_token', (q) => q.eq('registrationToken', registrationToken))
      .unique()
    if (!project) throw new Error('Invalid registration token')

    const existing = await ctx.db
      .query('section_registry')
      .withIndex('by_project_type', (q) =>
        q.eq('projectId', project._id).eq('sectionType', sectionType)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { label, fieldsSchema, archivedAt: undefined })
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

/**
 * Sync all sections for a project in one transaction.
 * Called by updated @based-cms/client registerSections() on boot.
 * - Upserts all provided sections (and unarchives any that were archived)
 * - Archives any existing sections NOT in the provided list
 * Auth via registrationToken (no user session needed).
 */
export const syncPublic = mutation({
  args: {
    registrationToken: v.string(),
    sections: v.array(
      v.object({
        sectionType: v.string(),
        label: v.string(),
        fieldsSchema: v.string(),
      })
    ),
  },
  handler: async (ctx, { registrationToken, sections }) => {
    const project = await ctx.db
      .query('projects')
      .withIndex('by_token', (q) => q.eq('registrationToken', registrationToken))
      .unique()
    if (!project) throw new Error('Invalid registration token')

    const activeSectionTypes = new Set(sections.map((s) => s.sectionType))

    // Upsert each provided section
    for (const section of sections) {
      const existing = await ctx.db
        .query('section_registry')
        .withIndex('by_project_type', (q) =>
          q.eq('projectId', project._id).eq('sectionType', section.sectionType)
        )
        .unique()

      if (existing) {
        await ctx.db.patch(existing._id, {
          label: section.label,
          fieldsSchema: section.fieldsSchema,
          archivedAt: undefined, // unarchive if previously archived
        })
      } else {
        await ctx.db.insert('section_registry', {
          orgId: project.orgId,
          projectId: project._id,
          sectionType: section.sectionType,
          label: section.label,
          fieldsSchema: section.fieldsSchema,
        })
      }
    }

    // Archive any registry entries not in the current list
    const allEntries = await ctx.db
      .query('section_registry')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .collect()

    const now = Date.now()
    for (const entry of allEntries) {
      if (!activeSectionTypes.has(entry.sectionType) && !entry.archivedAt) {
        await ctx.db.patch(entry._id, { archivedAt: now })
      }
    }
  },
})

/** Restore an archived section (admin only) */
export const restore = mutation({
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

    if (entry) await ctx.db.patch(entry._id, { archivedAt: undefined })
  },
})

/**
 * Permanently delete a section — removes registry entry AND all content
 * for that section type across both envs. Admin only.
 */
export const permanentDelete = mutation({
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

    // Delete registry entry
    const entry = await ctx.db
      .query('section_registry')
      .withIndex('by_project_type', (q) =>
        q.eq('projectId', projectId).eq('sectionType', sectionType)
      )
      .unique()
    if (entry) await ctx.db.delete(entry._id)

    // Delete all content for this section type (both envs)
    const content = await ctx.db
      .query('section_content')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect()
    for (const doc of content) {
      if (doc.sectionType === sectionType) {
        await ctx.db.delete(doc._id)
      }
    }
  },
})

/** Remove a section type from the registry (hard delete, no content cleanup) */
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
