'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'
import { useEnv } from '@/components/providers/EnvProvider'
import { SectionEditor } from '@/components/admin/SectionEditor'
import { Badge } from '@/components/ui/badge'
import type { FieldsSchema } from '@/components/admin/DynamicFieldRenderer'

export default function SectionTypePage({
  params,
}: {
  params: Promise<{ projectId: string; type: string }>
}) {
  const { projectId, type } = use(params)
  const { env } = useEnv()

  const registry = useQuery(api.sectionRegistry.getByType, {
    projectId: projectId as Id<'projects'>,
    sectionType: type,
  })
  const content = useQuery(api.sectionContent.get, {
    projectId: projectId as Id<'projects'>,
    sectionType: type,
    env,
  })

  if (registry === undefined || content === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (!registry) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted-foreground">Section type not found.</p>
      </div>
    )
  }

  let fieldsSchema: FieldsSchema = {}
  try {
    fieldsSchema = JSON.parse(registry.fieldsSchema) as FieldsSchema
  } catch {
    return (
      <p className="text-sm text-destructive">
        Failed to parse section schema. Re-register sections from your client app.
      </p>
    )
  }

  const items = (content?.items ?? []) as Record<string, unknown>[]

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{registry.label}</h1>
          <Badge variant={env === 'production' ? 'default' : 'secondary'}>
            {env === 'production' ? 'Prod' : 'Dev'}
          </Badge>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{type}</p>
      </div>

      <SectionEditor
        projectId={projectId as Id<'projects'>}
        sectionType={type}
        env={env}
        fieldsSchema={fieldsSchema}
        initialItems={items}
      />
    </div>
  )
}
