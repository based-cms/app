'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { ConvexProviderWithAuth } from 'convex/react'
import { makeFunctionReference } from 'convex/server'
import { useDeployment } from '@/components/providers/DeploymentProvider'
import { authClient, useSession } from '@/lib/auth-client'
import { useCallback, useMemo } from 'react'

interface Props {
  /** Project data from the live deployment, used to create shadow on test */
  project: {
    slug: string
    name: string
    primaryColor: string
    faviconUrl: string
  }
  children: ReactNode
}

interface TokenCache {
  token: string
  expiry: number
}

let cachedToken: TokenCache | null = null

function useBetterAuth() {
  const { data: session, isPending } = useSession()

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!session) return null
      if (!forceRefreshToken && cachedToken && cachedToken.expiry > Date.now()) {
        return cachedToken.token
      }
      try {
        const result = await authClient.token()
        const token = 'data' in result ? result.data?.token : undefined
        if (token) {
          cachedToken = { token, expiry: Date.now() + 4 * 60 * 1000 }
          return token
        }
      } catch {
        cachedToken = null
      }
      return null
    },
    [session]
  )

  return useMemo(
    () => ({
      isLoading: isPending,
      isAuthenticated: !!session,
      fetchAccessToken,
    }),
    [isPending, session, fetchAccessToken]
  )
}

/**
 * Wraps children with the test deployment's ConvexProvider when env=test.
 * When in live mode, renders children as-is (they use the parent live provider).
 *
 * Also auto-ensures a shadow project exists on the test deployment
 * so that section_content queries/mutations work.
 */
export function ContentDeploymentGate({ project, children }: Props) {
  const { env, canSwitchEnv, testReactClient, getAuthTestClient } = useDeployment()
  const ensuredRef = useRef<string | null>(null)

  // Auto-ensure shadow project on test deployment when switching to test
  useEffect(() => {
    if (env !== 'test' || !project.slug) return
    if (ensuredRef.current === project.slug) return

    let cancelled = false

    void (async () => {
      try {
        const client = await getAuthTestClient()
        if (!client || cancelled) return

        const ensureRef = makeFunctionReference<'mutation'>(
          'projects:ensureExists' as never
        )
        await client.mutation(ensureRef, {
          slug: project.slug,
          name: project.name,
          primaryColor: project.primaryColor,
          faviconUrl: project.faviconUrl,
        })
        if (!cancelled) ensuredRef.current = project.slug
      } catch {
        // Silent — best-effort shadow creation
      }
    })()

    return () => {
      cancelled = true
    }
  }, [env, project.slug, project.name, project.primaryColor, project.faviconUrl, getAuthTestClient])

  if (env === 'test' && canSwitchEnv && testReactClient) {
    return (
      <ConvexProviderWithAuth
        client={testReactClient}
        useAuth={useBetterAuth}
      >
        {children}
      </ConvexProviderWithAuth>
    )
  }

  return <>{children}</>
}
