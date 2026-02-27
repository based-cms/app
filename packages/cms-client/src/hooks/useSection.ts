'use client'

import { useQuery } from 'convex/react'
import { makeFunctionReference } from 'convex/server'
import { useCMSContext } from '../provider'
import type { CMSSection, InferSectionType } from '../types'

// Typed reference to sectionContent.getPublic
// Returns unknown[] — we cast to the inferred item type in the hook
const getPublicFn = makeFunctionReference<
  'query',
  {
    orgSlug: string
    sectionType: string
    env: 'production' | 'preview'
  },
  unknown[]
>('sectionContent:getPublic')

/**
 * React hook — subscribes to realtime content for a single section.
 *
 * Returns `undefined` while loading (Convex hasn't responded yet).
 * Returns `[]` if the section exists but has no content.
 * Automatically updates whenever an editor saves content in the CMS.
 *
 * Must be used inside a `<CMSProvider>`.
 *
 * ```tsx
 * 'use client'
 * import { useSection } from 'cms-client/react'
 * import { heroSection } from '@/lib/sections'
 *
 * export default function Hero() {
 *   const items = useSection(heroSection)
 *   // ...
 * }
 * ```
 */
export function useSection<T extends CMSSection>(
  section: T
): InferSectionType<T>[] | undefined {
  const { orgSlug, env } = useCMSContext()

  const result = useQuery(getPublicFn, {
    orgSlug,
    sectionType: section.name,
    env,
  })

  // result is undefined (loading) or unknown[] (data)
  // Cast is safe — Convex stores whatever the CMS wrote, which matches the schema
  return result as InferSectionType<T>[] | undefined
}
