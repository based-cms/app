/**
 * Helpers for handling PLAN_LIMIT_EXCEEDED errors from Convex mutations.
 */

import { ConvexError } from 'convex/values'

export interface PlanLimitData {
  code: 'PLAN_LIMIT_EXCEEDED'
  resource: string
  current: number
  limit: number
  tier: string
}

export function isPlanLimitError(
  err: unknown
): err is { data: PlanLimitData } {
  return (
    err instanceof ConvexError &&
    (err.data as Record<string, unknown>)?.code === 'PLAN_LIMIT_EXCEEDED'
  )
}

const RESOURCE_LABELS: Record<string, string> = {
  projects: 'project',
  contentItems: 'content item',
  mediaStorage: 'storage',
}

export function planLimitMessage(data: PlanLimitData): string {
  const label = RESOURCE_LABELS[data.resource] ?? data.resource
  const tierName = data.tier.charAt(0).toUpperCase() + data.tier.slice(1)
  return `You've reached the ${label} limit on the ${tierName} plan. Upgrade to continue.`
}
