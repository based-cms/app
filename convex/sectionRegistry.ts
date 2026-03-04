import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import { requireOrgId } from './lib/orgGuard'
import { rateLimit } from './lib/rateLimits'
import { validateSectionType, validateName, validateFieldsSchema } from './lib/validators'
import { sha256 } from './lib/hash'

/**
 * Look up a project by registration token using dual-read strategy:
 * 1. Hash the token, check by_token_hash index
 * 2. If miss, fall back to plaintext by_token index (migration compat)
 * 3. On plaintext match, backfill the hash for future lookups
 */
async function lookupProjectByToken(
  ctx: MutationCtx,
  registrationToken: string
): Promise<Doc<'projects'>> {
  const hash = await sha256(registrationToken)

  // Try hash-based lookup first
  const byHash = await ctx.db
    .query('projects')
    .withIndex('by_token_hash', (q) => q.eq('registrationTokenHash', hash))
    .unique()
  if (byHash) return byHash

  // Fall back to plaintext lookup (for pre-migration tokens)
  const byPlaintext = await ctx.db
    .query('projects')
    .withIndex('by_token', (q) => q.eq('registrationToken', registrationToken))
    .unique()
  if (!byPlaintext) throw new Error('Invalid registration token')

  // Backfill hash for this token
  await ctx.db.patch(byPlaintext._id, { registrationTokenHash: hash })
  return byPlaintext
}

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
      .take(100)
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
    const safeSectionType = validateSectionType(sectionType)
    const safeLabel = validateName(label)
    const safeFieldsSchema = validateFieldsSchema(fieldsSchema)

    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) {
      throw new Error('Project not found')
    }

    const existing = await ctx.db
      .query('section_registry')
      .withIndex('by_project_type', (q) =>
        q.eq('projectId', projectId).eq('sectionType', safeSectionType)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { label: safeLabel, fieldsSchema: safeFieldsSchema, archivedAt: undefined })
    } else {
      await ctx.db.insert('section_registry', {
        orgId,
        projectId,
        sectionType: safeSectionType,
        label: safeLabel,
        fieldsSchema: safeFieldsSchema,
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
    await rateLimit(ctx, { name: 'tokenAuth', key: registrationToken })
    const safeSectionType = validateSectionType(sectionType)
    const safeLabel = validateName(label)
    const safeFieldsSchema = validateFieldsSchema(fieldsSchema)

    const project = await lookupProjectByToken(ctx, registrationToken)

    const existing = await ctx.db
      .query('section_registry')
      .withIndex('by_project_type', (q) =>
        q.eq('projectId', project._id).eq('sectionType', safeSectionType)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { label: safeLabel, fieldsSchema: safeFieldsSchema, archivedAt: undefined })
    } else {
      await ctx.db.insert('section_registry', {
        orgId: project.orgId,
        projectId: project._id,
        sectionType: safeSectionType,
        label: safeLabel,
        fieldsSchema: safeFieldsSchema,
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
    await rateLimit(ctx, { name: 'tokenAuth', key: registrationToken })

    const project = await lookupProjectByToken(ctx, registrationToken)

    // Validate all sections upfront
    const validatedSections = sections.map((s) => ({
      sectionType: validateSectionType(s.sectionType),
      label: validateName(s.label),
      fieldsSchema: validateFieldsSchema(s.fieldsSchema),
    }))

    const activeSectionTypes = new Set(validatedSections.map((s) => s.sectionType))

    // Upsert each provided section
    for (const section of validatedSections) {
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
      .take(200)

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
