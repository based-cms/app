import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'
import type { CMSSection } from '../types'

interface RegisterOptions {
  convexUrl: string
  registrationToken: string
}

// Typed reference to sectionRegistry.upsertPublic
const upsertPublicFn = makeFunctionReference<
  'mutation',
  {
    registrationToken: string
    sectionType: string
    label: string
    fieldsSchema: string
  }
>('sectionRegistry:upsertPublic')

/**
 * Upsert all section definitions into Convex section_registry.
 *
 * Called from a Server Component or Server Action on every app boot.
 * Uses the registrationToken for auth (no Clerk session needed).
 * The token resolves the project automatically via the by_token index.
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

  for (const section of sections) {
    await client.mutation(upsertPublicFn, {
      registrationToken: options.registrationToken,
      sectionType: section.name,
      label: section.label,
      fieldsSchema: section.fieldsSchema,
    })
  }
}
