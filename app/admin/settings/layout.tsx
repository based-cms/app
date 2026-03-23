'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const settingsTabs = [
	{ key: 'profile', label: 'Profile', path: '/admin/settings/profile' },
	{ key: 'preferences', label: 'Preferences', path: '/admin/settings/preferences' },
] as const

export default function SettingsLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const pathname = usePathname()

	return (
		<div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
			<h1 className="text-lg font-semibold">Settings</h1>
			<p className="mt-0.5 text-[13px] text-muted-foreground">
				Manage your account and preferences
			</p>

			<div className="mt-6 -mb-px flex items-end gap-1 border-b">
				{settingsTabs.map((tab) => {
					const isActive = pathname.startsWith(tab.path)
					return (
						<Link
							key={tab.key}
							href={tab.path}
							className={cn(
								'border-b-2 px-3 pb-2 text-[13px] transition-colors',
								isActive
									? 'border-foreground font-medium text-foreground'
									: 'border-transparent text-muted-foreground hover:text-foreground'
							)}
						>
							{tab.label}
						</Link>
					)
				})}
			</div>

			<div className="mt-8">{children}</div>
		</div>
	)
}
