'use client'

import type { ReactNode } from 'react'

/**
 * OnboardingProviders — Convex auth is now handled by the root
 * ConvexClientProvider in app/layout.tsx. This wrapper provides
 * the onboarding-specific layout chrome only.
 */
export function OnboardingProviders({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
