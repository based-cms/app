import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { OnboardingProviders } from './providers'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  return <OnboardingProviders>{children}</OnboardingProviders>
}
