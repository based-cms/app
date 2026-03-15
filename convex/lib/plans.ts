/**
 * Plan tier definitions and limit constants.
 *
 * null = unlimited. Pricing and product IDs live in Polar dashboard;
 * this file only defines the limits enforced at mutation time.
 */

export const PLAN_TIERS = {
  free: {
    maxProjects: 3,
    maxContentItemsPerProject: 15,
    maxStorageBytes: 100 * 1024 * 1024, // 100 MB
  },
  pro: {
    maxProjects: 50,
    maxContentItemsPerProject: 500,
    maxStorageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
  },
  max: {
    maxProjects: null,
    maxContentItemsPerProject: null,
    maxStorageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
  },
  enterprise: {
    maxProjects: null,
    maxContentItemsPerProject: null,
    maxStorageBytes: null, // unlimited
  },
} as const

export type PlanTier = keyof typeof PLAN_TIERS

export type TierLimits = (typeof PLAN_TIERS)[PlanTier]

export function getTierLimits(tier: PlanTier): TierLimits {
  return PLAN_TIERS[tier]
}

