'use client'

import { signOut } from '@/lib/auth-client'
import { useEffect } from 'react'

export default function SignOutPage() {
  useEffect(() => {
    void signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/sign-in' } } })
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40">
      <p className="text-sm text-muted-foreground">Signing out…</p>
    </main>
  )
}
