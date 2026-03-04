/**
 * Server-side string validators for Convex mutations.
 * Prevents injection, path traversal, and oversized inputs.
 */

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/
const MAX_NAME_LENGTH = 255

/** Validate a slug: lowercase alphanumeric + hyphens, 2-63 chars. */
export function validateSlug(slug: string): string {
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      'Invalid slug: must be 2-63 chars, lowercase letters, digits, and hyphens only, ' +
      'starting and ending with a letter or digit.'
    )
  }
  return slug
}

/** Validate a display name: non-empty, max 255 chars. */
export function validateName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error('Name cannot be empty')
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`Name exceeds maximum length of ${MAX_NAME_LENGTH} characters`)
  }
  return trimmed
}

/** Validate a folder name: no path traversal chars, max 255 chars. */
export function validateFolderName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error('Folder name cannot be empty')
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`Folder name exceeds maximum length of ${MAX_NAME_LENGTH} characters`)
  }
  if (/[/\\]/.test(trimmed)) {
    throw new Error('Folder name cannot contain / or \\')
  }
  if (trimmed === '..' || trimmed === '.') {
    throw new Error('Folder name cannot be "." or ".."')
  }
  if (trimmed.includes('..')) {
    throw new Error('Folder name cannot contain ".."')
  }
  return trimmed
}

/** Sanitize a filename for R2 key construction: strip dangerous chars. */
export function sanitizeFilename(filename: string): string {
  let sanitized = filename
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove path separators
    .replace(/[/\\]/g, '')
    // Remove path traversal
    .replace(/\.\./g, '')
    .trim()

  if (sanitized.length === 0) sanitized = 'unnamed'
  if (sanitized.length > 255) sanitized = sanitized.slice(0, 255)

  return sanitized
}

/** Allowed MIME types for file uploads. */
export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
])

/** Validate a MIME type against the allowlist. SVG is explicitly rejected. */
export function validateMimeType(mimeType: string): string {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(
      `MIME type "${mimeType}" is not allowed. ` +
      `Allowed types: ${[...ALLOWED_MIME_TYPES].join(', ')}`
    )
  }
  return mimeType
}

/** Validate a URL starts with https:// */
export function validateHttpsUrl(url: string): string {
  if (!url.startsWith('https://')) {
    throw new Error('URL must start with https://')
  }
  return url
}

/** Validate a section type string. */
export function validateSectionType(sectionType: string): string {
  const trimmed = sectionType.trim()
  if (trimmed.length === 0) throw new Error('Section type cannot be empty')
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`Section type exceeds maximum length of ${MAX_NAME_LENGTH} characters`)
  }
  return trimmed
}

/** Validate a fieldsSchema JSON string: must be valid JSON, max 10KB. */
export function validateFieldsSchema(fieldsSchema: string): string {
  if (fieldsSchema.length > 10_240) {
    throw new Error('Fields schema exceeds maximum size of 10KB')
  }
  try {
    JSON.parse(fieldsSchema)
  } catch {
    throw new Error('Fields schema is not valid JSON')
  }
  return fieldsSchema
}
