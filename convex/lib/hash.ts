/**
 * SHA-256 hash utility for registration tokens.
 * Uses the Web Crypto API (available in Convex runtime).
 */

/** Hash a string with SHA-256 and return as hex. */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
