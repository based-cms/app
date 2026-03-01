'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use } from 'react'
import { useDeployment } from '@/components/providers/DeploymentProvider'
import { ContentDeploymentGate } from '@/components/admin/ContentDeploymentGate'
import { SectionEditor } from '@/components/admin/SectionEditor'
import { Button } from '@/components/ui/button'
import { Archive, RotateCcw } from 'lucide-react'
import type { FieldsSchema } from '@/components/admin/DynamicFieldRenderer'

/**
 * Inner content area — rendered inside ContentDeploymentGate.
 * When env=test, the nearest ConvexProvider points to the test deployment,
 * so useQuery and useMutation here hit the test database.
 *
 * Resolves the project by slug (not ID) so it works across deployments —
 * each deployment has its own auto-generated IDs but shares the same slug.
 */
function ContentArea({
  slug,
  sectionType,
  registry,
}: {
  slug: string
  sectionType: string
  registry: { label: string; fieldsSchema: string }
}) {
  const { contentEnv } = useDeployment()

  // Resolve the project from the CURRENT deployment (live or test)
  const project = useQuery(api.projects.getBySlug, { slug })

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

  // Loading — project not resolved yet (shadow may be getting created)
  if (project === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (!project) {
    return (
      <p className="text-sm text-muted-foreground">
        Project not found on this deployment. Try switching back to Live.
      </p>
    )
  }

  return (
    <ContentAreaInner
      projectId={project._id}
      sectionType={sectionType}
      contentEnv={contentEnv}
      fieldsSchema={fieldsSchema}
    />
  )
}

/** Fetches content once we have the deployment-specific projectId. */
function ContentAreaInner({
  projectId,
  sectionType,
  contentEnv,
  fieldsSchema,
}: {
  projectId: Id<'projects'>
  sectionType: string
  contentEnv: 'production' | 'preview'
  fieldsSchema: FieldsSchema
}) {
  const content = useQuery(api.sectionContent.get, {
    projectId,
    sectionType,
    env: contentEnv,
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">{registry.label}</h1>
        <p className="font-mono text-[11px] text-muted-foreground">{type}</p>
      </div>

      <ContentDeploymentGate project={project}>
        <ContentArea
          slug={project.slug}
          sectionType={type}
          registry={registry}
        />
      </ContentDeploymentGate>
    </div>
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
