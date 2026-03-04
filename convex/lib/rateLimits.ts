import { defineRateLimits } from 'convex-helpers/server/rateLimit'

/**
 * Central rate limit definitions for Convex mutations/queries.
 * Uses convex-helpers token bucket implementation (stored in Convex DB).
 */
export const { checkRateLimit, rateLimit, resetRateLimit } = defineRateLimits({
  // Token-auth mutations (upsertPublic, syncPublic) — 30 req/min per token
  tokenAuth: { kind: 'token bucket', rate: 30, period: 60_000, capacity: 30 },

  // Upload URL generation — 20 req/min per user
  uploadUrl: { kind: 'token bucket', rate: 20, period: 60_000, capacity: 20 },

  // Public getPublic query — 100 req/min per slug
  publicQuery: { kind: 'token bucket', rate: 100, period: 60_000, capacity: 100 },
})
