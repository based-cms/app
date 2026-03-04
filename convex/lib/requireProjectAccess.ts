import type { QueryCtx, MutationCtx } from '../_generated/server'
import type { Id, Doc } from '../_generated/dataModel'
import { requireOrgId } from './orgGuard'

/**
 * Asserts the caller has access to the given project (org ownership check).
 * Returns the project document and orgId if authorized.
 * Throws if unauthenticated, no active org, or project doesn't belong to org.
 */
export async function requireProjectAccess(
  ctx: QueryCtx | MutationCtx,
  projectId: Id<'projects'>
): Promise<{ project: Doc<'projects'>; orgId: string }> {
  const orgId = await requireOrgId(ctx)
  const project = await ctx.db.get(projectId)
  if (!project || project.orgId !== orgId) {
    throw new Error('Project not found')
  }
  return { project, orgId }
}
