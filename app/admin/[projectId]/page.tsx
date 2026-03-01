'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { FileText, FolderOpen, Settings, ArrowRight } from 'lucide-react'

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const project = useQuery(api.projects.get, {
    projectId: projectId as Id<'projects'>,
  })
  const sections = useQuery(api.sectionRegistry.list, {
    projectId: projectId as Id<'projects'>,
  })
  const activeSections = useMemo(
    () => sections?.filter((s) => !s.archivedAt) ?? [],
    [sections]
  )
  if (project === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* ── Quick Links ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Quick links
        </h2>
        <div className="divide-y rounded-xl border">
          <Link
            href={`/admin/${projectId}/content`}
            className="group flex items-center gap-4 rounded-t-xl px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Content</p>
              <p className="text-[12px] text-muted-foreground">
                {sections === undefined
                  ? '\u2026'
                  : activeSections.length === 0
                    ? 'No sections registered'
                    : `${activeSections.length} section${activeSections.length !== 1 ? 's' : ''} registered`}
              </p>
            </div>
            {activeSections.length > 0 && (
              <div className="hidden flex-wrap gap-1 sm:flex">
                {activeSections.slice(0, 4).map((s) => (
                  <Badge key={s._id} variant="secondary" className="text-[10px]">
                    {s.label}
                  </Badge>
                ))}
                {activeSections.length > 4 && (
                  <Badge variant="secondary" className="text-[10px]">
                    +{activeSections.length - 4}
                  </Badge>
                )}
              </div>
            )}
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
          </Link>

          <Link
            href={`/admin/${projectId}/files`}
            className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <FolderOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Files</p>
              <p className="text-[12px] text-muted-foreground">
                Upload and manage media
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
          </Link>

          <Link
            href={`/admin/${projectId}/settings`}
            className="group flex items-center gap-4 rounded-b-xl px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-500/10">
              <Settings className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Settings</p>
              <p className="text-[12px] text-muted-foreground">
                API keys and project config
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
          </Link>
        </div>
      </section>
    </div>
  )
}
