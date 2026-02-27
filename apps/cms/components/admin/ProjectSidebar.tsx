'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { ArrowLeft, FileText, FolderOpen, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  projectId: string
}

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, path: '' },
  { label: 'Content', icon: FileText, path: '/content' },
  { label: 'Files', icon: FolderOpen, path: '/files' },
] as const

export function ProjectSidebar({ projectId }: Props) {
  const pathname = usePathname()
  const project = useQuery(api.projects.get, {
    projectId: projectId as Id<'projects'>,
  })

  const basePath = `/admin/${projectId}`

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r bg-muted/20 md:block">
      <div className="flex h-full flex-col">
        {/* Project info */}
        <div className="border-b px-4 py-4">
          {project ? (
            <div className="flex items-center gap-2.5">
              {project.faviconUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.faviconUrl}
                  alt=""
                  className="h-6 w-6 shrink-0 rounded"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{project.name}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {project.slug}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {navItems.map(({ label, icon: Icon, path }) => {
            const href = `${basePath}${path}`
            // "Overview" is active only on exact match; others match prefix
            const isActive = path === ''
              ? pathname === basePath
              : pathname.startsWith(href)

            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Back link */}
        <div className="border-t px-4 py-3">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All projects
          </Link>
        </div>
      </div>
    </aside>
  )
}
