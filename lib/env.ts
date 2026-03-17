/**
 * Validated environment variables — import this instead of using process.env directly.
 *
 * IMPORTANT: NEXT_PUBLIC_* vars must be accessed as literal `process.env.NEXT_PUBLIC_X`
 * so that Next.js can inline them at build time for client components.
 * Dynamic access via `process.env[name]` does NOT work on the client side.
 */

/** Convex deployment URL (e.g. https://happy-animal-123.eu-west-1.convex.cloud) */
export const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!

/** Convex HTTP actions site URL (e.g. https://happy-animal-123.eu-west-1.convex.site) */
export const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!
