'use client'

import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import { useAuth } from '@clerk/nextjs'
import { useMemo, type ReactNode } from 'react'

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!

export function SuperadminProviders({ children }: { children: ReactNode }) {
  const client = useMemo(() => new ConvexReactClient(CONVEX_URL), [])

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          {children}
        </div>
      </div>
    </ConvexProviderWithClerk>
  )
}
