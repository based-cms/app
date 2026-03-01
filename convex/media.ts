import { v } from 'convex/values'
import { query, mutation, action } from './_generated/server'
import { R2 } from '@convex-dev/r2'
import { components, internal } from './_generated/api'
import { requireOrgId } from './lib/orgGuard'

const r2 = new R2(components.r2)

// ─── Queries ────────────────────────────────────────────────────────────────

/** List media for a project in a specific folder (empty string = root) */
export const list = query({
  args: { projectId: v.id('projects'), folder: v.optional(v.string()) },
  handler: async (ctx, { projectId, folder }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) return []

    // Normalise: treat undefined as root ("")
    const folderPath = folder ?? ''

    return ctx.db
      .query('media')
      .withIndex('by_project_folder', (q) =>
        q.eq('projectId', projectId).eq('folder', folderPath)
      )
      .order('desc')
      .collect()
  },
})

/** List all media for a project across all folders (used by MediaPicker) */
export const listAll = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) return []

    return ctx.db
      .query('media')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .order('desc')
      .collect()
  },
})

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Index a newly uploaded file */
export const create = mutation({
  args: {
    projectId: v.id('projects'),
    r2Key: v.string(),
    url: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    folder: v.optional(v.string()),
  },
  handler: async (ctx, { projectId, r2Key, url, filename, mimeType, size, folder }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) {
      throw new Error('Project not found')
    }

    return ctx.db.insert('media', {
      orgId,
      projectId,
      r2Key,
      url,
      filename,
      mimeType,
      size,
      uploadedAt: Date.now(),
      folder: folder ?? '',
    })
  },
})

/** Rename a media file (updates filename display only — does not rename in R2) */
export const rename = mutation({
  args: { mediaId: v.id('media'), filename: v.string() },
  handler: async (ctx, { mediaId, filename }) => {
    const orgId = await requireOrgId(ctx)
    const media = await ctx.db.get(mediaId)
    if (!media || media.orgId !== orgId) throw new Error('Media not found')
    await ctx.db.patch(mediaId, { filename })
  },
})

/** Move a media file to a different folder (empty string = root) */
export const moveToFolder = mutation({
  args: { mediaId: v.id('media'), folder: v.string() },
  handler: async (ctx, { mediaId, folder }) => {
    const orgId = await requireOrgId(ctx)
    const media = await ctx.db.get(mediaId)
    if (!media || media.orgId !== orgId) throw new Error('Media not found')
    await ctx.db.patch(mediaId, { folder })
  },
})

/** Delete a media record — R2 cleanup is a separate action */
export const remove = mutation({
  args: { mediaId: v.id('media') },
  handler: async (ctx, { mediaId }) => {
    const orgId = await requireOrgId(ctx)
    const media = await ctx.db.get(mediaId)
    if (!media || media.orgId !== orgId) {
      throw new Error('Media not found')
    }
    await ctx.db.delete(mediaId)
    return media.r2Key
  },
})

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Generate a presigned URL for direct browser → R2 upload */
export const generateUploadUrl = action({
  args: {
    projectId: v.id('projects'),
    filename: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, { projectId, filename }): Promise<{ uploadUrl: string; r2Key: string; publicUrl: string }> => {
    // Resolve slug server-side — never trust client-passed values for R2 paths
    const project = await ctx.runQuery(internal.projects.getInternal, { projectId })
    if (!project) throw new Error('Project not found')
    if (!project.slug) throw new Error('Project has no slug configured')

    const r2Key = `${project.slug}/${Date.now()}-${filename}`
    const { url: uploadUrl } = await r2.generateUploadUrl(r2Key)

    // Public URL is served from the r2.dev CDN (or custom domain), not from the
    // S3-compatible API endpoint that the presigned upload URL points at.
    const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '')
    if (!base) throw new Error('R2_PUBLIC_BASE_URL env var is not set')
    const publicUrl = `${base}/${r2Key}`

    return { uploadUrl, r2Key, publicUrl }
  },
})

/** Delete the actual R2 object after the DB record is removed */
export const deleteFromR2 = action({
  args: { r2Key: v.string() },
  handler: async (ctx, { r2Key }) => {
    await r2.deleteObject(ctx, r2Key)
  },
})
