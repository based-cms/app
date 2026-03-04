'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {error.message || 'An error occurred during onboarding.'}
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
        <Button size="sm" asChild>
          <Link href="/admin">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
