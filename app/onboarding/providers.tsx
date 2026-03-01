'use client'

import { ConvexProviderWithBetterAuth } from '@/components/providers/ConvexProviderWithBetterAuth'
import type { ReactNode } from 'react'

export function OnboardingProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithBetterAuth>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </ConvexProviderWithBetterAuth>
  )
}
