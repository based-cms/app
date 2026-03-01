import { redirect } from 'next/navigation'
import { isAuthenticated, fetchAuthQuery } from '@/lib/auth-server'
import { api } from '@/convex/_generated/api'
import { SuperadminProviders } from './providers'

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authed = await isAuthenticated()
  if (!authed) redirect('/sign-in')

  // Check superadmin status via Convex query — the user's role is included in
  // the Better Auth JWT. The getCurrentUser query returns the auth user record
  // which has a `role` field.
  const user = await fetchAuthQuery(api.auth.getCurrentUser)
  const isSuperadmin = user?.role === 'superadmin'
  if (!isSuperadmin) {
    redirect('/admin')
  }

  return <SuperadminProviders>{children}</SuperadminProviders>
}
