'use client'

import { useEffect, useRef, useState } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, Trash2, Upload, X } from 'lucide-react'

export default function ProfilePage() {
	const router = useRouter()
	const { data: session } = authClient.useSession()
	const preferences = useQuery(api.userProfile.getPreferences)
	const upsertPreferences = useMutation(api.userProfile.upsertPreferences)
	const generateAvatarUrl = useAction(api.userProfile.generateAvatarUploadUrl)
	const deleteAvatar = useAction(api.userProfile.deleteAvatarFromR2)
	const deleteAccountData = useAction(api.userProfile.deleteAccountData)

	// ─── Avatar ───────────────────────────────────────────────────────────────
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [uploadingAvatar, setUploadingAvatar] = useState(false)

	async function handleAvatarUpload(file: File) {
		setUploadingAvatar(true)
		try {
			const { uploadUrl, publicUrl } = await generateAvatarUrl({
				filename: file.name,
				mimeType: file.type,
			})
			const res = await fetch(uploadUrl, {
				method: 'PUT',
				body: file,
				headers: { 'Content-Type': file.type },
			})
			if (!res.ok) throw new Error('Upload failed')
			await upsertPreferences({ avatarUrl: publicUrl })
			await authClient.updateUser({ image: publicUrl })
			toast.success('Avatar updated')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to upload avatar')
		} finally {
			setUploadingAvatar(false)
		}
	}

	async function handleRemoveAvatar() {
		const avatarUrl = preferences?.avatarUrl ?? session?.user?.image
		try {
			if (avatarUrl) {
				const base = avatarUrl.indexOf('/avatars/')
				if (base !== -1) {
					const r2Key = avatarUrl.slice(base + 1)
					await deleteAvatar({ r2Key })
				}
			}
			await upsertPreferences({ avatarUrl: '' })
			await authClient.updateUser({ image: '' })
			toast.success('Avatar removed')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to remove avatar')
		}
	}

	// ─── Display Name ─────────────────────────────────────────────────────────
	const [name, setName] = useState('')
	const [savingName, setSavingName] = useState(false)

	useEffect(() => {
		if (session?.user?.name) setName(session.user.name)
	}, [session?.user?.name])

	const hasNameChanges = session?.user?.name !== undefined && name !== (session.user.name ?? '')

	async function handleSaveName() {
		setSavingName(true)
		try {
			await authClient.updateUser({ name })
			toast.success('Name updated')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update name')
		} finally {
			setSavingName(false)
		}
	}

	// ─── Username ─────────────────────────────────────────────────────────────
	const [username, setUsername] = useState('')
	const [savingUsername, setSavingUsername] = useState(false)

	useEffect(() => {
		if (preferences?.username) setUsername(preferences.username)
	}, [preferences?.username])

	const hasUsernameChanges =
		preferences !== undefined && username !== (preferences?.username ?? '')

	async function handleSaveUsername() {
		setSavingUsername(true)
		try {
			await upsertPreferences({ username })
			toast.success('Username updated')
		} catch (err) {
			const msg = err instanceof Error ? err.message : ''
			if (msg.includes('already taken')) {
				toast.error('That username is already taken')
			} else if (msg.includes('must be 3-30') || msg.includes('Username must be')) {
				toast.error('Username must be 3-30 characters: lowercase letters, numbers, and hyphens')
			} else {
				toast.error('Failed to update username')
			}
		} finally {
			setSavingUsername(false)
		}
	}

	// ─── Delete Account ───────────────────────────────────────────────────────
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
	const [deleteInput, setDeleteInput] = useState('')
	const [deletePassword, setDeletePassword] = useState('')
	const [deleting, setDeleting] = useState(false)
	const [hasPassword, setHasPassword] = useState<boolean | null>(null)

	// Check if user has a credential (email/password) account on dialog open
	useEffect(() => {
		if (!deleteConfirmOpen) return
		void authClient.listAccounts().then(({ data }) => {
			setHasPassword(
				data?.some((a) => a.providerId === 'credential') ?? false
			)
		})
	}, [deleteConfirmOpen])

	function extractAvatarR2Key(): string | undefined {
		const img = preferences?.avatarUrl ?? session?.user?.image
		if (!img) return undefined
		const idx = img.indexOf('/avatars/')
		if (idx === -1) return undefined
		return img.slice(idx + 1)
	}

	async function handleDeleteAccount() {
		setDeleting(true)
		try {
			// 1. Get all orgs the user belongs to
			const { data: orgs } = await authClient.organization.list()

			// 2. For each org, switch to it, delete its projects, then delete the org
			for (const org of orgs ?? []) {
				await authClient.organization.setActive({ organizationId: org.id })
				// Wait for Convex JWT to reflect the org switch
				await new Promise((r) => setTimeout(r, 1500))
				// Delete all projects in this org (cascades sections, content, media, folders)
				await deleteAccountData({ avatarR2Key: undefined })
				// Delete the org itself (removes all members)
				await authClient.organization.delete({ organizationId: org.id })
			}

			// 3. Delete user preferences + avatar
			// Re-run to clean up user-level data (preferences already deleted above,
			// but avatar cleanup needs to happen)
			const avatarR2Key = extractAvatarR2Key()
			if (avatarR2Key) {
				try {
					await deleteAvatar({ r2Key: avatarR2Key })
				} catch {
					// best-effort
				}
			}

			// 4. Delete the auth user via BetterAuth
			const deleteArgs = hasPassword ? { password: deletePassword } : {}
			const result = await authClient.deleteUser(deleteArgs)
			if (result.error) {
				throw new Error(result.error.message ?? 'Failed to delete account')
			}

			// 5. Sign out and redirect
			await authClient.signOut()
			router.push('/sign-in')
		} catch (err) {
			const msg = err instanceof Error ? err.message : ''
			if (msg.includes('password') || msg.includes('credential')) {
				toast.error('Incorrect password')
			} else {
				toast.error(msg || 'Failed to delete account')
			}
			setDeleting(false)
		}
	}

	// ─── Render ───────────────────────────────────────────────────────────────

	const userName = session?.user?.name ?? ''
	const userInitial = userName?.[0]?.toUpperCase() ?? '?'
	const avatarUrl = preferences?.avatarUrl || session?.user?.image

	return (
		<>
			{/* ── Avatar ──────────────────────────────────────────────────── */}
			<section>
				<h2 className="text-sm font-semibold">Avatar</h2>
				<div className="mt-4 flex items-center gap-4 rounded-lg border p-5">
					{avatarUrl ? (
						<img
							src={avatarUrl}
							alt="Avatar"
							className="h-16 w-16 shrink-0 rounded-full object-cover"
						/>
					) : (
						<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold">
							{userInitial}
						</div>
					)}
					<div className="flex gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={uploadingAvatar}
							onClick={() => fileInputRef.current?.click()}
						>
							{uploadingAvatar ? (
								<Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
							) : (
								<Upload className="mr-1.5 h-3 w-3" />
							)}
							{avatarUrl ? 'Change' : 'Upload'}
						</Button>
						{avatarUrl && (
							<Button
								size="sm"
								variant="ghost"
								onClick={() => void handleRemoveAvatar()}
							>
								<X className="mr-1.5 h-3 w-3" />
								Remove
							</Button>
						)}
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/jpeg,image/png,image/gif,image/webp"
						className="hidden"
						onChange={(e) => {
							const file = e.target.files?.[0]
							if (file) void handleAvatarUpload(file)
							e.target.value = ''
						}}
					/>
				</div>
			</section>

			<Separator className="my-8" />

			{/* ── Display Name ─────────────────────────────────────────────── */}
			<section>
				<h2 className="text-sm font-semibold">Display Name</h2>
				<div className="mt-4 space-y-4 rounded-lg border p-5">
					<div className="space-y-2">
						<Label htmlFor="display-name" className="text-[13px]">
							Name
						</Label>
						<Input
							id="display-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="h-9"
						/>
					</div>
					<div className="flex justify-end">
						<Button
							size="sm"
							disabled={savingName || !hasNameChanges}
							onClick={() => void handleSaveName()}
						>
							{savingName && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
							Save changes
						</Button>
					</div>
				</div>
			</section>

			<Separator className="my-8" />

			{/* ── Username ─────────────────────────────────────────────────── */}
			<section>
				<h2 className="text-sm font-semibold">Username</h2>
				<div className="mt-4 space-y-4 rounded-lg border p-5">
					<div className="space-y-2">
						<Label htmlFor="username" className="text-[13px]">
							Username
						</Label>
						<Input
							id="username"
							value={username}
							onChange={(e) =>
								setUsername(
									e.target.value
										.toLowerCase()
										.replace(/[^a-z0-9-]/g, '-')
										.replace(/-+/g, '-')
								)
							}
							className="h-9 font-mono text-[13px]"
							placeholder="your-username"
						/>
						<p className="text-[11px] text-muted-foreground">
							Your unique handle — lowercase letters, numbers, and hyphens
						</p>
					</div>
					<div className="flex justify-end">
						<Button
							size="sm"
							disabled={savingUsername || !hasUsernameChanges}
							onClick={() => void handleSaveUsername()}
						>
							{savingUsername && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
							Save changes
						</Button>
					</div>
				</div>
			</section>

			<Separator className="my-8" />

			{/* ── Email ────────────────────────────────────────────────────── */}
			<section>
				<h2 className="text-sm font-semibold">Email</h2>
				<div className="mt-4 rounded-lg border p-5">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-[13px] font-medium">{session?.user?.email}</p>
							<p className="mt-0.5 text-[11px] text-muted-foreground">
								Your primary email address
							</p>
						</div>
					</div>
				</div>
			</section>

			<Separator className="my-8" />

			{/* ── Danger Zone ──────────────────────────────────────────────── */}
			<section>
				<h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
				<div className="mt-4 rounded-lg border border-destructive/20 p-5">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-[13px] font-medium">Delete your account</p>
							<p className="mt-0.5 text-[11px] text-muted-foreground">
								Permanently remove your account, all projects, and associated data.
								This cannot be undone.
							</p>
						</div>
						<Button
							variant="destructive"
							size="sm"
							onClick={() => setDeleteConfirmOpen(true)}
						>
							<Trash2 className="mr-1.5 h-3 w-3" />
							Delete
						</Button>
					</div>
				</div>
			</section>

			{/* ── Delete Account Dialog ─────────────────────────────────── */}
			<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete account?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete your account, all projects in your
							organization, and all associated data. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-3 px-6 pb-2">
						{hasPassword && (
							<div>
								<Label
									htmlFor="delete-password"
									className="text-[13px] text-muted-foreground"
								>
									Enter your password to confirm
								</Label>
								<Input
									id="delete-password"
									type="password"
									value={deletePassword}
									onChange={(e) => setDeletePassword(e.target.value)}
									placeholder="Your password"
									className="mt-2 h-9"
								/>
							</div>
						)}
						<div>
							<Label
								htmlFor="delete-confirm"
								className="text-[13px] text-muted-foreground"
							>
								Type <strong>DELETE</strong> to confirm
							</Label>
							<Input
								id="delete-confirm"
								value={deleteInput}
								onChange={(e) => setDeleteInput(e.target.value)}
								placeholder="DELETE"
								className="mt-2 h-9"
							/>
						</div>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel
							disabled={deleting}
							onClick={() => {
								setDeleteInput('')
								setDeletePassword('')
							}}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={deleting || deleteInput !== 'DELETE' || (hasPassword === true && !deletePassword)}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={() => void handleDeleteAccount()}
						>
							{deleting && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
							Delete permanently
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
