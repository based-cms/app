'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function SignOutPage() {
  const router = useRouter()

  useEffect(() => {
    void authClient.signOut().then(() => {
      router.push('/sign-in')
    })
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40">
      <p className="text-sm text-muted-foreground">Signing out…</p>
    </main>
  )
}
