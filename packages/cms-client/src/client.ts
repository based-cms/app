import { registerSections as _registerSections } from './server/registerSections'
import { decodeToken } from './token'
import type { CMSClient, CMSClientOptions, CMSSection } from './types'

/**
 * Create a CMS client for a specific project.
 *
 * The returned client is **server-safe** — use it in Server Components and
 * Server Actions to register sections on boot.
 *
 * For reading content in client components, use `useSection` from `cms-client/react`.
 *
 * ```ts
 * // lib/cms.ts
 * import { createCMSClient } from 'cms-client'
 *
 * export const cms = createCMSClient({
 *   token: process.env.NEXT_PUBLIC_BETTER_CMS_TOKEN!,
 * })
 * ```
 */
export function createCMSClient(options: CMSClientOptions): CMSClient {
  const decoded = decodeToken(options.token)

  return {
    /**
     * Upsert section definitions — call in Server Components / Server Actions on boot.
     * Idempotent.
     *
     * ```ts
     * // app/layout.tsx — Server Component
     * await cms.registerSections([teamSection, faqSection])
     * ```
     */
    async registerSections(sections: CMSSection[]) {
      await _registerSections(sections, {
        convexUrl: decoded.url,
        orgSlug: decoded.slug,
        registrationToken: decoded.key,
      })
    },
  }
}
