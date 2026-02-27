'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'
import Link from 'next/link'
import { useDeployment } from '@/components/providers/DeploymentProvider'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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
  const { env, setEnv, testAvailable } = useDeployment()

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
      {/* ── Environment Selector ────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Environment
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Live */}
          <button
            onClick={() => setEnv('live')}
            className={cn(
              'group flex flex-col rounded-xl border p-5 text-left transition-all',
              env === 'live'
                ? 'border-emerald-500/30 bg-emerald-500/[0.03] ring-1 ring-emerald-500/20'
                : 'hover:border-foreground/15 hover:bg-muted/30'
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full transition-colors',
                  env === 'live'
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                    : 'bg-emerald-500/40'
                )}
              />
              <span className="text-sm font-semibold">Live</span>
              {env === 'live' && (
                <Badge
                  variant="secondary"
                  className="ml-auto border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400"
                >
                  Active
                </Badge>
              )}
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
              Production content served to end users
            </p>
          </button>

          {/* Test */}
          <button
            onClick={() => testAvailable && setEnv('test')}
            disabled={!testAvailable}
            className={cn(
              'group flex flex-col rounded-xl border p-5 text-left transition-all',
              !testAvailable && 'cursor-not-allowed opacity-50',
              env === 'test'
                ? 'border-amber-500/30 bg-amber-500/[0.03] ring-1 ring-amber-500/20'
                : testAvailable
                  ? 'hover:border-foreground/15 hover:bg-muted/30'
                  : ''
            )}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full transition-colors',
                  env === 'test'
                    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                    : 'bg-amber-500/40'
                )}
              />
              <span className="text-sm font-semibold">Test</span>
              {env === 'test' && (
                <Badge
                  variant="secondary"
                  className="ml-auto border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                >
                  Active
                </Badge>
              )}
              {!testAvailable && (
                <Badge
                  variant="outline"
                  className="ml-auto text-[10px] text-muted-foreground"
                >
                  Not configured
                </Badge>
              )}
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
              {testAvailable
                ? 'Development content for testing'
                : 'Set NEXT_PUBLIC_CONVEX_TEST_URL to enable'}
            </p>
          </button>
        </div>
      </section>

      {/* ── Quick Links ─────────────────────────────────────────────── */}
      <section className="mt-8">
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
                  : sections.length === 0
                    ? 'No sections registered'
                    : `${sections.length} section${sections.length !== 1 ? 's' : ''} registered`}
              </p>
            </div>
            {sections && sections.length > 0 && (
              <div className="hidden flex-wrap gap-1 sm:flex">
                {sections.slice(0, 4).map((s) => (
                  <Badge key={s._id} variant="secondary" className="text-[10px]">
                    {s.label}
                  </Badge>
                ))}
                {sections.length > 4 && (
                  <Badge variant="secondary" className="text-[10px]">
                    +{sections.length - 4}
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
                API keys, data migration, project config
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
          </Link>
        </div>
      </section>
    </div>
  )
}
