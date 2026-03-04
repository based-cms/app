'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isNoActiveOrgError =
    error.message?.includes('No active organization in session')

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <h2 className="text-lg font-semibold">
        {isNoActiveOrgError ? 'Select a workspace' : 'Something went wrong'}
      </h2>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {isNoActiveOrgError
          ? 'Your session is authenticated, but no active workspace is set yet.'
          : error.message || 'An unexpected error occurred.'}
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
        {isNoActiveOrgError ? (
          <>
            <Button size="sm" asChild>
              <Link href="/select-org">Select workspace</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/onboarding">Create workspace</Link>
            </Button>
          </>
        ) : (
          <Button size="sm" asChild>
            <Link href="/admin">Back to projects</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
