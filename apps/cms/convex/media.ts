import { v } from 'convex/values'
import { query, mutation, action } from './_generated/server'
import { R2 } from '@convex-dev/r2'
import { components } from './_generated/api'
import { requireOrgId } from './lib/orgGuard'

const r2 = new R2(components.r2)

// ─── Queries ────────────────────────────────────────────────────────────────

/** List all media for a project, newest first */
export const list = query({
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
  },
  handler: async (ctx, { projectId, r2Key, url, filename, mimeType, size }) => {
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
    })
  },
})

/** Delete a media record and its R2 object */
export const remove = mutation({
  args: { mediaId: v.id('media') },
  handler: async (ctx, { mediaId }) => {
    const orgId = await requireOrgId(ctx)
    const media = await ctx.db.get(mediaId)
    if (!media || media.orgId !== orgId) {
      throw new Error('Media not found')
    }
    await ctx.db.delete(mediaId)
    // R2 object deletion is handled by deleteFromR2 action below
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
  handler: async (ctx, { projectId, filename, mimeType }) => {
    // Namespace R2 keys by projectId to keep orgs isolated within the bucket
    const r2Key = `${projectId}/${Date.now()}-${filename}`
    const { url } = await r2.generateUploadUrl(ctx, r2Key, {
      expiresIn: 3600,
      httpMetadata: { contentType: mimeType },
    })
    return { uploadUrl: url, r2Key }
  },
})

/** Delete the actual R2 object after the DB record is removed */
export const deleteFromR2 = action({
  args: { r2Key: v.string() },
  handler: async (ctx, { r2Key }) => {
    await r2.deleteObject(ctx, r2Key)
  },
})
