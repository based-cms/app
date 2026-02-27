// Stub for Phase 1 — full type inference implemented in Phase 5
import type { CMSSection } from './types'
import type { FieldBuilder } from './z'

type FieldMap = Record<string, FieldBuilder>

interface SectionDef<TFields extends FieldMap> {
  name: string
  label: string
  fields: TFields
}

export function defineCMSSection<TFields extends FieldMap>(
  def: SectionDef<TFields>
): CMSSection<TFields> {
  return {
    name: def.name,
    label: def.label,
    fieldsSchema: JSON.stringify(
      Object.fromEntries(
        Object.entries(def.fields).map(([key, builder]) => [key, builder._def])
      )
    ),
  }
}
