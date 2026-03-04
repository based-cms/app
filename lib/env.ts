/**
 * Validated environment variables — import this instead of using process.env directly.
 * Throws at import time if any required variable is missing.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      'Check .example.env for required variables.'
    )
  }
  return value
}

/** Convex deployment URL (e.g. https://happy-animal-123.eu-west-1.convex.cloud) */
export const CONVEX_URL = requireEnv('NEXT_PUBLIC_CONVEX_URL')

/** Convex HTTP actions site URL (e.g. https://happy-animal-123.eu-west-1.convex.site) */
export const CONVEX_SITE_URL = requireEnv('NEXT_PUBLIC_CONVEX_SITE_URL')
