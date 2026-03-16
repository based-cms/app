import { NextResponse, type NextRequest } from 'next/server'
import { handler } from '@/lib/auth-server'
import { checkRateLimit } from '@/lib/rate-limit'

// 60 requests per minute per IP — Better Auth fires multiple requests
// per page load (session, token refresh, JWKS, org list), so a low limit
// causes 429s during normal login and navigation.
const RATE_LIMIT = 60
const WINDOW_MS = 60_000

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

function withRateLimit(
  routeHandler: (request: NextRequest) => Promise<Response>
) {
  return async (request: NextRequest) => {
    const ip = getClientIp(request)
    const result = checkRateLimit(`auth:${ip}`, RATE_LIMIT, WINDOW_MS)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.retryAfterMs ?? WINDOW_MS) / 1000)),
          },
        }
      )
    }

    return routeHandler(request)
  }
}

export const GET = withRateLimit(handler.GET!)
export const POST = withRateLimit(handler.POST!)
