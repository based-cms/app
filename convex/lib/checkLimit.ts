/**
 * Limit enforcement helpers.
 *
 * Each check resolves the org's current plan tier via Polar subscription,
 * queries current usage, and throws a ConvexError with structured data
 * if the limit is exceeded. The frontend can catch these to show upgrade CTAs.
 */

import { ConvexError } from 'convex/values'
import type { QueryCtx, MutationCtx } from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import { type PlanTier, PLAN_TIERS, getTierLimits } from './plans'
import {
  getOrgProjectCount,
  getProjectContentItemCount,
  getOrgMediaStorageBytes,
} from './usage'
import { polar } from '../polar'

type Ctx = QueryCtx | MutationCtx

/**
 * Resolve the plan tier for an org from their active Polar subscription.
 * Returns "free" if no active subscription exists.
 *
 * The Polar client's product keys (pro/max/enterprise) match our PlanTier names,
 * so subscription.productKey maps directly to a tier.
 */
export async function getOrgPlanTier(
  ctx: Ctx,
  orgId: string
): Promise<PlanTier> {
  const sub = await polar.getCurrentSubscription(ctx, { userId: orgId })
  if (!sub) return 'free'

  const tier = sub.productKey as PlanTier | undefined
  return tier && tier in PLAN_TIERS ? tier : 'free'
}

/** Throw if the org has reached its project limit. */
export async function checkProjectLimit(
  ctx: MutationCtx,
  orgId: string
): Promise<void> {
  const tier = await getOrgPlanTier(ctx, orgId)
  const { maxProjects } = getTierLimits(tier)
  if (maxProjects === null) return

  const current = await getOrgProjectCount(ctx, orgId)
  if (current >= maxProjects) {
    throw new ConvexError({
      code: 'PLAN_LIMIT_EXCEEDED' as const,
      resource: 'projects' as const,
      current,
      limit: maxProjects,
      tier,
    })
  }
}

/**
 * Throw if setting items for a section would exceed the per-project content item limit.
 *
 * Counts items in all *other* sections, then adds `newItemCount` (the items
 * about to be written for `sectionType`).  This works because setItems
 * replaces the full items array for a section.
 */
export async function checkContentItemLimit(
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  sectionType: string,
  newItemCount: number
): Promise<void> {
  // Resolve tier via project's orgId
  const project = await ctx.db.get(projectId)
  if (!project) return
  const tier = await getOrgPlanTier(ctx, project.orgId)
  const { maxContentItemsPerProject } = getTierLimits(tier)
  if (maxContentItemsPerProject === null) return

  // Total items in other sections + the new items for this section
  const docs = await ctx.db
    .query('section_content')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()

  const otherItemsCount = docs
    .filter((doc) => doc.sectionType !== sectionType)
    .reduce((sum, doc) => sum + (doc.items?.length ?? 0), 0)

  const totalAfter = otherItemsCount + newItemCount
  if (totalAfter > maxContentItemsPerProject) {
    throw new ConvexError({
      code: 'PLAN_LIMIT_EXCEEDED' as const,
      resource: 'contentItems' as const,
      current: totalAfter,
      limit: maxContentItemsPerProject,
      tier,
    })
  }
}

/** Throw if uploading `additionalBytes` would exceed the org's storage limit. */
export async function checkMediaStorageLimit(
  ctx: MutationCtx,
  orgId: string,
  additionalBytes: number
): Promise<void> {
  const tier = await getOrgPlanTier(ctx, orgId)
  const { maxStorageBytes } = getTierLimits(tier)
  if (maxStorageBytes === null) return

  const currentBytes = await getOrgMediaStorageBytes(ctx, orgId)
  const totalAfter = currentBytes + additionalBytes
  if (totalAfter > maxStorageBytes) {
    throw new ConvexError({
      code: 'PLAN_LIMIT_EXCEEDED' as const,
      resource: 'mediaStorage' as const,
      current: currentBytes,
      limit: maxStorageBytes,
      tier,
    })
  }
}
