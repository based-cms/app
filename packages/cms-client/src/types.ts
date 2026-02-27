import type { FieldBuilder } from './z'

export type { FieldBuilder, FieldDef, FieldTypeName } from './z'

// ─── Internal type helpers ────────────────────────────────────────────────────

type AnyFieldBuilder = FieldBuilder<unknown, boolean>
type FieldMap = Record<string, AnyFieldBuilder>

// Extract the TypeScript output type from a FieldBuilder
type FieldOutput<T extends AnyFieldBuilder> = T['_output']

// Whether this field was marked .optional()
type FieldIsOptional<T extends AnyFieldBuilder> = T['_optional']

/**
 * Builds the fully-typed item shape for a section.
 *
 * Required fields become `key: Type`.
 * Optional fields become `key?: Type`.
 *
 * Example:
 *   fields: { name: z.string(), bio: z.string().optional() }
 *   → { name: string; bio?: string }
 */
export type InferSectionItem<TFields extends FieldMap> =
  // Required fields
  {
    [K in keyof TFields as FieldIsOptional<TFields[K]> extends true
      ? never
      : K]: FieldOutput<TFields[K]>
  } & {
    // Optional fields
    [K in keyof TFields as FieldIsOptional<TFields[K]> extends true
      ? K
      : never]?: FieldOutput<TFields[K]>
  }

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CMSClientOptions {
  /** The Convex deployment URL — use NEXT_PUBLIC_CONVEX_URL */
  convexUrl: string
  /** Your project's slug as set in the CMS dashboard */
  orgSlug: string
  /** 'production' (default) or 'preview' */
  env?: 'production' | 'preview'
  /** Registration token from the CMS project page — server-side only */
  registrationToken?: string
}

/**
 * A phantom symbol used to carry TFields through the CMSSection type.
 * Never appears at runtime — TypeScript only.
 */
declare const _fieldsPhantom: unique symbol

/**
 * Describes a content section. Created by `defineCMSSection`.
 * TFields is a phantom generic used to infer the return type of useSection.
 */
export interface CMSSection<TFields extends FieldMap = FieldMap> {
  readonly name: string
  readonly label: string
  readonly fieldsSchema: string
  /** @internal phantom — never set at runtime, only used for type inference */
  readonly [_fieldsPhantom]?: TFields
}

/**
 * Infer the item type for a section.
 *
 * ```ts
 * type TeamMember = InferSectionType<typeof teamSection>
 * // → { name: string; role: string; bio?: string; image: string }
 * ```
 */
export type InferSectionType<T extends CMSSection<FieldMap>> =
  T extends CMSSection<infer TFields> ? InferSectionItem<TFields> : never

export interface CMSClient {
  /**
   * Upsert section definitions into Convex. Call in a Server Component or
   * Server Action on every boot. Idempotent — safe to call repeatedly.
   *
   * Requires `registrationToken` to be set in createCMSClient options.
   */
  registerSections: (sections: CMSSection<FieldMap>[]) => Promise<void>

  /**
   * React hook — returns realtime content for a section, typed from its fields.
   * Returns `undefined` while loading, `[]` if no content has been added.
   *
   * Requires `ConvexProvider` in the component tree.
   */
  useSection: <T extends CMSSection<FieldMap>>(section: T) => InferSectionType<T>[] | undefined
}
