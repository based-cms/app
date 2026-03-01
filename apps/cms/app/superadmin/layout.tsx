import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SuperadminProviders } from './providers'

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  // Convex needs a valid JWT with org context to authenticate queries.
  // Any org works — superadmin queries ignore org and read all projects.
  const { orgId } = await auth()
  if (!orgId) redirect('/select-org')

  const isSuperadmin = (user.publicMetadata as Record<string, unknown>)?.is_superadmin === true
  if (!isSuperadmin) {
    redirect('/admin')
  }

  return <SuperadminProviders>{children}</SuperadminProviders>
}
