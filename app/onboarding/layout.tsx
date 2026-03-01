import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { OnboardingProviders } from './providers'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return <OnboardingProviders>{children}</OnboardingProviders>
}
