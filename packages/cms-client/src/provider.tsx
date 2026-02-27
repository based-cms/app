'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { useMemo, type ReactNode } from 'react'
import { decodeToken } from './token'

interface CMSProviderProps {
  /** Combined token from the CMS dashboard */
  token: string
  children: ReactNode
}

/**
 * Wraps your app with the Convex provider configured for your CMS project.
 *
 * ```tsx
 * // components/providers.tsx
 * 'use client'
 * import { CMSProvider } from 'cms-client'
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
export function CMSProvider({ token, children }: CMSProviderProps) {
  const client = useMemo(() => {
    const { url } = decodeToken(token)
    return new ConvexReactClient(url)
  }, [token])

  return <ConvexProvider client={client}>{children}</ConvexProvider>
}
