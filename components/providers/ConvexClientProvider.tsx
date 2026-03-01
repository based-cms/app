'use client'

import { type ReactNode, useMemo } from 'react'
import { ConvexReactClient } from 'convex/react'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { authClient } from '@/lib/auth-client'

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode
  initialToken?: string | null
}) {
  const client = useMemo(() => new ConvexReactClient(CONVEX_URL), [])

  return (
    <ConvexBetterAuthProvider
      client={client}
      authClient={authClient}
      initialToken={initialToken}
    >
      {children}
    </ConvexBetterAuthProvider>
  )
}
