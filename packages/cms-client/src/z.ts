// Field type helpers with full TypeScript inference.
// Modifiers chain cleanly: z.string().optional().label('Bio').multiline()

export type FieldTypeName = 'string' | 'number' | 'boolean' | 'image' | 'video' | 'document'

// Maps FieldTypeName → the corresponding TypeScript type
interface FieldTypeMap {
  string: string
  number: number
  boolean: boolean
  image: string   // image fields resolve to a string URL
  video: string   // video fields resolve to a string URL
  document: string // document fields resolve to a string URL
}

export interface FieldDef {
  type: FieldTypeName
  optional?: boolean
  multiline?: boolean
  labelText?: string
  defaultValue?: unknown
  accept?: string[] // MIME type whitelist (e.g. ['image/png', 'video/mp4'])
}

/**
 * Generic FieldBuilder<TOutput, TOptional>.
 * Phantom properties _output and _optional are only used for type inference
 * via conditional types — they are never set at runtime.
 */
export class FieldBuilder<TOutput, TOptional extends boolean = false> {
  // Phantom — TypeScript reads these for inference; they don't exist at runtime
  declare readonly _output: TOutput
  declare readonly _optional: TOptional

  readonly _def: FieldDef

  constructor(def: FieldDef) {
    this._def = def
  }

  /** Mark the field as optional — useSection will return `fieldName?: Type` */
  optional(): FieldBuilder<TOutput, true> {
    return new FieldBuilder({ ...this._def, optional: true }) as FieldBuilder<TOutput, true>
  }

  /** Render as a <textarea> in the CMS form */
  multiline(): FieldBuilder<TOutput, TOptional> {
    return new FieldBuilder({ ...this._def, multiline: true }) as FieldBuilder<TOutput, TOptional>
  }

  /** Custom label shown in the CMS form */
  label(text: string): FieldBuilder<TOutput, TOptional> {
    return new FieldBuilder({ ...this._def, labelText: text }) as FieldBuilder<TOutput, TOptional>
  }

  /** Default value used when the field is empty */
  default(value: TOutput): FieldBuilder<TOutput, TOptional> {
    return new FieldBuilder({ ...this._def, defaultValue: value }) as FieldBuilder<
      TOutput,
      TOptional
    >
  }

  /** Restrict accepted MIME types (e.g. ['image/png', 'video/mp4']) */
  accept(types: string[]): FieldBuilder<TOutput, TOptional> {
    return new FieldBuilder({ ...this._def, accept: types }) as FieldBuilder<TOutput, TOptional>
  }
}

function field<TName extends FieldTypeName>(type: TName): FieldBuilder<FieldTypeMap[TName]> {
  return new FieldBuilder<FieldTypeMap[TName]>({ type })
}

export const z = {
  /** Text field — renders as <input type="text"> or <textarea> with .multiline() */
  string: () => field('string'),
  /** Number field — renders as <input type="number"> */
  number: () => field('number'),
  /** Boolean field — renders as a toggle */
  boolean: () => field('boolean'),
  /** Image field — renders as a media picker, resolves to a CDN URL string */
  image: () => field('image'),
  /** Video field — renders as a media picker, resolves to a CDN URL string */
  video: () => field('video'),
  /** Document field — renders as a media picker for PDFs/docs, resolves to a CDN URL string */
  document: () => field('document'),
} as const
