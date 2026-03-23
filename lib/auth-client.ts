import { createAuthClient } from 'better-auth/react'
import { convexClient } from '@convex-dev/better-auth/client/plugins'
import {
  organizationClient,
  emailOTPClient,
  magicLinkClient,
  oneTapClient,
  lastLoginMethodClient,
} from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [
    convexClient(),
    organizationClient(),
    emailOTPClient(),
    magicLinkClient(),
    oneTapClient({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      promptOptions: {
        fedCM: false,
      },
    }),
    lastLoginMethodClient(),
  ],
})
