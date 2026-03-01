'use client'

import { ConvexProviderWithBetterAuth } from '@/components/providers/ConvexProviderWithBetterAuth'
import type { ReactNode } from 'react'

export function SuperadminProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithBetterAuth>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          {children}
        </div>
      </div>
    </ConvexProviderWithBetterAuth>
  )
}
