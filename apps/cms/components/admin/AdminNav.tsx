'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { UserButton, useOrganization, useOrganizationList } from '@clerk/nextjs'
import { EnvToggle } from './EnvToggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const projectTabs = [
  { key: 'overview', label: 'Overview', path: '' },
  { key: 'content', label: 'Content', path: '/content' },
  { key: 'files', label: 'Files', path: '/files' },
] as const

function Slash() {
  return (
    <span className="mx-1.5 text-xl font-extralight text-border select-none">/</span>
  )
}

export function AdminNav() {
  const pathname = usePathname()
  const { isAuthenticated } = useConvexAuth()
  const { organization } = useOrganization()
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  })

  // Extract projectId from URL: /admin/:projectId/...
  const segments = pathname.split('/')
  const projectId = segments.length >= 3 && segments[2] ? segments[2] : null

  // Skip Convex queries until the Clerk→Convex auth handshake completes
  const project = useQuery(
    api.projects.get,
    projectId && isAuthenticated
      ? { projectId: projectId as Id<'projects'> }
      : 'skip'
  )
  const projects = useQuery(
    api.projects.list,
    isAuthenticated ? {} : 'skip'
  )

  // Active tab
  const basePath = projectId ? `/admin/${projectId}` : null
  let activeTab: string | null = null
  if (basePath) {
    if (pathname === basePath || pathname === `${basePath}/`) {
      activeTab = 'overview'
    } else if (pathname.startsWith(`${basePath}/content`)) {
      activeTab = 'content'
    } else if (pathname.startsWith(`${basePath}/files`)) {
      activeTab = 'files'
    }
  }

  const orgs = userMemberships?.data ?? []

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
              {organization?.name ?? '\u2026'}
            </Link>
            <DropdownMenu>
                <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground outline-none">
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  {orgs.map((mem) => {
                    const org = mem.organization
                    const isCurrent = org.id === organization?.id
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() => {
                          if (!isCurrent && setActive) {
                            void setActive({ organization: org.id })
                          }
                        }}
                        className="flex items-center gap-2.5"
                      >
                        {org.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={org.imageUrl}
                            alt=""
                            className="h-5 w-5 shrink-0 rounded"
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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.faviconUrl}
                      alt=""
                      className="h-4 w-4 shrink-0 rounded"
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
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.faviconUrl}
                              alt=""
                              className="h-4 w-4 shrink-0 rounded"
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

              <Slash />
              <EnvToggle />
            </>
          )}
        </nav>

        {/* Right: user only */}
        <div className="ml-auto">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>

      {/* Tab row — project context only */}
      {projectId && (
        <div className="-mb-px flex items-end gap-1 px-4">
          {projectTabs.map((tab) => {
            const href = `/admin/${projectId}${tab.path}`
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
      )}
    </header>
  )
}
