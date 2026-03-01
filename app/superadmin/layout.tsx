import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { SuperadminProviders } from './providers'

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const orgId = (session.session as Record<string, unknown>)['activeOrganizationId'] as string | undefined
  if (!orgId) redirect('/select-org')

  // Check superadmin role — stored in user metadata or a custom field
  const isSuperadmin = session.user.role === 'admin'
  if (!isSuperadmin) {
    redirect('/admin')
  }

  return <SuperadminProviders>{children}</SuperadminProviders>
}
