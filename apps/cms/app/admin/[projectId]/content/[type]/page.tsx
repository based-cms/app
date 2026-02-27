'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'
import { useDeployment } from '@/components/providers/DeploymentProvider'
import { ContentDeploymentGate } from '@/components/admin/ContentDeploymentGate'
import { SectionEditor } from '@/components/admin/SectionEditor'
import type { FieldsSchema } from '@/components/admin/DynamicFieldRenderer'

/**
 * Inner content area — rendered inside ContentDeploymentGate.
 * When env=test, the nearest ConvexProvider points to the test deployment,
 * so useQuery and useMutation here hit the test database.
 */
function ContentArea({
  projectId,
  sectionType,
  registry,
}: {
  projectId: Id<'projects'>
  sectionType: string
  registry: { label: string; fieldsSchema: string }
}) {
  const { contentEnv } = useDeployment()

  const content = useQuery(api.sectionContent.get, {
    projectId,
    sectionType,
    env: contentEnv,
  })

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
      env={contentEnv}
      fieldsSchema={fieldsSchema}
      initialItems={items}
    />
  )
}

/**
 * Section type page.
 * Registry is always fetched from the live deployment (outside the gate).
 * Content is fetched from whichever deployment is active (inside the gate).
 */
export default function SectionTypePage({
  params,
}: {
  params: Promise<{ projectId: string; type: string }>
}) {
  const { projectId, type } = use(params)
  const pid = projectId as Id<'projects'>

  // Always from live deployment (outside ContentDeploymentGate)
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">{registry.label}</h1>
        <p className="font-mono text-[11px] text-muted-foreground">{type}</p>
      </div>

      <ContentDeploymentGate project={project}>
        <ContentArea
          projectId={pid}
          sectionType={type}
          registry={registry}
        />
      </ContentDeploymentGate>
    </div>
  )
}
