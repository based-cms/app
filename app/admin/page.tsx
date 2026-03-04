'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, ArrowUpRight, Sparkles } from 'lucide-react'
import { CreateProjectDialog } from '@/components/admin/CreateProjectDialog'
import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

export default function AdminPage() {
  const router = useRouter()
  const projects = useQuery(api.projects.list)
  const [open, setOpen] = useState(false)

  // Keyboard shortcut: "n" to create new project
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.key === 'n' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        setOpen(true)
      }
    },
    []
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="mx-auto min-w-3xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {projects === undefined
              ? '\u2026'
              : projects.length === 0
                ? 'No projects yet'
                : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New project
          <kbd className="ml-1 hidden rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
            N
          </kbd>
        </Button>
      </div>

      {/* Project list */}
      <div className="mt-8">
        {projects === undefined ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">Create your first project</p>
            <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
              Each project connects to a client website and manages its content
              sections.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                size="sm"
                onClick={() => router.push('/onboarding')}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Get started
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New project
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y rounded-xl border">
            {projects.map((project, idx) => (
              <Link
                key={project._id}
                href={`/admin/${project._id}`}
                className={cn(
                  'group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  idx === 0 && 'rounded-t-xl',
                  idx === projects.length - 1 && 'rounded-b-xl'
                )}
              >
                {/* Color accent + favicon */}
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <div
                    className="absolute inset-y-0 left-0 w-[3px] rounded-l-lg"
                    style={{
                      backgroundColor: project.primaryColor || '#a1a1aa',
                    }}
                  />
                  {project.faviconUrl ? (
                    <Image
                      src={project.faviconUrl}
                      alt={`${project.name} favicon`}
                      width={20}
                      height={20}
                      className="h-5 w-5 rounded object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {project.name[0]?.toUpperCase() ?? '?'}
                    </span>
                  )}
                </div>

                {/* Name + slug */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {project.slug}
                  </p>
                </div>

                {/* Arrow */}
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateProjectDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
