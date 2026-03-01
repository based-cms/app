import { NextRequest, NextResponse } from 'next/server'

/**
 * Next.js 16 auth guard — checks for a BetterAuth session cookie.
 * Named export 'proxy' (not middleware.ts — deprecated in Next.js 16).
 *
 * Route protection is intentionally minimal here. Full org-membership checks
 * happen in app/admin/layout.tsx (Server Component) via getSession().
 */

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl

  // Only protect /admin routes
  if (pathname.startsWith('/admin')) {
    // Check for BetterAuth session cookie
    const sessionCookie =
      request.cookies.get('better-auth.session_token') ??
      request.cookies.get('__Secure-better-auth.session_token')

    if (!sessionCookie) {
      const signInUrl = new URL('/sign-in', request.url)
      return NextResponse.redirect(signInUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
