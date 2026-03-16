import { QueryCtx, MutationCtx } from '../_generated/server'

/**
 * Asserts the caller belongs to the given org.
 * Used in mutations to prevent cross-org writes.
 *
 * Better Auth includes `activeOrganizationId` in the JWT via the
 * `definePayload` option in the convex() plugin (see convex/auth.ts).
 */
export async function assertOrgAccess(
  ctx: QueryCtx | MutationCtx,
  orgId: string
): Promise<void> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Unauthenticated')
  }

  const sessionOrgId = (identity as Record<string, unknown>)[
    'activeOrganizationId'
  ] as string | undefined
  if (!sessionOrgId || sessionOrgId !== orgId) {
    throw new Error('Unauthorized: org mismatch')
  }
}

/**
 * Returns the orgId from the current Better Auth session, or null if
 * not yet available. Use in queries so they can gracefully return empty
 * results during the auth handshake (before the JWT includes the org claim).
 */
export async function getOrgId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  const orgId = (identity as Record<string, unknown>)[
    'activeOrganizationId'
  ] as string | undefined
  return orgId ?? null
}

/**
 * Returns the orgId from the current Better Auth session.
 * Throws if unauthenticated or no org is active.
 * Use in mutations where the org MUST be present.
 *
 * The `activeOrganizationId` JWT claim is set when the user calls
 * `authClient.organization.setActive()` on the client.
 */
export async function requireOrgId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const orgId = await getOrgId(ctx)
  if (!orgId) {
    throw new Error('No active organization in session')
  }
  return orgId
}
