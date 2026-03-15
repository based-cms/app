/**
 * Usage aggregation helpers.
 *
 * Plain async functions (not Convex query/mutation definitions) that
 * take a Convex context and return usage counts for limit enforcement
 * and analytics dashboards.
 */

import type { QueryCtx, MutationCtx } from '../_generated/server'
import type { Id } from '../_generated/dataModel'

type Ctx = QueryCtx | MutationCtx

/** Count projects owned by an org. */
export async function getOrgProjectCount(
  ctx: Ctx,
  orgId: string
): Promise<number> {
  const projects = await ctx.db
    .query('projects')
    .withIndex('by_org', (q) => q.eq('orgId', orgId))
    .collect()
  return projects.length
}

/**
 * Count total content items across all sections in a project.
 * Each section_content doc holds an `items` array; we sum their lengths.
 */
export async function getProjectContentItemCount(
  ctx: Ctx,
  projectId: Id<'projects'>
): Promise<number> {
  const docs = await ctx.db
    .query('section_content')
    .withIndex('by_project', (q) => q.eq('projectId', projectId))
    .collect()
  return docs.reduce((sum, doc) => sum + (doc.items?.length ?? 0), 0)
}

/**
 * Sum media storage (bytes) for an entire org across all projects.
 * Uses the by_org index on the media table.
 */
export async function getOrgMediaStorageBytes(
  ctx: Ctx,
  orgId: string
): Promise<number> {
  const docs = await ctx.db
    .query('media')
    .withIndex('by_org', (q) => q.eq('orgId', orgId))
    .collect()
  return docs.reduce((sum, doc) => sum + (doc.size ?? 0), 0)
}
