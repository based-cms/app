import { httpRouter } from 'convex/server'
import { authComponent, createAuth } from './auth'
import { polar } from './polar'

const http = httpRouter()

// Register Better Auth routes (sign-in, sign-up, session, JWKS, etc.)
authComponent.registerRoutes(http, createAuth)

// Register Polar webhook handler — auto-syncs subscription & product events
polar.registerRoutes(http, { path: '/polar/events' })

export default http
