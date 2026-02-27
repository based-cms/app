import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

/**
 * Admin layout — full auth guard.
 * proxy.ts handles the lightweight cookie check.
 * This Server Component does the real verification:
 * - Clerk session must be valid
 * - An organization must be active in the session
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, orgId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  if (!orgId) {
    // User is authenticated but has no active org — redirect to org selector
    redirect('/select-org')
  }

  return <>{children}</>
}
