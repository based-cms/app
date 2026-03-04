'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'
import { SectionEditor } from '@/components/admin/SectionEditor'
import { Button } from '@/components/ui/button'
import { Archive, RotateCcw } from 'lucide-react'
import type { FieldsSchema } from '@/components/admin/DynamicFieldRenderer'

/**
 * Section type page.
 * Fetches registry + content for the given project and section type.
 */
export default function SectionTypePage({
  params,
}: {
  params: Promise<{ projectId: string; type: string }>
}) {
  const { projectId, type } = use(params)
  const pid = projectId as Id<'projects'>

  const registry = useQuery(api.sectionRegistry.getByType, {
    projectId: pid,
    sectionType: type,
  })
  const project = useQuery(api.projects.get, { projectId: pid })

  if (registry === undefined || project === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        {[1, 2].map((i) => (
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

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </div>
    )
  }

  // Archived section — show notice instead of editor
  if (registry.archivedAt) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">{registry.label}</h1>
          <p className="font-mono text-[11px] text-muted-foreground">{type}</p>
        </div>
        <ArchivedNotice projectId={pid} sectionType={type} />
      </div>
    )
  }

  let fieldsSchema: FieldsSchema = {}
  try {
    fieldsSchema = JSON.parse(registry.fieldsSchema) as FieldsSchema
  } catch {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-destructive">
          Failed to parse section schema. Re-register sections from your client app.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">{registry.label}</h1>
        <p className="font-mono text-[11px] text-muted-foreground">{type}</p>
      </div>

      <ContentArea
        projectId={pid}
        sectionType={type}
        fieldsSchema={fieldsSchema}
      />
    </div>
  )
}

function ContentArea({
  projectId,
  sectionType,
  fieldsSchema,
}: {
  projectId: Id<'projects'>
  sectionType: string
  fieldsSchema: FieldsSchema
}) {
  const content = useQuery(api.sectionContent.get, {
    projectId,
    sectionType,
    env: 'production',
  })

  if (content === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  const items = (content?.items ?? []) as Record<string, unknown>[]

  return (
    <SectionEditor
      projectId={projectId}
      sectionType={sectionType}
      env="production"
      fieldsSchema={fieldsSchema}
      initialItems={items}
    />
  )
}

function ArchivedNotice({
  projectId,
  sectionType,
}: {
  projectId: Id<'projects'>
  sectionType: string
}) {
  const restoreMutation = useMutation(api.sectionRegistry.restore)

  return (
    <div className="rounded-xl border border-dashed py-12 text-center">
      <Archive className="mx-auto h-8 w-8 text-muted-foreground/50" />
      <p className="mt-4 text-sm font-medium">This section is archived</p>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
        It is no longer registered by the client app. Content is preserved but
        editing is disabled.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-5 gap-1.5"
        onClick={() => restoreMutation({ projectId, sectionType })}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Restore section
      </Button>
    </div>
  )
}
