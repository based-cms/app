import { httpRouter } from 'convex/server'
import { authComponent, createAuth } from './auth'

const http = httpRouter()

// Register Better Auth routes (sign-in, sign-up, session, JWKS, etc.)
authComponent.registerRoutes(http, createAuth)

export default http
