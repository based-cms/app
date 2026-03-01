export default {
  providers: [
    {
      // BetterAuth JWKS URL — the app URL where BetterAuth serves its JWKS endpoint.
      // BetterAuth exposes JWKS at {baseURL}/api/auth/.well-known/jwks.json
      // Set BETTER_AUTH_URL in .env.local to your app's URL.
      domain: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000/api/auth',
      applicationID: 'convex',
    },
  ],
}
