'use client'

import { useClerk } from '@clerk/nextjs'
import { useEffect } from 'react'

export default function SignOutPage() {
  const { signOut } = useClerk()

  useEffect(() => {
    void signOut({ redirectUrl: '/sign-in' })
  }, [signOut])

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40">
      <p className="text-sm text-muted-foreground">Signing out…</p>
    </main>
  )
}
