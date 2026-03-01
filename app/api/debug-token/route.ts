import { getSession } from '@/lib/auth-server'
import { NextResponse } from 'next/server'

/**
 * Debug endpoint — shows the current BetterAuth auth state.
 * Visit /api/debug-token in the browser to inspect.
 * Remove this route before going to production.
 */
export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ authenticated: false })
  }

  const orgId = (session.session as Record<string, unknown>)['activeOrganizationId'] as string | undefined

  return NextResponse.json({
    authenticated: true,
    userId: session.user.id,
    orgId: orgId ?? null,
    userName: session.user.name,
    userEmail: session.user.email,
    sessionId: session.session.id,
  })
}
