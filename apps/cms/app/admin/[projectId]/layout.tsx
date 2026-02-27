'use client'

import { use } from 'react'
import { ProjectSidebar } from '@/components/admin/ProjectSidebar'

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)

  return (
    <div className="flex min-h-0 flex-1">
      <ProjectSidebar projectId={projectId} />
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  )
}
