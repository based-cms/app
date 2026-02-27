import { registerSections as _registerSections } from './server/registerSections'
import { useSection as _useSection } from './hooks/useSection'
import { decodeToken } from './token'
import type { CMSClient, CMSClientOptions, CMSSection, InferSectionType } from './types'

/**
 * Create a CMS client for a specific project.
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
        orgSlug: decoded.slug,
        ...(options.env !== undefined ? { env: options.env } : {}),
      })
    },
  }
}
