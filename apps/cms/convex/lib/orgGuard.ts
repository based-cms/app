import { QueryCtx, MutationCtx } from '../_generated/server'

/**
 * Asserts the caller belongs to the given org.
 * Used in mutations to prevent cross-org writes.
 * Full Clerk auth validation happens here — proxy.ts only does a lightweight cookie check.
 */
export async function assertOrgAccess(
  ctx: QueryCtx | MutationCtx,
  orgId: string
): Promise<void> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Unauthenticated')
  }

  // Clerk puts the org ID in the JWT as `org_id` when an org session is active
  const sessionOrgId = identity.orgId as string | undefined
  if (!sessionOrgId || sessionOrgId !== orgId) {
    throw new Error('Unauthorized: org mismatch')
  }
}

/**
 * Returns the orgId from the current Clerk session.
 * Throws if unauthenticated or no org is active.
 */
export async function requireOrgId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Unauthenticated')
  }
  const orgId = identity.orgId as string | undefined
  if (!orgId) {
    throw new Error('No active organization in session')
  }
  return orgId
}
