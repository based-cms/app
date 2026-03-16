/**
 * Analytics queries for org admin dashboards.
 * Returns usage data for the org overview and per-project drill-down.
 */

import { v } from 'convex/values'
import { query } from './_generated/server'
import { requireOrgId, getOrgId } from './lib/orgGuard'
import { requireProjectAccess } from './lib/requireProjectAccess'
import { getOrgPlanTier } from './lib/checkLimit'
import { getTierLimits } from './lib/plans'
import {
  getOrgProjectCount,
  getProjectContentItemCount,
  getOrgMediaStorageBytes,
} from './lib/usage'

/** Org-wide usage summary: project count, total items, storage, plan tier + limits. */
export const getOrgUsage = query({
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx)
    if (!orgId) return null
    const tier = await getOrgPlanTier(ctx, orgId)
    const limits = getTierLimits(tier)

    const projectCount = await getOrgProjectCount(ctx, orgId)
    const storageBytes = await getOrgMediaStorageBytes(ctx, orgId)

    // Sum content items across all projects
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_org', (q) => q.eq('orgId', orgId))
      .collect()

    let totalContentItems = 0
    for (const p of projects) {
      totalContentItems += await getProjectContentItemCount(ctx, p._id)
    }

    return { tier, limits, projectCount, totalContentItems, storageBytes }
  },
})

/** Per-project usage stats for the org dashboard table. */
export const getProjectsUsage = query({
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx)
    if (!orgId) return []
    const projects = await ctx.db
      .query('projects')
      .withIndex('by_org', (q) => q.eq('orgId', orgId))
      .collect()

    const result = []
    for (const p of projects) {
      const sections = await ctx.db
        .query('section_registry')
        .withIndex('by_project', (q) => q.eq('projectId', p._id))
        .collect()

      const contentItems = await getProjectContentItemCount(ctx, p._id)

      const media = await ctx.db
        .query('media')
        .withIndex('by_project', (q) => q.eq('projectId', p._id))
        .collect()
      const mediaStorageBytes = media.reduce((sum, m) => sum + (m.size ?? 0), 0)

      result.push({
        _id: p._id,
        name: p.name,
        slug: p.slug,
        sectionCount: sections.filter((s) => !s.archivedAt).length,
        contentItems,
        mediaFileCount: media.length,
        mediaStorageBytes,
      })
    }

    return result
  },
})

/** Detailed usage for a single project: section breakdown + media stats. */
export const getProjectDetailedUsage = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    await requireProjectAccess(ctx, projectId)

    const project = await ctx.db.get(projectId)
    if (!project) return null

    // Section breakdown
    const registries = await ctx.db
      .query('section_registry')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect()

    const sections = []
    for (const reg of registries) {
      if (reg.archivedAt) continue
      const content = await ctx.db
        .query('section_content')
        .withIndex('by_project_type_env', (q) =>
          q
            .eq('projectId', projectId)
            .eq('sectionType', reg.sectionType)
            .eq('env', 'production')
        )
        .unique()
      sections.push({
        sectionType: reg.sectionType,
        label: reg.label,
        itemCount: content?.items?.length ?? 0,
      })
    }

    // Media stats
    const media = await ctx.db
      .query('media')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect()
    const mediaStorageBytes = media.reduce((sum, m) => sum + (m.size ?? 0), 0)

    const totalContentItems = sections.reduce((sum, s) => sum + s.itemCount, 0)

    return {
      name: project.name,
      sectionCount: sections.length,
      totalContentItems,
      mediaFileCount: media.length,
      mediaStorageBytes,
      sections,
    }
  },
})
