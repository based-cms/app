/**
 * Validates section content items against the fieldsSchema from the registry.
 * Prevents XSS payloads, unknown keys, wrong types, and oversized strings.
 */

const MAX_STRING_LENGTH = 10_000
const MAX_ITEMS = 500

// Patterns to strip from string values to prevent stored XSS
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /\bon\w+\s*=/gi,
]

interface FieldDef {
  name: string
  type: 'string' | 'number' | 'boolean' | 'image'
  optional?: boolean
}

function sanitizeString(value: string): string {
  let sanitized = value
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '')
  }
  if (sanitized.length > MAX_STRING_LENGTH) {
    sanitized = sanitized.slice(0, MAX_STRING_LENGTH)
  }
  return sanitized
}

/**
 * Validate and sanitize items against the fieldsSchema.
 * @param items - The raw items array from the client
 * @param fieldsSchemaJson - The JSON-serialized field definitions from the registry
 * @returns Sanitized items array
 * @throws If validation fails
 */
export function validateItems(
  items: unknown[],
  fieldsSchemaJson: string
): Record<string, unknown>[] {
  if (items.length > MAX_ITEMS) {
    throw new Error(`Too many items: ${items.length} exceeds maximum of ${MAX_ITEMS}`)
  }

  let fields: FieldDef[]
  try {
    const parsed = JSON.parse(fieldsSchemaJson)
    fields = Array.isArray(parsed) ? parsed : parsed.fields ?? []
  } catch {
    // If we can't parse the schema, skip field-level validation
    // but still sanitize strings
    return items.map((item) => sanitizeItem(item as Record<string, unknown>))
  }

  const knownKeys = new Set(fields.map((f) => f.name))
  // Also allow _key for React list reconciliation
  knownKeys.add('_key')

  return items.map((item, idx) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error(`Item at index ${idx} must be an object`)
    }

    const record = item as Record<string, unknown>
    const sanitized: Record<string, unknown> = {}

    // Copy only known keys, validate types
    for (const [key, value] of Object.entries(record)) {
      if (!knownKeys.has(key)) continue // silently strip unknown keys

      if (key === '_key') {
        sanitized._key = typeof value === 'string' ? sanitizeString(value) : value
        continue
      }

      const fieldDef = fields.find((f) => f.name === key)
      if (!fieldDef) continue

      if (value === null || value === undefined) {
        if (!fieldDef.optional) {
          throw new Error(`Item[${idx}].${key} is required`)
        }
        sanitized[key] = value
        continue
      }

      switch (fieldDef.type) {
        case 'string':
        case 'image':
          if (typeof value !== 'string') {
            throw new Error(`Item[${idx}].${key} must be a string, got ${typeof value}`)
          }
          sanitized[key] = sanitizeString(value)
          break
        case 'number':
          if (typeof value !== 'number') {
            throw new Error(`Item[${idx}].${key} must be a number, got ${typeof value}`)
          }
          sanitized[key] = value
          break
        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new Error(`Item[${idx}].${key} must be a boolean, got ${typeof value}`)
          }
          sanitized[key] = value
          break
        default:
          sanitized[key] = typeof value === 'string' ? sanitizeString(value) : value
      }
    }

    return sanitized
  })
}

/** Fallback sanitizer when no schema is available — just sanitize strings. */
function sanitizeItem(item: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(item)) {
    result[key] = typeof value === 'string' ? sanitizeString(value) : value
  }
  return result
}
