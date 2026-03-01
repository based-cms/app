'use client'

import {
  ConvexProviderWithAuth,
  ConvexReactClient,
} from 'convex/react'
import { useCallback, useMemo, useRef, type ReactNode } from 'react'
import { authClient, useSession } from '@/lib/auth-client'

interface TokenCache {
  token: string
  expiry: number
}

/**
 * Custom useAuth hook for Convex integration with BetterAuth.
 * Provides isLoading, isAuthenticated, and fetchAccessToken
 * as required by ConvexProviderWithAuth.
 */
function useBetterAuth() {
  const { data: session, isPending } = useSession()
  const tokenCacheRef = useRef<TokenCache | null>(null)

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!session) return null

      // Return cached token if still valid and not forcing refresh
      const cached = tokenCacheRef.current
      if (!forceRefreshToken && cached && cached.expiry > Date.now()) {
        return cached.token
      }

      try {
        const result = await authClient.token()
        const token = 'data' in result ? result.data?.token : undefined
        if (token) {
          // Cache for 4 minutes (tokens typically last 5 minutes)
          tokenCacheRef.current = { token, expiry: Date.now() + 4 * 60 * 1000 }
          return token
        }
      } catch {
        tokenCacheRef.current = null
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
 * Drop-in replacement for ConvexProviderWithClerk.
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
