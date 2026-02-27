import { ConvexHttpClient } from 'convex/browser'
import { makeFunctionReference } from 'convex/server'
import type { CMSSection, CMSClientOptions } from '../types'

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
  options: Pick<CMSClientOptions, 'convexUrl' | 'orgSlug' | 'registrationToken'>
): Promise<void> {
  if (!options.registrationToken) {
    throw new Error(
      '[cms-client] registerSections requires a registrationToken. ' +
        'Generate one in the CMS project page and add it as BETTER_CMS_TOKEN in .env.local.'
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
