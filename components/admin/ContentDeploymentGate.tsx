'use client'

import { type ReactNode } from 'react'
import { ConvexProvider } from 'convex/react'
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
 * NOTE: cross-deployment shadow-project creation was removed during the
 * Clerk → Better Auth migration. The test deployment needs its own Better Auth
 * session for authenticated mutations. This will be addressed in a future phase.
 */
export function ContentDeploymentGate({ children }: Props) {
  const { env, canSwitchEnv, testReactClient } = useDeployment()

  if (env === 'test' && canSwitchEnv && testReactClient) {
    return (
      <ConvexProvider client={testReactClient}>
        {children}
      </ConvexProvider>
    )
  }

  return <>{children}</>
}
