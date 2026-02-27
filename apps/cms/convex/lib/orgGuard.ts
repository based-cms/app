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

  // Clerk puts the org ID in the JWT as `org_id` (snake_case) — Convex does NOT
  // camelCase custom claims, so we must read `org_id` not `orgId`.
  const sessionOrgId = (identity as Record<string, unknown>)['org_id'] as string | undefined
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
  // Clerk JWT uses `org_id` (snake_case) — must use original claim name
  const orgId = (identity as Record<string, unknown>)['org_id'] as string | undefined
  if (!orgId) {
    throw new Error('No active organization in session')
  }
  return orgId
}
