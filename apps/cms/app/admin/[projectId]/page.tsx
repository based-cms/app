'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, FolderOpen } from 'lucide-react'

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

  if (project === undefined) {
    return <div className="h-8 w-48 animate-pulse rounded bg-muted" />
  }

  if (!project) {
    return <p className="text-sm text-muted-foreground">Project not found.</p>
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All projects
        </Link>
        <div className="flex items-center gap-3">
          {project.faviconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.faviconUrl} alt="" className="h-8 w-8 rounded" />
          )}
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="font-mono text-xs text-muted-foreground">{project.slug}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Content card */}
        <Link href={`/admin/${projectId}/content`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Content</CardTitle>
              </div>
              <CardDescription>
                {sections === undefined ? (
                  '…'
                ) : sections.length === 0 ? (
                  'No sections registered yet'
                ) : (
                  <>
                    {sections.length} section{sections.length !== 1 ? 's' : ''} registered
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sections.map((s) => (
                        <Badge key={s._id} variant="secondary" className="text-xs">
                          {s.label}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Files card */}
        <Link href={`/admin/${projectId}/files`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Files</CardTitle>
              </div>
              <CardDescription>Upload and manage files in nested folders</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="mt-6 rounded-lg border bg-muted/30 p-4">
        <p className="text-xs font-medium text-muted-foreground">Package setup</p>
        <pre className="mt-2 overflow-x-auto rounded bg-background p-3 text-xs">
          {`import { createCMSClient } from 'cms-client'

export const cms = createCMSClient({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  orgSlug: '${project.slug}',
})`}
        </pre>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/${projectId}/settings`}>Settings</Link>
        </Button>
      </div>
    </div>
  )
}
