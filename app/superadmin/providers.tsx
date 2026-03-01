'use client'

import type { ReactNode } from 'react'

/**
 * SuperadminProviders — Convex auth is now handled by the root
 * ConvexClientProvider in app/layout.tsx. This wrapper provides
 * the superadmin-specific layout chrome only.
 */
export function SuperadminProviders({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {children}
      </div>
    </div>
  )
}
