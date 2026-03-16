'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { resolvePostAuthRoute, waitForActiveOrganization } from '@/lib/org-routing'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Check, ChevronsUpDown, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const orgTabs = [
  { key: 'projects', label: 'Projects', path: '' },
  { key: 'analytics', label: 'Analytics', path: '/analytics' },
  { key: 'billing', label: 'Billing', path: '/billing' },
] as const

const projectTabs = [
  { key: 'overview', label: 'Overview', path: '' },
  { key: 'content', label: 'Content', path: '/content' },
  { key: 'files', label: 'Files', path: '/files' },
  { key: 'analytics', label: 'Analytics', path: '/analytics' },
  { key: 'settings', label: 'Settings', path: '/settings' },
] as const

interface Org {
  id: string
  name: string
  slug: string
  logo?: string | null
}

function Slash() {
  return (
    <span className="mx-1.5 text-xl font-extralight text-border select-none">/</span>
  )
}

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()
  // Better Auth org state
  const { data: activeOrg } = authClient.useActiveOrganization()
  const [orgs, setOrgs] = useState<Org[]>([])

  useEffect(() => {
    void authClient.organization.list().then(({ data }) => {
      setOrgs(data ?? [])
    })
  }, [])

  // Better Auth session for user info
  const { data: session } = authClient.useSession()

  // Extract projectId from URL: /admin/:projectId/...
  // Exclude known org-level routes so they don't get treated as projectIds
  const ORG_ROUTES = new Set(['analytics', 'billing'])
  const segments = pathname.split('/')
  const rawSegment = segments.length >= 3 ? segments[2] : null
  const projectId = rawSegment && !ORG_ROUTES.has(rawSegment) ? rawSegment : null

  // Skip Convex queries until the auth handshake completes
  const projects = useQuery(
    api.projects.list,
    isAuthenticated && !!activeOrg?.id ? {} : 'skip'
  )

  // Derive current project from the list — avoids a separate query and
  // prevents ArgumentValidationError if the URL contains an invalid ID
  const project = projectId
    ? (projects ?? []).find((p) => p._id === projectId) ?? null
    : null

  // Active tab — project-level or org-level
  const basePath = projectId ? `/admin/${projectId}` : null
  let activeTab: string | null = null
  if (basePath) {
    // Project-level tabs
    if (pathname === basePath || pathname === `${basePath}/`) {
      activeTab = 'overview'
    } else if (pathname.startsWith(`${basePath}/content`)) {
      activeTab = 'content'
    } else if (pathname.startsWith(`${basePath}/files`)) {
      activeTab = 'files'
    } else if (pathname.startsWith(`${basePath}/analytics`)) {
      activeTab = 'analytics'
    } else if (pathname.startsWith(`${basePath}/settings`)) {
      activeTab = 'settings'
    }
  } else {
    // Org-level tabs
    if (pathname === '/admin' || pathname === '/admin/') {
      activeTab = 'projects'
    } else if (pathname.startsWith('/admin/analytics')) {
      activeTab = 'analytics'
    } else if (pathname.startsWith('/admin/billing')) {
      activeTab = 'billing'
    }
  }

  async function switchOrg(orgId: string) {
    const { error } = await authClient.organization.setActive({
      organizationId: orgId,
    })
    if (error) return

    const synced = await waitForActiveOrganization(orgId)
    if (!synced) {
      const destination = await resolvePostAuthRoute()
      router.push(destination)
      return
    }

    router.push('/admin')
  }

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/sign-in')
  }

  const userName = session?.user?.name ?? session?.user?.email ?? ''
  const userInitial = userName?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      {/* Main nav row */}
      <div className="flex h-14 items-center px-4">
        {/* Left: breadcrumb */}
        <nav className="flex min-w-0 items-center">
          {/* Logo */}
          <Link
            href="/admin"
            className="flex shrink-0 items-center rounded-md px-1 py-1 transition-colors hover:bg-accent"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-xs font-bold text-background">
              B
            </span>
          </Link>

          <Slash />

          {/* Org: clickable name + custom switcher dropdown */}
          <div className="flex shrink-0 items-center">
            <Link
              href="/admin"
              className="rounded-md px-2 py-1 text-[13px] font-medium transition-colors hover:bg-accent"
            >
              {activeOrg?.name ?? '\u2026'}
            </Link>
            <DropdownMenu>
                <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground outline-none">
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {orgs.map((org) => {
                    const isCurrent = org.id === activeOrg?.id
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => {
                          if (!isCurrent) void switchOrg(org.id)
                        }}
                        className="flex items-center gap-2.5"
                      >
                        {org.logo ? (
                          <Image
                            src={org.logo}
                            alt={`${org.name} organization logo`}
                            width={20}
                            height={20}
                            className="h-5 w-5 shrink-0 rounded"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold">
                            {org.name?.[0] ?? '?'}
                          </span>
                        )}
                        <span className="flex-1 truncate text-[13px]">
                          {org.name}
                        </span>
                        {isCurrent && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
                        )}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
          </div>

          {/* Project selector + env toggle */}
          {projectId && (
            <>
              <Slash />
              <div className="flex min-w-0 items-center">
                <Link
                  href={`/admin/${projectId}`}
                  className="flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium transition-colors hover:bg-accent"
                >
                  {project?.faviconUrl && (
                    <Image
                      src={project.faviconUrl}
                      alt={`${project.name} favicon`}
                      width={16}
                      height={16}
                      className="h-4 w-4 shrink-0 rounded"
                      unoptimized
                    />
                  )}
                  <span className="max-w-[180px] truncate">
                    {project?.name ?? '\u2026'}
                  </span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground outline-none">
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    {(projects ?? []).map((p) => (
                      <DropdownMenuItem key={p._id} asChild>
                        <Link
                          href={`/admin/${p._id}`}
                          className="flex items-center gap-2.5"
                        >
                          {p.faviconUrl ? (
                            <Image
                              src={p.faviconUrl}
                              alt={`${p.name} favicon`}
                              width={16}
                              height={16}
                              className="h-4 w-4 shrink-0 rounded"
                              unoptimized
                            />
                          ) : (
                            <span
                              className="h-4 w-4 shrink-0 rounded"
                              style={{
                                backgroundColor: p.primaryColor || '#e5e5e5',
                              }}
                            />
                          )}
                          <span className="flex-1 truncate text-[13px]">
                            {p.name}
                          </span>
                          {p._id === projectId && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-foreground" />
                          )}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

            </>
          )}
        </nav>

        {/* Right: user menu */}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold outline-none transition-colors hover:bg-accent">
              {userInitial}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="truncate text-[13px] font-medium">{session?.user?.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{session?.user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleSignOut()}>
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tab row — org-level or project-level */}
      <div className="-mb-px flex items-end gap-1 px-4">
        {(projectId ? projectTabs : orgTabs).map((tab) => {
          const href = projectId
            ? `/admin/${projectId}${tab.path}`
            : `/admin${tab.path}`
          const isActive = activeTab === tab.key
          return (
            <Link
              key={tab.key}
              href={href}
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
    </header>
  )
}
