import { v } from 'convex/values'
import { query, mutation, action } from './_generated/server'
import { R2 } from '@convex-dev/r2'
import { api, components } from './_generated/api'
import { sanitizeFilename } from './lib/validators'

const r2 = new R2(components.r2)

const USERNAME_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireUserId(ctx: { auth: { getUserIdentity: () => Promise<{ subject?: string } | null> } }): Promise<string> {
	const identity = await ctx.auth.getUserIdentity()
	if (!identity?.subject) throw new Error('Unauthenticated')
	return identity.subject
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const getPreferences = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx)
		return ctx.db
			.query('user_preferences')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.unique()
	},
})

export const checkUsernameAvailable = query({
	args: { username: v.string() },
	handler: async (ctx, { username }) => {
		const lower = username.toLowerCase()
		const existing = await ctx.db
			.query('user_preferences')
			.withIndex('by_username', (q) => q.eq('username', lower))
			.unique()
		if (!existing) return true
		// If it belongs to the caller, it's still "available" for them
		const userId = await requireUserId(ctx)
		return existing.userId === userId
	},
})

// ─── Mutations ───────────────────────────────────────────────────────────────

export const upsertPreferences = mutation({
	args: {
		username: v.optional(v.string()),
		theme: v.optional(v.string()),
		language: v.optional(v.string()),
		avatarUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx)

		// Validate username if provided
		if (args.username !== undefined) {
			const lower = args.username.toLowerCase()
			if (!USERNAME_RE.test(lower)) {
				throw new Error(
					'Username must be 3-30 characters, lowercase letters, digits, and hyphens only, starting and ending with a letter or digit.'
				)
			}
			// Check uniqueness
			const existing = await ctx.db
				.query('user_preferences')
				.withIndex('by_username', (q) => q.eq('username', lower))
				.unique()
			if (existing && existing.userId !== userId) {
				throw new Error('Username is already taken')
			}
			args.username = lower
		}

		// Validate theme if provided
		if (args.theme !== undefined && !['light', 'dark', 'system'].includes(args.theme)) {
			throw new Error('Theme must be "light", "dark", or "system"')
		}

		const existing = await ctx.db
			.query('user_preferences')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.unique()

		if (existing) {
			await ctx.db.patch(existing._id, args)
			return existing._id
		}

		return ctx.db.insert('user_preferences', { userId, ...args })
	},
})

export const deletePreferences = mutation({
	args: {},
	handler: async (ctx) => {
		const userId = await requireUserId(ctx)
		const existing = await ctx.db
			.query('user_preferences')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.unique()
		if (existing) {
			await ctx.db.delete(existing._id)
		}
	},
})

// ─── Actions ─────────────────────────────────────────────────────────────────

export const generateAvatarUploadUrl = action({
	args: {
		filename: v.string(),
		mimeType: v.string(),
	},
	handler: async (ctx, { filename, mimeType }): Promise<{ uploadUrl: string; r2Key: string; publicUrl: string }> => {
		const identity = await ctx.auth.getUserIdentity()
		if (!identity?.subject) throw new Error('Unauthenticated')
		const userId = identity.subject

		// Only allow image types for avatars
		const AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
		if (!AVATAR_TYPES.has(mimeType)) {
			throw new Error(`Avatar must be an image (JPEG, PNG, GIF, or WebP)`)
		}

		const safeFilename = sanitizeFilename(filename)
		const r2Key = `avatars/${userId}/${Date.now()}-${safeFilename}`
		const { url: uploadUrl } = await r2.generateUploadUrl(r2Key)

		const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '')
		if (!base) throw new Error('R2_PUBLIC_BASE_URL env var is not set')
		const publicUrl = `${base}/${r2Key}`

		return { uploadUrl, r2Key, publicUrl }
	},
})

export const deleteAvatarFromR2 = action({
	args: { r2Key: v.string() },
	handler: async (ctx, { r2Key }) => {
		const identity = await ctx.auth.getUserIdentity()
		if (!identity?.subject) throw new Error('Unauthenticated')

		// Only allow deleting avatars, not arbitrary R2 objects
		if (!r2Key.startsWith(`avatars/${identity.subject}/`)) {
			throw new Error('Unauthorized: not your avatar')
		}

		await r2.deleteObject(ctx, r2Key)
	},
})

/** Full account deletion: wipe all org projects & data, user preferences, avatar */
export const deleteAccountData = action({
	args: { avatarR2Key: v.optional(v.string()) },
	handler: async (ctx, { avatarR2Key }) => {
		const identity = await ctx.auth.getUserIdentity()
		if (!identity?.subject) throw new Error('Unauthenticated')

		// 1. Delete all projects in the user's active org (cascades sections, content, media, folders)
		const projects = await ctx.runQuery(api.projects.list, {})
		for (const project of projects) {
			await ctx.runMutation(api.projects.remove, { projectId: project._id })
		}

		// 2. Delete user preferences
		await ctx.runMutation(api.userProfile.deletePreferences, {})

		// 3. Delete avatar from R2 if present
		if (avatarR2Key?.startsWith(`avatars/${identity.subject}/`)) {
			try {
				await r2.deleteObject(ctx, avatarR2Key)
			} catch {
				// best-effort
			}
		}
	},
})
