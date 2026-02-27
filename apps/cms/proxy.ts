import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js 16 auth guard — replaces the deprecated middleware.ts pattern.
 * Named export 'proxy', not a default export named 'middleware'.
 *
 * Lightweight check only: verifies the Clerk session cookie exists.
 * Full auth (JWT verification, org membership) happens in Server Components and Actions.
 * Never add business logic or database calls here.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Guard all /admin routes — redirect to sign-in if no session cookie
  if (pathname.startsWith('/admin')) {
    const session = request.cookies.get('__session')
    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match /admin and all sub-paths
    '/admin/:path*',
  ],
}
