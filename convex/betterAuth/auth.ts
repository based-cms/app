/**
 * Static auth export — used ONLY for schema generation.
 *
 * Run:
 *   cd convex/betterAuth && npx @better-auth/cli generate -y
 *
 * This creates an auth instance so the CLI can introspect plugins and
 * generate the correct schema. It is NOT used at runtime.
 */
import { createAuth } from '../auth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth = createAuth({} as any)
