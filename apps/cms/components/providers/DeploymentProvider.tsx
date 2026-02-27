'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexHttpClient } from 'convex/browser'
import { useAuth } from '@clerk/nextjs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DeploymentEnv = 'live' | 'test'
type ContentEnv = 'production' | 'preview'

interface DeploymentContextValue {
  /** Which deployment is active: 'live' or 'test' */
  env: DeploymentEnv
  setEnv: (env: DeploymentEnv) => void
  /** Maps to section_content.env: live→'production', test→'preview' */
  contentEnv: ContentEnv
  /** Live deployment URL */
  liveUrl: string
  /** Test deployment URL (null if not configured) */
  testUrl: string | null
  /** Whether a test deployment is configured */
  testAvailable: boolean
  /**
   * ConvexReactClient for the test deployment.
   * Used to wrap content areas with a secondary ConvexProvider.
   * Null if test URL not configured.
   */
  testReactClient: ConvexReactClient | null
  /**
   * Returns an authenticated ConvexHttpClient for the test deployment.
   * Used for cross-deployment operations (migration, ensure-project).
   * Returns null if test URL not configured.
   */
  getAuthTestClient: () => Promise<ConvexHttpClient | null>
  /**
   * Returns authenticated HTTP clients for BOTH deployments.
   * Used for data migration.
   */
  getAuthBothClients: () => Promise<{
    live: ConvexHttpClient
    test: ConvexHttpClient | null
  }>
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DeploymentContext = createContext<DeploymentContextValue | null>(null)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LIVE_URL = process.env.NEXT_PUBLIC_CONVEX_URL!
const TEST_URL = process.env.NEXT_PUBLIC_CONVEX_TEST_URL ?? null

const ENV_TO_CONTENT: Record<DeploymentEnv, ContentEnv> = {
  live: 'production',
  test: 'preview',
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * DeploymentProvider — the Convex provider ALWAYS points to the LIVE deployment.
 *
 * Projects, section_registry, media, and folders are always queried from live.
 * Only content pages opt in to the test deployment by wrapping their content
 * area with a secondary ConvexProvider using `testReactClient`.
 */
export function DeploymentProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth()
  const [env, setEnv] = useState<DeploymentEnv>('live')

  // Always-live reactive client (for the main ConvexProvider)
  const liveClient = useMemo(() => new ConvexReactClient(LIVE_URL), [])

  // Test reactive client (for wrapping content areas when env=test)
  const testReactClient = useMemo(
    () => (TEST_URL ? new ConvexReactClient(TEST_URL) : null),
    []
  )

  const contentEnv = ENV_TO_CONTENT[env]
  const testAvailable = TEST_URL !== null

  // HTTP clients for cross-deployment operations
  const liveHttp = useMemo(() => new ConvexHttpClient(LIVE_URL), [])
  const testHttp = useMemo(
    () => (TEST_URL ? new ConvexHttpClient(TEST_URL) : null),
    []
  )

  const authenticateClient = useCallback(
    async (client: ConvexHttpClient) => {
      const token = await getToken({ template: 'convex' })
      if (token) client.setAuth(token)
      return client
    },
    [getToken]
  )

  const getAuthTestClient = useCallback(async () => {
    if (!testHttp) return null
    return authenticateClient(testHttp)
  }, [testHttp, authenticateClient])

  const getAuthBothClients = useCallback(async () => {
    const live = await authenticateClient(liveHttp)
    const test = testHttp ? await authenticateClient(testHttp) : null
    return { live, test }
  }, [liveHttp, testHttp, authenticateClient])

  const value = useMemo<DeploymentContextValue>(
    () => ({
      env,
      setEnv,
      contentEnv,
      liveUrl: LIVE_URL,
      testUrl: TEST_URL,
      testAvailable,
      testReactClient,
      getAuthTestClient,
      getAuthBothClients,
    }),
    [env, contentEnv, testAvailable, testReactClient, getAuthTestClient, getAuthBothClients]
  )

  return (
    <DeploymentContext.Provider value={value}>
      <ConvexProviderWithClerk client={liveClient} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </DeploymentContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDeployment(): DeploymentContextValue {
  const ctx = useContext(DeploymentContext)
  if (!ctx)
    throw new Error('useDeployment must be used within DeploymentProvider')
  return ctx
}
