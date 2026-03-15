/**
 * Platform-wide analytics for superadmins.
 * Returns aggregated usage across all organizations.
 */

import { v } from 'convex/values'
import { query } from './_generated/server'
import { assertSuperadmin } from './superadmins'
import { getOrgPlanTier } from './lib/checkLimit'
import { getTierLimits } from './lib/plans'
import { getProjectContentItemCount, getOrgMediaStorageBytes } from './lib/usage'
import type { PlanTier } from './lib/plans'

/** Platform-wide usage summary: all orgs with their plan tiers and usage. */
export const getPlatformUsage = query({
  handler: async (ctx) => {
    await assertSuperadmin(ctx)

    const allProjects = await ctx.db.query('projects').collect()

    // Group projects by orgId
    const orgProjects = new Map<string, typeof allProjects>()
    for (const p of allProjects) {
      const list = orgProjects.get(p.orgId) ?? []
      list.push(p)
      orgProjects.set(p.orgId, list)
    }

    const tierDistribution: Record<PlanTier, number> = {
      free: 0,
      pro: 0,
      max: 0,
      enterprise: 0,
    }

    let totalStorageBytes = 0
    let totalContentItems = 0

    const orgs = []
    for (const [orgId, projects] of orgProjects) {
      const tier = await getOrgPlanTier(ctx, orgId)
      tierDistribution[tier]++

      const storageBytes = await getOrgMediaStorageBytes(ctx, orgId)
      totalStorageBytes += storageBytes

      let contentItemCount = 0
      for (const p of projects) {
        contentItemCount += await getProjectContentItemCount(ctx, p._id)
      }
      totalContentItems += contentItemCount

      orgs.push({
        orgId,
        tier,
        projectCount: projects.length,
        contentItemCount,
        storageBytes,
      })
    }

    // Sort by storage descending
    orgs.sort((a, b) => b.storageBytes - a.storageBytes)

    return {
      summary: {
        totalOrgs: orgProjects.size,
        totalProjects: allProjects.length,
        totalContentItems,
        totalStorageBytes,
        tierDistribution,
      },
      orgs,
    }
  },
})

/** Per-org project breakdown for superadmin drill-down. */
export const getOrgDetailedUsage = query({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    await assertSuperadmin(ctx)

    const tier = await getOrgPlanTier(ctx, orgId)
    const limits = getTierLimits(tier)
    const storageBytes = await getOrgMediaStorageBytes(ctx, orgId)

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_org', (q) => q.eq('orgId', orgId))
      .collect()

    const projectsUsage = []
    let totalContentItems = 0
    for (const p of projects) {
      const sections = await ctx.db
        .query('section_registry')
        .withIndex('by_project', (q) => q.eq('projectId', p._id))
        .collect()

      const contentItems = await getProjectContentItemCount(ctx, p._id)
      totalContentItems += contentItems

      const media = await ctx.db
        .query('media')
        .withIndex('by_project', (q) => q.eq('projectId', p._id))
        .collect()
      const mediaBytes = media.reduce((sum, m) => sum + (m.size ?? 0), 0)

      projectsUsage.push({
        _id: p._id,
        name: p.name,
        slug: p.slug,
        sectionCount: sections.filter((s) => !s.archivedAt).length,
        contentItems,
        mediaFileCount: media.length,
        mediaStorageBytes: mediaBytes,
      })
    }

    return {
      orgId,
      tier,
      limits,
      projectCount: projects.length,
      totalContentItems,
      storageBytes,
      projects: projectsUsage,
    }
  },
})
