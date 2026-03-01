import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

/**
 * Get the current session in a Server Component or Route Handler.
 * Returns null if unauthenticated.
 */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
}
