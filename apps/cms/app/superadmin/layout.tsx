import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SuperadminProviders } from './providers'

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()
  if (!user) redirect('/sign-in')

  const isSuperadmin = (user.publicMetadata as Record<string, unknown>)?.is_superadmin === true
  if (!isSuperadmin) {
    redirect('/admin')
  }

  return <SuperadminProviders>{children}</SuperadminProviders>
}
