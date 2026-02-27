'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'
import Link from 'next/link'
import { useEnv } from '@/components/providers/EnvProvider'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import type { FieldsSchema } from '@/components/admin/DynamicFieldRenderer'

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
      <div className="mb-8">
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
          <p className="text-sm font-medium">No sections registered yet</p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
            Define sections in your client app using{' '}
            <code className="rounded bg-muted px-1">defineCMSSection()</code> and call{' '}
            <code className="rounded bg-muted px-1">registerSections()</code> on boot.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => {
            let fieldNames: string[] = []
            try {
              const fields = JSON.parse(section.fieldsSchema) as FieldsSchema
              fieldNames = Object.keys(fields)
            } catch {
              // ignore
            }

            return (
              <Link
                key={section._id}
                href={`/admin/${projectId}/content/${section.sectionType}`}
              >
                <Card className="transition-all hover:shadow-md">
                  <CardHeader className="flex flex-row items-center py-4">
                    <div className="flex-1">
                      <CardTitle className="text-base">{section.label}</CardTitle>
                      <CardDescription className="flex items-center gap-2 font-mono text-xs">
                        {section.sectionType}
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {fieldNames.length} field{fieldNames.length !== 1 ? 's' : ''}
                        </Badge>
                      </CardDescription>
                      {fieldNames.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {fieldNames.map((name) => (
                            <span
                              key={name}
                              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
