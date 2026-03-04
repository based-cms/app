/**
 * Simple in-memory sliding window rate limiter for Next.js API routes.
 * Not distributed — works per-process. For production at scale, use Redis/Upstash.
 */

interface RateLimitEntry {
  timestamps: number[]
}

const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  const cutoff = now - windowMs
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff)
    if (entry.timestamps.length === 0) store.delete(key)
  }
}

/**
 * Check and consume a rate limit token.
 * @returns `{ success: true }` or `{ success: false, retryAfterMs }`
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { success: boolean; retryAfterMs?: number } {
  cleanup(windowMs)

  const now = Date.now()
  const cutoff = now - windowMs
  const entry = store.get(key) ?? { timestamps: [] }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff)

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0]!
    return { success: false, retryAfterMs: oldest + windowMs - now }
  }

  entry.timestamps.push(now)
  store.set(key, entry)
  return { success: true }
}
