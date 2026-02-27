import { auth } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { EnvProvider } from '@/components/providers/EnvProvider'
import { EnvToggle } from '@/components/admin/EnvToggle'
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
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background px-6">
          <span className="font-semibold tracking-tight">Better CMS</span>
          <div className="flex items-center gap-4">
            <EnvToggle />
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>
        <main className="flex-1 p-6">
          <AuthGate>{children}</AuthGate>
        </main>
      </div>
    </EnvProvider>
  )
}
