'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConvexAuth } from 'convex/react'
import { authClient } from '@/lib/auth-client'
import { resolvePostAuthRoute } from '@/lib/org-routing'

/**
 * Holds rendering until Convex auth is confirmed.
 * Prevents all child pages from firing authenticated queries before
 * the auth provider has obtained and passed a JWT to the Convex client.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const [isResolvingOrgRoute, setIsResolvingOrgRoute] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function resolveRoute() {
      if (isLoading) return

      if (!isAuthenticated) {
        setIsResolvingOrgRoute(false)
        return
      }

      if (activeOrg?.id) {
        setIsResolvingOrgRoute(false)
        return
      }

      const destination = await resolvePostAuthRoute()
      if (cancelled) return

      if (destination !== '/admin') {
        router.replace(destination)
        return
      }

      setIsResolvingOrgRoute(false)
    }

    void resolveRoute()
    return () => {
      cancelled = true
    }
  }, [activeOrg?.id, isAuthenticated, isLoading, router])

  if (isLoading || isResolvingOrgRoute || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
