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
import { ConvexProviderWithAuth } from 'convex/react'
import { ConvexHttpClient } from 'convex/browser'
import { authClient, useSession } from '@/lib/auth-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DeploymentEnv = 'live' | 'test'
type ContentEnv = 'production' | 'preview'

interface TokenCache {
  token: string
  expiry: number
}

let cachedToken: TokenCache | null = null

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
  /** Whether the current org has permission to use env switching */
  canSwitchEnv: boolean
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
// Custom useAuth for Convex
// ---------------------------------------------------------------------------

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
  // BetterAuth doesn't have a built-in permission system like Clerk's `has()`,
  // so we default to allowing env switching when test URL is configured.
  const canSwitchEnv = TEST_URL !== null
  const [env, setEnv] = useState<DeploymentEnv>('live')

  // Force live when the org doesn't have env switch permission
  const effectiveEnv = canSwitchEnv ? env : ('live' as const)

  // Always-live reactive client (for the main ConvexProvider)
  const liveClient = useMemo(() => new ConvexReactClient(LIVE_URL), [])

  // Test reactive client (for wrapping content areas when env=test)
  const testReactClient = useMemo(
    () => (TEST_URL ? new ConvexReactClient(TEST_URL) : null),
    []
  )

  const contentEnv = ENV_TO_CONTENT[effectiveEnv]
  const testAvailable = TEST_URL !== null

  // HTTP clients for cross-deployment operations
  const liveHttp = useMemo(() => new ConvexHttpClient(LIVE_URL), [])
  const testHttp = useMemo(
    () => (TEST_URL ? new ConvexHttpClient(TEST_URL) : null),
    []
  )

  const authenticateClient = useCallback(
    async (client: ConvexHttpClient) => {
      try {
        const result = await authClient.token()
        const token = 'data' in result ? result.data?.token : undefined
        if (token) client.setAuth(token)
      } catch {
        // Silent — best-effort auth
      }
      return client
    },
    []
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
      env: effectiveEnv,
      setEnv,
      contentEnv,
      liveUrl: LIVE_URL,
      testUrl: TEST_URL,
      testAvailable,
      canSwitchEnv,
      testReactClient,
      getAuthTestClient,
      getAuthBothClients,
    }),
    [effectiveEnv, contentEnv, testAvailable, canSwitchEnv, testReactClient, getAuthTestClient, getAuthBothClients]
  )

  return (
    <DeploymentContext.Provider value={value}>
      <ConvexProviderWithAuth client={liveClient} useAuth={useBetterAuth}>
        {children}
      </ConvexProviderWithAuth>
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
