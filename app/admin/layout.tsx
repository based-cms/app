import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-server'
import { DeploymentProvider } from '@/components/providers/DeploymentProvider'
import { AdminNav } from '@/components/admin/AdminNav'
import { AuthGate } from '@/components/admin/AuthGate'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) redirect('/sign-in')

  const orgId = (session.session as Record<string, unknown>)['activeOrganizationId'] as string | undefined
  if (!orgId) redirect('/select-org')

  return (
    <DeploymentProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <AdminNav />
        <main className="flex flex-1 flex-col">
          <AuthGate>{children}</AuthGate>
        </main>
      </div>
    </DeploymentProvider>
  )
}
