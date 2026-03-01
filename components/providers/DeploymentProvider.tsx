'use client'

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ConvexReactClient } from 'convex/react'

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
  /** Whether the current org has permission to use env switching */
  canSwitchEnv: boolean
  /**
   * ConvexReactClient for the test deployment.
   * Used to wrap content areas with a secondary ConvexProvider.
   * Null if test URL not configured.
   */
  testReactClient: ConvexReactClient | null
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
 * DeploymentProvider — manages the live/test deployment toggle.
 *
 * The root ConvexBetterAuthProvider (in app/layout.tsx) always points to the
 * LIVE deployment. When env=test, content areas wrap themselves in a secondary
 * ConvexProvider using `testReactClient`.
 *
 * NOTE: cross-deployment HTTP client helpers (getAuthTestClient,
 * getAuthBothClients) were removed during the Clerk → Better Auth migration.
 * Better Auth sessions are per-deployment, so cross-deployment auth requires
 * a shared JWKS or separate tokens. This will be addressed in a future phase.
 */
export function DeploymentProvider({ children }: { children: ReactNode }) {
  // TODO: replace Clerk permission check with Better Auth org permission
  // once the permission system is fully wired up. For now, default to true
  // when a test deployment URL is configured.
  const canSwitchEnv = TEST_URL !== null
  const [env, setEnv] = useState<DeploymentEnv>('live')

  // Force live when the org doesn't have env switch permission
  const effectiveEnv = canSwitchEnv ? env : ('live' as const)

  // Test reactive client (for wrapping content areas when env=test)
  const testReactClient = useMemo(
    () => (TEST_URL ? new ConvexReactClient(TEST_URL) : null),
    []
  )

  const contentEnv = ENV_TO_CONTENT[effectiveEnv]
  const testAvailable = TEST_URL !== null

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
    }),
    [effectiveEnv, contentEnv, testAvailable, canSwitchEnv, testReactClient]
  )

  return (
    <DeploymentContext.Provider value={value}>
      {children}
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
