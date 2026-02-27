import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SuperadminProviders } from './providers'

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const superadminId = process.env.SUPERADMIN_USER_ID
  if (!superadminId || userId !== superadminId) {
    redirect('/admin')
  }

  return <SuperadminProviders>{children}</SuperadminProviders>
}
