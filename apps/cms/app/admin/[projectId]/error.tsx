'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isValidationError = error.message?.includes('ArgumentValidationError')
    || error.message?.includes('does not match the table name')

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <h2 className="text-lg font-semibold">
        {isValidationError ? 'Invalid project' : 'Something went wrong'}
      </h2>
      <p className="mt-2 text-[13px] text-muted-foreground">
        {isValidationError
          ? 'The project ID in the URL is invalid. This may be from a stale bookmark or incorrect link.'
          : error.message || 'An unexpected error occurred.'}
      </p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
        <Button size="sm" asChild>
          <Link href="/admin">Back to projects</Link>
        </Button>
      </div>
    </div>
  )
}
