// Placeholder types — filled in during Phase 5

export interface CMSClientOptions {
  convexUrl: string
  orgSlug: string
  env?: 'production' | 'preview'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface CMSSection<_TFields = any> {
  name: string
  label: string
  fieldsSchema: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferSectionType<_T> = Record<string, any>

export interface CMSClient {
  registerSections: (sections: CMSSection[]) => Promise<void>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSection: <T extends CMSSection>(section: T) => InferSectionType<T>[] | undefined
}
