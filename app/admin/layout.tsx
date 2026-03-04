import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { isAuthenticated, fetchAuthQuery } from '@/lib/auth-server'
import { api } from '@/convex/_generated/api'
import { AdminNav } from '@/components/admin/AdminNav'
import { AuthGate } from '@/components/admin/AuthGate'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authed = await isAuthenticated()
  if (!authed) redirect('/sign-in')

  // Require an active organization — redirect to org selection if missing
  const orgId = await fetchAuthQuery(api.auth.getSessionOrganization)
  if (!orgId) redirect('/select-org')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AdminNav />
      <main className="flex flex-1 flex-col">
        <AuthGate>{children}</AuthGate>
      </main>
    </div>
  )
}
