import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { isAuthenticated } from '@/lib/auth-server'
import { OnboardingProviders } from './providers'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authed = await isAuthenticated()
  if (!authed) redirect('/sign-in')

  return <OnboardingProviders>{children}</OnboardingProviders>
}
