'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'
import Link from 'next/link'
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
  const sections = useQuery(api.sectionRegistry.list, {
    projectId: projectId as Id<'projects'>,
  })

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Sections</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Registered automatically when your client app boots.
        </p>
      </div>

      {sections === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="rounded-lg border border-dashed py-14 text-center">
          <p className="text-sm font-medium">No sections registered yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
            Define sections in your client app using{' '}
            <code className="rounded bg-muted px-1 text-[11px]">defineCMSSection()</code> and call{' '}
            <code className="rounded bg-muted px-1 text-[11px]">registerSections()</code> on boot.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
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
                <Card className="transition-all hover:border-foreground/20 hover:shadow-sm">
                  <CardHeader className="flex flex-row items-center p-4">
                    <div className="flex-1">
                      <CardTitle className="text-sm">{section.label}</CardTitle>
                      <CardDescription className="mt-0.5 flex items-center gap-2 font-mono text-[11px]">
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
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
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
