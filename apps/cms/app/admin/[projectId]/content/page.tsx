'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'
import Link from 'next/link'
import { useEnv } from '@/components/providers/EnvProvider'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ChevronRight } from 'lucide-react'

export default function ContentPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const { env } = useEnv()
  const sections = useQuery(api.sectionRegistry.list, {
    projectId: projectId as Id<'projects'>,
  })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/admin/${projectId}`}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to project
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Content</h1>
          <Badge variant={env === 'production' ? 'default' : 'secondary'}>
            {env === 'production' ? 'Prod' : 'Dev'}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Sections are registered automatically when your client app boots.
        </p>
      </div>

      {sections === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">No sections registered yet.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Add <code className="rounded bg-muted px-1">cms.registerSections()</code> to your client app&apos;s layout.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => (
            <Link
              key={section._id}
              href={`/admin/${projectId}/content/${section.sectionType}`}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center py-4">
                  <div className="flex-1">
                    <CardTitle className="text-base">{section.label}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {section.sectionType}
                    </CardDescription>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
