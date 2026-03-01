import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAuthenticated } from '@/lib/auth-server'

/**
 * Next.js 16 auth guard — lightweight cookie check.
 *
 * Route protection is intentionally minimal here. Full org-membership checks
 * happen in app/admin/layout.tsx (Server Component).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /admin routes — redirect to sign-in if unauthenticated
  if (pathname.startsWith('/admin') || pathname.startsWith('/superadmin')) {
    const authed = await isAuthenticated()
    if (!authed) {
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
