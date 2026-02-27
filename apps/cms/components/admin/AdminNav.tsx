'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs'
import { EnvToggle } from './EnvToggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const projectTabs = [
  { key: 'overview', label: 'Overview', path: '' },
  { key: 'content', label: 'Content', path: '/content' },
  { key: 'files', label: 'Files', path: '/files' },
] as const

export function AdminNav() {
  const pathname = usePathname()
  const { isAuthenticated } = useConvexAuth()

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

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      {/* Main nav row */}
      <div className="flex h-14 items-center px-4">
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

          <span className="mx-2 text-xl font-extralight text-border select-none">/</span>

          {/* Org switcher */}
          <div className="shrink-0">
            <OrganizationSwitcher
              hidePersonal
              appearance={{
                elements: {
                  rootBox: 'flex items-center',
                  organizationSwitcherTrigger: cn(
                    'rounded-md px-2 py-1 text-[13px] font-medium',
                    'hover:bg-accent transition-colors',
                    'shadow-none focus:shadow-none',
                    'border-none focus:outline-none',
                    'after:hidden'
                  ),
                },
              }}
            />
          </div>

          {/* Project selector */}
          {projectId && (
            <>
              <span className="mx-2 text-xl font-extralight text-border select-none">/</span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    'flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1',
                    'text-[13px] font-medium transition-colors hover:bg-accent',
                    'outline-none'
                  )}
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
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
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
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <EnvToggle />
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
