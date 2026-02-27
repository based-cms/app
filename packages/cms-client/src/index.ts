// Server-safe exports — can be imported in Server Components and Server Actions.
// For React client components (CMSProvider, useSection), import from 'cms-client/react'.

export { createCMSClient } from './client'
export { defineCMSSection } from './defineSection'
export { parseKey, buildKey } from './token'
export type { ParsedKey, KeyEnv } from './token'
export { z } from './z'
export type {
  CMSSection,
  CMSClient,
  CMSClientOptions,
  InferSectionType,
  InferSectionItem,
} from './types'
