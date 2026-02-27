// Field type helpers — stub for Phase 1, fully implemented in Phase 5

export type FieldType = 'string' | 'number' | 'boolean' | 'image'

export interface FieldDef {
  type: FieldType
  optional?: boolean
  multiline?: boolean
  labelText?: string
  defaultValue?: unknown
}

function field(type: FieldType, def: Omit<FieldDef, 'type'> = {}): FieldBuilder {
  return new FieldBuilder({ type, ...def })
}

export class FieldBuilder {
  readonly _def: FieldDef

  constructor(def: FieldDef) {
    this._def = def
  }

  optional(): FieldBuilder {
    return new FieldBuilder({ ...this._def, optional: true })
  }

  multiline(): FieldBuilder {
    return new FieldBuilder({ ...this._def, multiline: true })
  }

  label(text: string): FieldBuilder {
    return new FieldBuilder({ ...this._def, labelText: text })
  }

  default(value: unknown): FieldBuilder {
    return new FieldBuilder({ ...this._def, defaultValue: value })
  }
}

export const z = {
  string: () => field('string'),
  number: () => field('number'),
  boolean: () => field('boolean'),
  image: () => field('image'),
}
