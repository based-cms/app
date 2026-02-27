'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { decodeToken } from './token'

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
        'Wrap your app in <CMSProvider token={...}> in a client component.'
    )
  }
  return ctx
}

interface CMSProviderProps {
  /** Combined token from the CMS dashboard */
  token: string
  /** 'production' (default) or 'preview' */
  env?: 'production' | 'preview'
  children: ReactNode
}

/**
 * Wraps your app with the Convex provider configured for your CMS project.
 * Also provides orgSlug and env to `useSection` via React context.
 *
 * ```tsx
 * // components/providers.tsx
 * 'use client'
 * import { CMSProvider } from 'cms-client/react'
 *
 * export function Providers({ children }: { children: React.ReactNode }) {
 *   return (
 *     <CMSProvider token={process.env.NEXT_PUBLIC_BETTER_CMS_TOKEN!}>
 *       {children}
 *     </CMSProvider>
 *   )
 * }
 * ```
 */
export function CMSProvider({ token, env = 'production', children }: CMSProviderProps) {
  const decoded = useMemo(() => decodeToken(token), [token])
  const client = useMemo(() => new ConvexReactClient(decoded.url), [decoded.url])
  const cmsValue = useMemo<CMSContextValue>(
    () => ({ orgSlug: decoded.slug, env }),
    [decoded.slug, env]
  )

  return (
    <CMSContext value={cmsValue}>
      <ConvexProvider client={client}>{children}</ConvexProvider>
    </CMSContext>
  )
}
