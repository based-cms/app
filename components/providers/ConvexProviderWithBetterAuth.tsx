'use client'

import {
  ConvexProviderWithAuth,
  ConvexReactClient,
} from 'convex/react'
import { useCallback, useMemo, type ReactNode } from 'react'
import { authClient, useSession } from '@/lib/auth-client'

interface TokenCache {
  token: string
  expiry: number
}

let cachedToken: TokenCache | null = null

/**
 * Custom useAuth hook for Convex integration with BetterAuth.
 * Provides isLoading, isAuthenticated, and fetchAccessToken
 * as required by ConvexProviderWithAuth.
 */
function useBetterAuth() {
  const { data: session, isPending } = useSession()

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!session) return null

      // Return cached token if still valid and not forcing refresh
      if (!forceRefreshToken && cachedToken && cachedToken.expiry > Date.now()) {
        return cachedToken.token
      }

      try {
        const { token } = await authClient.token()
        if (token) {
          // Cache for 4 minutes (tokens typically last 5 minutes)
          cachedToken = { token, expiry: Date.now() + 4 * 60 * 1000 }
          return token
        }
      } catch {
        cachedToken = null
      }
      return null
    },
    [session]
  )

  return useMemo(
    () => ({
      isLoading: isPending,
      isAuthenticated: !!session,
      fetchAccessToken,
    }),
    [isPending, session, fetchAccessToken]
  )
}

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!

/**
 * Convex provider that uses BetterAuth for authentication.
 * Replaces ConvexProviderWithClerk.
 */
export function ConvexProviderWithBetterAuth({
  children,
}: {
  children: ReactNode
}) {
  const client = useMemo(() => new ConvexReactClient(CONVEX_URL), [])

  return (
    <ConvexProviderWithAuth client={client} useAuth={useBetterAuth}>
      {children}
    </ConvexProviderWithAuth>
  )
}
