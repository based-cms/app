import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { rateLimitTables } from 'convex-helpers/server/rateLimit'

export default defineSchema({
  ...rateLimitTables,

  // One document per client org — stores display info and the public slug
  projects: defineTable({
    orgId: v.string(),                         // Organization ID — isolation key
    name: v.string(),
    slug: v.string(),                          // public identifier used by @based-cms/client package
    primaryColor: v.string(),
    faviconUrl: v.string(),
    registrationToken: v.optional(v.string()), // plaintext — kept for dual-read migration, will be removed
    registrationTokenHash: v.optional(v.string()), // SHA-256 hex hash of the token
  })
    .index('by_org', ['orgId'])
    .index('by_slug', ['slug'])
    .index('by_token', ['registrationToken'])
    .index('by_token_hash', ['registrationTokenHash']),

  // Written by the client Next.js project on boot via cms.registerSections()
  // Defines what sections exist and what fields they have
  // CMS reads this to know what forms to render — no hardcoded section types
  section_registry: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    sectionType: v.string(),   // e.g. "team", "faq"
    label: v.string(),         // human-readable, e.g. "Team Members"
    fieldsSchema: v.string(),  // JSON-serialized field definitions from defineCMSSection
    archivedAt: v.optional(v.number()), // Unix ms — set when section removed from client code
  })
    .index('by_project', ['projectId'])
    .index('by_project_type', ['projectId', 'sectionType']),

  // Actual content per section type — one document per (project, sectionType, env)
  // env field enables the Prod/Dev toggle in the CMS header
  section_content: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    sectionType: v.string(),
    env: v.literal('production'),
    items: v.array(v.any()),   // array of records matching the fieldsSchema
  })
    .index('by_project_type_env', ['projectId', 'sectionType', 'env'])
    .index('by_project', ['projectId']),

  // Index of files stored in Cloudflare R2
  // R2 is the source of truth for the actual bytes — this table is the metadata index
  media: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    r2Key: v.string(),     // key in R2 bucket
    url: v.string(),       // public URL served from R2
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),      // bytes
    uploadedAt: v.number(), // Unix ms
    folder: v.optional(v.string()), // full folder path, "" = root
  })
    .index('by_org', ['orgId'])
    .index('by_project', ['projectId'])
    .index('by_r2_key', ['r2Key'])
    .index('by_project_folder', ['projectId', 'folder']),

  // Per-user preferences — username, theme, language
  user_preferences: defineTable({
    userId: v.string(),
    username: v.optional(v.string()),
    theme: v.optional(v.string()),
    language: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_username', ['username']),

  // Superadmin allowlist — email-based, checked at query time
  superadmins: defineTable({
    email: v.string(),
    addedAt: v.number(),
  }).index('by_email', ['email']),

  // Virtual folder hierarchy — leaf name + full path + parent path
  folders: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    name: v.string(),        // leaf name, e.g. "headers"
    path: v.string(),        // full path, e.g. "images/headers"
    parentPath: v.string(),  // parent path, "" for root-level folders
  })
    .index('by_project', ['projectId'])
    .index('by_project_parent', ['projectId', 'parentPath']),
})
