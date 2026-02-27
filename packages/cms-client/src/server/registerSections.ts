import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'
import type { CMSSection } from '../types'

interface RegisterOptions {
  convexUrl: string
  registrationToken: string
}

// Typed reference to sectionRegistry.syncPublic — syncs the full list in one call
const syncPublicFn = makeFunctionReference<
  'mutation',
  {
    registrationToken: string
    sections: Array<{
      sectionType: string
      label: string
      fieldsSchema: string
    }>
  }
>('sectionRegistry:syncPublic')

/**
 * Sync all section definitions into Convex section_registry.
 *
 * Called from a Server Component or Server Action on every app boot.
 * Uses the registrationToken for auth (no Clerk session needed).
 *
 * - Upserts all provided sections (creates or updates)
 * - Archives any registry entries no longer in the list
 * - Unarchives previously archived sections that reappear
 */
export async function registerSections(
  sections: CMSSection[],
  options: RegisterOptions
): Promise<void> {
  if (!options.registrationToken) {
    throw new Error(
      '[cms-client] registerSections requires a registration token. ' +
        'Set BASED-CMS-KEY in your .env.local.'
    )
  }

  const client = new ConvexHttpClient(options.convexUrl)

  await client.mutation(syncPublicFn, {
    registrationToken: options.registrationToken,
    sections: sections.map((section) => ({
      sectionType: section.name,
      label: section.label,
      fieldsSchema: section.fieldsSchema,
    })),
  })
}
