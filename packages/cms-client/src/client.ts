// Stub for Phase 1 — fully implemented in Phase 5
import type { CMSClient, CMSClientOptions, CMSSection, InferSectionType } from './types'

export function createCMSClient(_options: CMSClientOptions): CMSClient {
  return {
    async registerSections(_sections: CMSSection[]) {
      // TODO Phase 5: call Convex mutation to upsert section_registry
      throw new Error('Not implemented yet — coming in Phase 5')
    },
    useSection<T extends CMSSection>(_section: T): InferSectionType<T>[] | undefined {
      // TODO Phase 5: useQuery from Convex with orgSlug + sectionType
      throw new Error('Not implemented yet — coming in Phase 5')
    },
  }
}
