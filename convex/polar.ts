/**
 * Polar billing client — instantiated with the registered component.
 *
 * Uses orgId as the Polar "userId" so subscriptions map 1:1 to orgs.
 * Product keys (pro/max/enterprise) match PlanTier names directly,
 * so getCurrentSubscription().productKey is the tier.
 */

import { Polar } from '@convex-dev/polar'
import { components } from './_generated/api'
import type { QueryCtx } from './_generated/server'

export const polar = new Polar(components.polar, {
  products: {
    pro: process.env.POLAR_PRODUCT_PRO ?? '',
    max: process.env.POLAR_PRODUCT_MAX ?? '',
    enterprise: process.env.POLAR_PRODUCT_ENTERPRISE ?? '',
  },
  getUserInfo: async (ctx) => {
    // Use orgId as Polar userId — billing is per-org, not per-user
    // Cast: RunQueryCtx doesn't include auth, but our app ctx always has it
    const identity = await (ctx as unknown as QueryCtx).auth.getUserIdentity()
    if (!identity) throw new Error('Unauthenticated')
    const orgId = (identity as Record<string, unknown>)
      .activeOrganizationId as string | undefined
    if (!orgId) throw new Error('No active organization')
    return { userId: orgId, email: identity.email as string }
  },
  server: (process.env.POLAR_SERVER as 'sandbox' | 'production') ?? 'sandbox',
})
