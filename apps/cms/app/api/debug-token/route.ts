import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Debug endpoint — shows the current Clerk auth state and JWT claims.
 * Visit /api/debug-token in the browser to inspect.
 * Remove this route before going to production.
 */
export async function GET() {
  const { userId, orgId, orgRole, getToken } = await auth()

  if (!userId) {
    return NextResponse.json({ authenticated: false })
  }

  // Get the raw Convex JWT to inspect its claims
  const token = await getToken({ template: 'convex' })

  let claims: Record<string, unknown> | null = null
  if (token) {
    try {
      const payload = token.split('.')[1]
      if (payload) {
        claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<string, unknown>
      }
    } catch {
      claims = { error: 'Failed to decode token' }
    }
  }

  return NextResponse.json({
    authenticated: true,
    userId,
    orgId: orgId ?? null,
    orgRole: orgRole ?? null,
    convexTokenPresent: !!token,
    convexTokenClaims: claims,
  })
}
