import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireOrgId } from './lib/orgGuard'
import { validateItems } from './lib/validateItems'

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Get content for a section — authenticated (used by CMS admin).
 * Returns null if no content has been saved yet.
 */
export const get = query({
  args: {
    projectId: v.id('projects'),
    sectionType: v.string(),
    env: v.literal('production'),
  },
  handler: async (ctx, { projectId, sectionType, env }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) return null

    return ctx.db
      .query('section_content')
      .withIndex('by_project_type_env', (q) =>
        q.eq('projectId', projectId).eq('sectionType', sectionType).eq('env', env)
      )
      .unique()
  },
})

/**
 * Public query — used by cms.useSection() in client Next.js projects.
 * No auth required. Uses orgSlug as the public identifier.
 */
export const getPublic = query({
  args: {
    orgSlug: v.string(),
    sectionType: v.string(),
    env: v.literal('production'),
  },
  handler: async (ctx, { orgSlug, sectionType, env }) => {
    // Look up project by slug (public identifier)
    const project = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', orgSlug))
      .unique()
    if (!project) return []

    const doc = await ctx.db
      .query('section_content')
      .withIndex('by_project_type_env', (q) =>
        q
          .eq('projectId', project._id)
          .eq('sectionType', sectionType)
          .eq('env', env)
      )
      .unique()

    return doc?.items ?? []
  },
})

/**
 * Get ALL content for a project — for migration.
 * Returns every section_content document for the project.
 */
export const getAllForProject = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) return []

    return ctx.db
      .query('section_content')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .take(500)
  },
})

/**
 * Get ALL content for a project by slug — for cross-deployment migration reads.
 */
export const getAllBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
    if (!project || project.orgId !== orgId) return []

    return ctx.db
      .query('section_content')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .take(500)
  },
})

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Set all items for a section — replaces the full items array.
 * Used by the CMS inline editor (auto-save on blur).
 */
export const setItems = mutation({
  args: {
    projectId: v.id('projects'),
    sectionType: v.string(),
    env: v.literal('production'),
    items: v.array(v.any()),
  },
  handler: async (ctx, { projectId, sectionType, env, items }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) {
      throw new Error('Project not found')
    }

    // Validate items against the section's fieldsSchema
    const registry = await ctx.db
      .query('section_registry')
      .withIndex('by_project_type', (q) =>
        q.eq('projectId', projectId).eq('sectionType', sectionType)
      )
      .unique()
    const validatedItems = registry
      ? validateItems(items, registry.fieldsSchema)
      : items

    const existing = await ctx.db
      .query('section_content')
      .withIndex('by_project_type_env', (q) =>
        q.eq('projectId', projectId).eq('sectionType', sectionType).eq('env', env)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { items: validatedItems })
    } else {
      await ctx.db.insert('section_content', {
        orgId,
        projectId,
        sectionType,
        env,
        items: validatedItems,
      })
    }
  },
})

/**
 * Set items by project slug — for cross-deployment migration writes.
 * Upserts content for a given (slug, sectionType, env).
 */
export const setItemsBySlug = mutation({
  args: {
    slug: v.string(),
    sectionType: v.string(),
    env: v.literal('production'),
    items: v.array(v.any()),
  },
  handler: async (ctx, { slug, sectionType, env, items }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db
      .query('projects')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique()
    if (!project || project.orgId !== orgId) {
      throw new Error('Project not found')
    }

    // Validate items against the section's fieldsSchema
    const registry = await ctx.db
      .query('section_registry')
      .withIndex('by_project_type', (q) =>
        q.eq('projectId', project._id).eq('sectionType', sectionType)
      )
      .unique()
    const validatedItems = registry
      ? validateItems(items, registry.fieldsSchema)
      : items

    const existing = await ctx.db
      .query('section_content')
      .withIndex('by_project_type_env', (q) =>
        q
          .eq('projectId', project._id)
          .eq('sectionType', sectionType)
          .eq('env', env)
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, { items: validatedItems })
    } else {
      await ctx.db.insert('section_content', {
        orgId,
        projectId: project._id,
        sectionType,
        env,
        items: validatedItems,
      })
    }
  },
})

/** Copy all content from one env to the other (e.g. preview → production) */
export const copyEnv = mutation({
  args: {
    projectId: v.id('projects'),
    fromEnv: v.literal('production'),
    toEnv: v.literal('production'),
  },
  handler: async (ctx, { projectId, fromEnv, toEnv }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) {
      throw new Error('Project not found')
    }

    // Get all section types from registry
    const registry = await ctx.db
      .query('section_registry')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect()

    for (const entry of registry) {
      const source = await ctx.db
        .query('section_content')
        .withIndex('by_project_type_env', (q) =>
          q
            .eq('projectId', projectId)
            .eq('sectionType', entry.sectionType)
            .eq('env', fromEnv)
        )
        .unique()

      if (!source) continue

      const dest = await ctx.db
        .query('section_content')
        .withIndex('by_project_type_env', (q) =>
          q
            .eq('projectId', projectId)
            .eq('sectionType', entry.sectionType)
            .eq('env', toEnv)
        )
        .unique()

      if (dest) {
        await ctx.db.patch(dest._id, { items: source.items })
      } else {
        await ctx.db.insert('section_content', {
          orgId,
          projectId,
          sectionType: entry.sectionType,
          env: toEnv,
          items: source.items,
        })
      }
    }
  },
})
