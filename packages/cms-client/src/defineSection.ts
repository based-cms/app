import type { CMSSection } from './types'
import type { FieldBuilder } from './z'

type AnyFieldBuilder = FieldBuilder<unknown, boolean>
type FieldMap = Record<string, AnyFieldBuilder>

interface SectionDef<TFields extends FieldMap> {
  /** Unique identifier, e.g. "team". Used as sectionType in Convex. */
  name: string
  /** Human-readable label shown in the CMS, e.g. "Team Members". */
  label: string
  /** Field definitions — keys become the item shape properties. */
  fields: TFields
}

/**
 * Define a typed content section.
 *
 * ```ts
 * export const teamSection = defineCMSSection({
 *   name: 'team',
 *   label: 'Team Members',
 *   fields: {
 *     name:  z.string().label('Full Name'),
 *     role:  z.string(),
 *     bio:   z.string().optional(),
 *     image: z.image(),
 *     order: z.number().default(0),
 *   },
 * })
 * ```
 */
export function defineCMSSection<TFields extends FieldMap>(
  def: SectionDef<TFields>
): CMSSection<TFields> {
  // Serialize field definitions to JSON so the CMS can render the correct form inputs
  const fieldsSchema = JSON.stringify(
    Object.fromEntries(
      Object.entries(def.fields).map(([key, builder]) => [key, builder._def])
    )
  )

  // Cast is safe — the phantom _fieldsPhantom property only exists for type inference
  // and is never read at runtime, so we don't need to set it.
  return { name: def.name, label: def.label, fieldsSchema } as CMSSection<TFields>
}
