import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth-server'
import { AdminNav } from '@/components/admin/AdminNav'
import { AuthGate } from '@/components/admin/AuthGate'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authed = await isAuthenticated()

  if (!authed) redirect('/sign-in')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AdminNav />
      <main className="flex flex-1 flex-col">
        <AuthGate>{children}</AuthGate>
      </main>
    </div>
  )
}
