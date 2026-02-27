import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { EnvProvider } from '@/components/providers/EnvProvider'
import { AdminNav } from '@/components/admin/AdminNav'
import { AuthGate } from '@/components/admin/AuthGate'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, orgId } = await auth()

  if (!userId) redirect('/sign-in')
  if (!orgId) redirect('/select-org')

  return (
    <EnvProvider>
      <div className="flex min-h-screen flex-col bg-background">
        <AdminNav />
        <main className="flex flex-1 flex-col">
          <AuthGate>{children}</AuthGate>
        </main>
      </div>
    </EnvProvider>
  )
}
