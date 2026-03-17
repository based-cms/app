'use client'

import { type ReactNode, useMemo } from 'react'
import { ConvexReactClient } from 'convex/react'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { authClient } from '@/lib/auth-client'
import { CONVEX_URL } from '@/lib/env'

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode
  initialToken?: string | null
}) {
  // Track active org so we can force-remount the auth provider on org switch.
  // ConvexBetterAuthProvider only refreshes its JWT when session.id changes,
  // but switching orgs keeps the same session — so the cached JWT retains the
  // old org's activeOrganizationId. Keying on activeOrg.id forces a remount,
  // which clears the cached token and fetches a fresh JWT with the new org.
  const { data: activeOrg } = authClient.useActiveOrganization()
  const client = useMemo(() => new ConvexReactClient(CONVEX_URL), [])

  return (
    <ConvexBetterAuthProvider
      key={activeOrg?.id ?? 'no-org'}
      client={client}
      authClient={authClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  )
}
