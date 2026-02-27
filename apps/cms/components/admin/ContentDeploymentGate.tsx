'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useAuth } from '@clerk/nextjs'
import { makeFunctionReference } from 'convex/server'
import { useDeployment } from '@/components/providers/DeploymentProvider'

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

/**
 * Wraps children with the test deployment's ConvexProvider when env=test.
 * When in live mode, renders children as-is (they use the parent live provider).
 *
 * Also auto-ensures a shadow project exists on the test deployment
 * so that section_content queries/mutations work.
 */
export function ContentDeploymentGate({ project, children }: Props) {
  const { env, testReactClient, getAuthTestClient } = useDeployment()
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

  if (env === 'test' && testReactClient) {
    return (
      <ConvexProviderWithClerk
        client={testReactClient}
        useAuth={useAuth}
      >
        {children}
      </ConvexProviderWithClerk>
    )
  }

  return <>{children}</>
}
