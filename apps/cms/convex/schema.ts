import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // One document per client org — stores display info and the public slug
  projects: defineTable({
    orgId: v.string(),                         // Clerk Organization ID — isolation key
    name: v.string(),
    slug: v.string(),                          // public identifier used by cms-client package
    primaryColor: v.string(),
    faviconUrl: v.string(),
    registrationToken: v.optional(v.string()), // secret used by registerSections() in client apps
  })
    .index('by_org', ['orgId'])
    .index('by_slug', ['slug']),

  // Written by the client Next.js project on boot via cms.registerSections()
  // Defines what sections exist and what fields they have
  // CMS reads this to know what forms to render — no hardcoded section types
  section_registry: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    sectionType: v.string(),   // e.g. "team", "faq"
    label: v.string(),         // human-readable, e.g. "Team Members"
    fieldsSchema: v.string(),  // JSON-serialized field definitions from defineCMSSection
  })
    .index('by_project', ['projectId'])
    .index('by_project_type', ['projectId', 'sectionType']),

  // Actual content per section type — one document per (project, sectionType, env)
  // env field enables the Prod/Dev toggle in the CMS header
  section_content: defineTable({
    orgId: v.string(),
    projectId: v.id('projects'),
    sectionType: v.string(),
    env: v.union(v.literal('production'), v.literal('preview')),
    items: v.array(v.any()),   // array of records matching the fieldsSchema
  })
    .index('by_project_type_env', ['projectId', 'sectionType', 'env']),

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
    .index('by_project', ['projectId'])
    .index('by_r2_key', ['r2Key'])
    .index('by_project_folder', ['projectId', 'folder']),

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
