const TOKEN_PREFIX = 'bcms_'

export interface TokenPayload {
  /** Token version — currently always 1 */
  v: 1
  /** Convex deployment URL */
  url: string
  /** Organization slug */
  slug: string
  /** Registration secret (UUID) */
  key: string
}

/**
 * Encode Convex URL, org slug, and registration key into a single token.
 *
 * Format: `bcms_<base64 JSON>`
 */
export function encodeToken(payload: Omit<TokenPayload, 'v'>): string {
  const json = JSON.stringify({ v: 1, ...payload })
  const base64 = btoa(json)
  return `${TOKEN_PREFIX}${base64}`
}

/**
 * Decode a `bcms_` token into its component parts.
 *
 * Throws a clear error if the token is missing, malformed, or has an unknown version.
 */
export function decodeToken(token: string): TokenPayload {
  if (!token) {
    throw new Error(
      '[cms-client] Token is empty. Set NEXT_PUBLIC_BETTER_CMS_TOKEN in your .env.local.'
    )
  }

  if (!token.startsWith(TOKEN_PREFIX)) {
    throw new Error(
      `[cms-client] Invalid token format — must start with "${TOKEN_PREFIX}". ` +
        'Get your token from the CMS dashboard → Project Settings.'
    )
  }

  const base64 = token.slice(TOKEN_PREFIX.length)

  let parsed: unknown
  try {
    parsed = JSON.parse(atob(base64))
  } catch {
    throw new Error(
      '[cms-client] Failed to decode token — it may be corrupted. ' +
        'Get a fresh token from the CMS dashboard → Project Settings.'
    )
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('v' in parsed) ||
    !('url' in parsed) ||
    !('slug' in parsed) ||
    !('key' in parsed)
  ) {
    throw new Error(
      '[cms-client] Token is missing required fields. ' +
        'Get a fresh token from the CMS dashboard → Project Settings.'
    )
  }

  const payload = parsed as TokenPayload

  if (payload.v !== 1) {
    throw new Error(
      `[cms-client] Token version ${String(payload.v)} is not supported. ` +
        'Update cms-client to the latest version.'
    )
  }

  return payload
}
