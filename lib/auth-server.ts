import { convexBetterAuthNextJs } from '@convex-dev/better-auth/nextjs'
import { CONVEX_URL, CONVEX_SITE_URL } from '@/lib/env'

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: CONVEX_URL,
  convexSiteUrl: CONVEX_SITE_URL,
})
