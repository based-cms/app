'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { createContext, useContext, useMemo, type ReactNode } from 'react'

// ─── Context ─────────────────────────────────────────────────────────────────

interface CMSContextValue {
  orgSlug: string
  env: 'production' | 'preview'
}

const CMSContext = createContext<CMSContextValue | null>(null)

export function useCMSContext(): CMSContextValue {
  const ctx = useContext(CMSContext)
  if (!ctx) {
    throw new Error(
      '[cms-client] useSection must be used inside <CMSProvider>. ' +
        'Wrap your app in <CMSProvider slug={...} convexUrl={...}> in a client component.'
    )
  }
  return ctx
}

// ─── Provider ────────────────────────────────────────────────────────────────

interface CMSProviderProps {
  /** Project slug (BASED-CMS-SLUG) */
  slug: string
  /** Convex deployment URL — decoded from BASED-CMS-KEY */
  convexUrl: string
  /** 'production' (default) or 'preview' */
  env?: 'production' | 'preview'
  children: ReactNode
}

/**
 * Wraps your app with the Convex provider and sets the CMS context.
 *
 * ```tsx
 * 'use client'
 * import { CMSProvider } from 'cms-client/react'
 *
 * export function Providers({ slug, convexUrl, children }: {
 *   slug: string
 *   convexUrl: string
 *   children: React.ReactNode
 * }) {
 *   return (
 *     <CMSProvider slug={slug} convexUrl={convexUrl}>
 *       {children}
 *     </CMSProvider>
 *   )
 * }
 * ```
 */
export function CMSProvider({
  slug,
  convexUrl,
  env = 'production',
  children,
}: CMSProviderProps) {
  const client = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl])

  return (
    <ConvexProvider client={client}>
      <CMSContext value={{ orgSlug: slug, env }}>
        {children}
      </CMSContext>
    </ConvexProvider>
  )
}
