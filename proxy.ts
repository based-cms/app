import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

/**
 * Next.js 16 auth guard — uses clerkMiddleware() so Clerk's auth() works
 * in Server Components. Named export 'proxy' (not middleware.ts — deprecated in Next.js 16).
 *
 * Route protection is intentionally minimal here. Full org-membership checks
 * happen in app/admin/layout.tsx (Server Component) via auth().
 */

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export const proxy = clerkMiddleware(async (auth, request) => {
  if (isAdminRoute(request)) {
    // Redirect to sign-in if unauthenticated. Does not check org membership —
    // that's handled in the admin layout Server Component.
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
