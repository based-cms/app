import { authClient } from '@/lib/auth-client'

export type PostAuthRoute = '/admin' | '/onboarding' | '/select-org'

const ACTIVE_ORG_WAIT_TIMEOUT_MS = 4000
const ACTIVE_ORG_POLL_INTERVAL_MS = 200

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getActiveOrganizationIdFromSessionResult(
  sessionResult: unknown
): string | null {
  const session = (sessionResult as { data?: { session?: { activeOrganizationId?: string | null } } })?.data?.session
  return session?.activeOrganizationId ?? null
}

/**
 * Decides where authenticated users should land:
 * - /admin when an active org is set
 * - /select-org when org memberships exist but none is active
 * - /onboarding when no org memberships exist
 */
export async function resolvePostAuthRoute(): Promise<PostAuthRoute> {
  const [sessionResult, organizationsResult] = await Promise.all([
    authClient.getSession(),
    authClient.organization.list(),
  ])

  const activeOrgId = getActiveOrganizationIdFromSessionResult(sessionResult)
  if (activeOrgId) return '/admin'

  const organizations =
    (organizationsResult as { data?: Array<unknown> | null })?.data ?? []
  return organizations.length > 0 ? '/select-org' : '/onboarding'
}

/**
 * Waits until session reflects the selected active org.
 * This avoids races where navigation happens before JWT/session updates.
 */
export async function waitForActiveOrganization(
  organizationId: string,
  timeoutMs: number = ACTIVE_ORG_WAIT_TIMEOUT_MS
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const sessionResult = await authClient.getSession()
    const activeOrgId = getActiveOrganizationIdFromSessionResult(sessionResult)
    if (activeOrgId === organizationId) return true

    await sleep(ACTIVE_ORG_POLL_INTERVAL_MS)
  }

  return false
}
