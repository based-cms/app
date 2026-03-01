import { v } from 'convex/values'
import { query, mutation } from './_generated/server'
import { requireOrgId } from './lib/orgGuard'

// ─── Queries ────────────────────────────────────────────────────────────────

/** Folders at a specific parent path (for the current directory view) */
export const list = query({
  args: { projectId: v.id('projects'), parentPath: v.string() },
  handler: async (ctx, { projectId, parentPath }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) return []

    return ctx.db
      .query('folders')
      .withIndex('by_project_parent', (q) =>
        q.eq('projectId', projectId).eq('parentPath', parentPath)
      )
      .order('asc')
      .collect()
  },
})

/** Flat list of all folders for a project (used by the move-to-folder picker) */
export const listAll = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) return []

    return ctx.db
      .query('folders')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .order('asc')
      .collect()
  },
})

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Create a folder — computes path from parentPath + name */
export const create = mutation({
  args: {
    projectId: v.id('projects'),
    parentPath: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { projectId, parentPath, name }) => {
    const orgId = await requireOrgId(ctx)
    const project = await ctx.db.get(projectId)
    if (!project || project.orgId !== orgId) throw new Error('Project not found')

    const path = parentPath ? `${parentPath}/${name}` : name

    // Prevent duplicate sibling names
    const existing = await ctx.db
      .query('folders')
      .withIndex('by_project_parent', (q) =>
        q.eq('projectId', projectId).eq('parentPath', parentPath)
      )
      .filter((q) => q.eq(q.field('name'), name))
      .first()
    if (existing) throw new Error('A folder with that name already exists here')

    return ctx.db.insert('folders', { orgId, projectId, name, path, parentPath })
  },
})

/**
 * Rename a folder — cascades to all descendant folder paths and media folder fields.
 * All done in one mutation; safe for CMS-scale data.
 */
export const rename = mutation({
  args: { folderId: v.id('folders'), name: v.string() },
  handler: async (ctx, { folderId, name }) => {
    const orgId = await requireOrgId(ctx)
    const folder = await ctx.db.get(folderId)
    if (!folder || folder.orgId !== orgId) throw new Error('Folder not found')

    const oldPath = folder.path
    const newPath = folder.parentPath ? `${folder.parentPath}/${name}` : name

    if (oldPath === newPath) return

    // Check for sibling name conflict
    const sibling = await ctx.db
      .query('folders')
      .withIndex('by_project_parent', (q) =>
        q.eq('projectId', folder.projectId).eq('parentPath', folder.parentPath)
      )
      .filter((q) => q.eq(q.field('name'), name))
      .first()
    if (sibling) throw new Error('A folder with that name already exists here')

    // 1. Patch the folder itself
    await ctx.db.patch(folderId, { name, path: newPath })

    // 2. Cascade to all descendant subfolders
    const allFolders = await ctx.db
      .query('folders')
      .withIndex('by_project', (q) => q.eq('projectId', folder.projectId))
      .collect()

    for (const sub of allFolders) {
      if (sub._id === folderId) continue
      if (sub.path.startsWith(oldPath + '/')) {
        const newSubPath = newPath + sub.path.slice(oldPath.length)
        const newSubParent = sub.parentPath.startsWith(oldPath)
          ? newPath + sub.parentPath.slice(oldPath.length)
          : sub.parentPath
        await ctx.db.patch(sub._id, { path: newSubPath, parentPath: newSubParent })
      }
    }

    // 3. Cascade to all media in this folder or any descendant
    const allMedia = await ctx.db
      .query('media')
      .withIndex('by_project', (q) => q.eq('projectId', folder.projectId))
      .collect()

    for (const m of allMedia) {
      const mFolder = m.folder ?? ''
      if (mFolder === oldPath || mFolder.startsWith(oldPath + '/')) {
        const newFolder = newPath + mFolder.slice(oldPath.length)
        await ctx.db.patch(m._id, { folder: newFolder })
      }
    }
  },
})

/**
 * Delete a folder — cascades deletion to all descendant folders,
 * and moves any files inside to the deleted folder's parent path.
 */
export const remove = mutation({
  args: { folderId: v.id('folders') },
  handler: async (ctx, { folderId }) => {
    const orgId = await requireOrgId(ctx)
    const folder = await ctx.db.get(folderId)
    if (!folder || folder.orgId !== orgId) throw new Error('Folder not found')

    const folderPath = folder.path
    const parentPath = folder.parentPath

    // Collect all descendant folders (including self)
    const allFolders = await ctx.db
      .query('folders')
      .withIndex('by_project', (q) => q.eq('projectId', folder.projectId))
      .collect()

    const toDelete = allFolders.filter(
      (f) => f._id === folderId || f.path.startsWith(folderPath + '/')
    )

    // Move all files in this folder or descendants up to the parent
    const allMedia = await ctx.db
      .query('media')
      .withIndex('by_project', (q) => q.eq('projectId', folder.projectId))
      .collect()

    for (const m of allMedia) {
      const mFolder = m.folder ?? ''
      if (mFolder === folderPath || mFolder.startsWith(folderPath + '/')) {
        await ctx.db.patch(m._id, { folder: parentPath })
      }
    }

    // Delete all descendant folders + the folder itself
    for (const f of toDelete) {
      await ctx.db.delete(f._id)
    }
  },
})
