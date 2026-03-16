/**
 * Billing functions — exposes Polar checkout/portal API to the frontend
 * and provides a custom query for the billing dashboard.
 */

import { query, action } from './_generated/server'
import { polar } from './polar'
import { getOrgId } from './lib/orgGuard'
import { getOrgPlanTier } from './lib/checkLimit'
import { getTierLimits } from './lib/plans'
import { getOrgProjectCount, getOrgMediaStorageBytes } from './lib/usage'

// ─── Polar convenience API ──────────────────────────────────────────────────
// These are re-exported from the Polar component so the frontend can call them
// via api.billing.generateCheckoutLink, etc.

const polarApi = polar.api()

export const generateCheckoutLink = polarApi.generateCheckoutLink
export const generateCustomerPortalUrl = polarApi.generateCustomerPortalUrl
export const getConfiguredProducts = polarApi.getConfiguredProducts
export const listAllSubscriptions = polarApi.listAllSubscriptions
export const changeCurrentSubscription = polarApi.changeCurrentSubscription
export const cancelCurrentSubscription = polarApi.cancelCurrentSubscription

/** Sync products from Polar API into Convex DB. Call once after creating products in Polar dashboard. */
export const syncProducts = action({
  handler: async (ctx) => {
    await polar.syncProducts(ctx)
  },
})

// ─── Custom queries ─────────────────────────────────────────────────────────

/** Returns the current org's plan tier, limits, and usage for the billing page. */
export const getBillingInfo = query({
  handler: async (ctx) => {
    const orgId = await getOrgId(ctx)
    if (!orgId) return null
    const tier = await getOrgPlanTier(ctx, orgId)
    const limits = getTierLimits(tier)
    const projectCount = await getOrgProjectCount(ctx, orgId)
    const storageBytes = await getOrgMediaStorageBytes(ctx, orgId)
    return { tier, limits, projectCount, storageBytes }
  },
})
