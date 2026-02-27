import { registerSections as _registerSections } from './server/registerSections'
import { useSection as _useSection } from './hooks/useSection'
import type { CMSClient, CMSClientOptions, CMSSection, InferSectionType } from './types'

/**
 * Create a CMS client for a specific project.
 *
 * ```ts
 * // lib/cms.ts
 * import { createCMSClient } from 'cms-client'
 *
 * export const cms = createCMSClient({
 *   convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
 *   orgSlug: 'your-project-slug',
 *   registrationToken: process.env.BETTER_CMS_TOKEN,  // server-side only
 * })
 * ```
 */
export function createCMSClient(options: CMSClientOptions): CMSClient {
  return {
    /**
     * Upsert section definitions — call in Server Components / Server Actions on boot.
     * Idempotent. Requires `registrationToken` to be set in options.
     *
     * ```ts
     * // app/layout.tsx — Server Component
     * await cms.registerSections([teamSection, faqSection])
     * ```
     */
    async registerSections(sections: CMSSection[]) {
      await _registerSections(sections, {
        convexUrl: options.convexUrl,
        orgSlug: options.orgSlug,
        ...(options.registrationToken !== undefined
          ? { registrationToken: options.registrationToken }
          : {}),
      })
    },

    /**
     * React hook — returns realtime typed content for a section.
     * Returns `undefined` while loading; `[]` if no content yet.
     *
     * ```tsx
     * // app/team/page.tsx — Client Component
     * const team = cms.useSection(teamSection)
     * // → { name: string; role: string; bio?: string; image: string }[] | undefined
     * ```
     */
    useSection<T extends CMSSection>(section: T): InferSectionType<T>[] | undefined {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return _useSection(section, {
        orgSlug: options.orgSlug,
        ...(options.env !== undefined ? { env: options.env } : {}),
      })
    },
  }
}
