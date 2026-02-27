import { auth } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/95 px-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-sm">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-[13px] font-bold text-background">
              B
            </span>
            <span className="font-semibold tracking-tight">Based CMS</span>
          </Link>
          <div className="flex items-center gap-4">
            <EnvToggle />
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>
        <main className="flex flex-1 flex-col">
          <AuthGate>{children}</AuthGate>
        </main>
      </div>
    </EnvProvider>
  )
}
