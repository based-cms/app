'use client'

import { useConvexAuth } from 'convex/react'

/**
 * Holds rendering until Convex auth is confirmed.
 * Prevents all child pages from firing authenticated queries before
 * ConvexProviderWithClerk has obtained and passed a JWT to the Convex client.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
