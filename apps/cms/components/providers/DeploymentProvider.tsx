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
  /** URL of the currently active deployment */
  activeUrl: string
  /** Whether a test deployment is configured */
  testAvailable: boolean
  /**
   * Returns a ConvexHttpClient for the OTHER deployment, pre-authenticated
   * with the current Clerk JWT. Used for cross-deployment writes.
   * Returns null if there is no secondary deployment.
   */
  getAuthSecondaryClient: () => Promise<ConvexHttpClient | null>
  /**
   * Returns authenticated HTTP clients for BOTH deployments.
   * Used for dual-write operations (project create/delete).
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

export function DeploymentProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth()
  const [env, setEnv] = useState<DeploymentEnv>('live')

  // Memoize reactive clients (one per deployment URL)
  const liveClient = useMemo(() => new ConvexReactClient(LIVE_URL), [])
  const testClient = useMemo(
    () => (TEST_URL ? new ConvexReactClient(TEST_URL) : null),
    []
  )

  const activeClient = env === 'test' && testClient ? testClient : liveClient
  const activeUrl = env === 'test' && TEST_URL ? TEST_URL : LIVE_URL
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

  const getAuthSecondaryClient = useCallback(async () => {
    const secondary = env === 'live' ? testHttp : liveHttp
    if (!secondary) return null
    return authenticateClient(secondary)
  }, [env, liveHttp, testHttp, authenticateClient])

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
      activeUrl,
      testAvailable,
      getAuthSecondaryClient,
      getAuthBothClients,
    }),
    [env, contentEnv, activeUrl, testAvailable, getAuthSecondaryClient, getAuthBothClients]
  )

  return (
    <DeploymentContext.Provider value={value}>
      <ConvexProviderWithClerk
        client={activeClient}
        useAuth={useAuth}
        key={activeUrl}
      >
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
