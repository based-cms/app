import { useQuery } from 'convex/react'
import { makeFunctionReference } from 'convex/server'
import type { CMSSection, CMSClientOptions, InferSectionType } from '../types'

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
 * Must be used inside a `ConvexProvider`.
 */
export function useSection<T extends CMSSection>(
  section: T,
  options: Pick<CMSClientOptions, 'orgSlug' | 'env'>
): InferSectionType<T>[] | undefined {
  const result = useQuery(getPublicFn, {
    orgSlug: options.orgSlug,
    sectionType: section.name,
    env: options.env ?? 'production',
  })

  // result is undefined (loading) or unknown[] (data)
  // Cast is safe — Convex stores whatever the CMS wrote, which matches the schema
  return result as InferSectionType<T>[] | undefined
}
