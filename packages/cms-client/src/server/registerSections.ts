import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'
import type { CMSSection } from '../types'

interface RegisterOptions {
  convexUrl: string
  orgSlug: string
  registrationToken: string
}

// Typed reference to sectionRegistry.upsertPublic
// The path format is "fileName:exportName" in Convex
const upsertPublicFn = makeFunctionReference<
  'mutation',
  {
    orgSlug: string
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
 * Each section is upserted individually — idempotent, safe to call repeatedly.
 */
export async function registerSections(
  sections: CMSSection[],
  options: RegisterOptions
): Promise<void> {
  if (!options.registrationToken) {
    throw new Error(
      '[cms-client] registerSections requires a registrationToken. ' +
        'Set NEXT_PUBLIC_BETTER_CMS_TOKEN in your .env.local with the token from the CMS dashboard.'
    )
  }

  const client = new ConvexHttpClient(options.convexUrl)

  // Upsert sections sequentially — avoids overwhelming the deployment and
  // makes error messages clearly attributable to a specific section.
  for (const section of sections) {
    await client.mutation(upsertPublicFn, {
      orgSlug: options.orgSlug,
      registrationToken: options.registrationToken,
      sectionType: section.name,
      label: section.label,
      fieldsSchema: section.fieldsSchema,
    })
  }
}
