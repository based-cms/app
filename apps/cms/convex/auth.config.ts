export default {
  providers: [
    {
      // Clerk Frontend API URL — set in .env.local as CLERK_FRONTEND_API_URL
      // Find it: Clerk dashboard → your app → API Keys → Frontend API URL
      // Example: https://flying-mule-67.clerk.accounts.dev
      domain: process.env.CLERK_FRONTEND_API_URL,
      applicationID: 'convex',
    },
  ],
}
