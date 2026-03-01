'use client'

import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import { useAuth } from '@clerk/nextjs'
import { useMemo, type ReactNode } from 'react'

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!

export function OnboardingProviders({ children }: { children: ReactNode }) {
  const client = useMemo(() => new ConvexReactClient(CONVEX_URL), [])

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </ConvexProviderWithClerk>
  )
}
