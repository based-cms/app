'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useTheme } from 'next-themes'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

export default function PreferencesPage() {
	const { theme, setTheme } = useTheme()
	const preferences = useQuery(api.userProfile.getPreferences)
	const upsertPreferences = useMutation(api.userProfile.upsertPreferences)
	const [mounted, setMounted] = useState(false)

	// Avoid hydration mismatch — next-themes reads from localStorage
	useEffect(() => setMounted(true), [])

	// Cross-device sync: if DB theme differs from next-themes on mount, apply DB value
	useEffect(() => {
		if (preferences?.theme && preferences.theme !== theme) {
			setTheme(preferences.theme)
		}
		// Only run on preferences load, not on every theme change
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [preferences?.theme])

	async function handleThemeChange(value: string) {
		setTheme(value)
		try {
			await upsertPreferences({ theme: value })
		} catch {
			// Theme was already applied via next-themes; DB save is best-effort
		}
	}

	return (
		<>
			{/* ── Theme ──────────────────────────────────────────────────── */}
			<section>
				<h2 className="text-sm font-semibold">Theme</h2>
				<div className="mt-4 rounded-lg border p-5">
					<div className="flex items-center justify-between">
						<div>
							<Label className="text-[13px]">Appearance</Label>
							<p className="mt-0.5 text-[11px] text-muted-foreground">
								Choose how Based CMS looks to you
							</p>
						</div>
						{mounted && (
							<Select value={theme} onValueChange={(v) => void handleThemeChange(v)}>
								<SelectTrigger className="w-36 h-9 text-[13px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="light">Light</SelectItem>
									<SelectItem value="dark">Dark</SelectItem>
									<SelectItem value="system">System</SelectItem>
								</SelectContent>
							</Select>
						)}
					</div>
				</div>
			</section>

			<Separator className="my-8" />

			{/* ── Language ────────────────────────────────────────────────── */}
			<section>
				<h2 className="text-sm font-semibold">Language</h2>
				<div className="mt-4 rounded-lg border p-5">
					<div className="flex items-center justify-between">
						<div>
							<Label className="text-[13px]">Display language</Label>
							<p className="mt-0.5 text-[11px] text-muted-foreground">
								More languages coming soon
							</p>
						</div>
						<Select value="en" disabled>
							<SelectTrigger className="w-36 h-9 text-[13px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="en">English</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</section>
		</>
	)
}
