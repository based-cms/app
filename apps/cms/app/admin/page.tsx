'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { CreateProjectDialog } from '@/components/admin/CreateProjectDialog'
import { useState } from 'react'

export default function AdminPage() {
  const projects = useQuery(api.projects.list)
  const [open, setOpen] = useState(false)

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your client websites. Each project gets its own content sections and file storage.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New project
        </Button>
      </div>

      {projects === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a project to start managing content for a client website.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create your first project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project._id} href={`/admin/${project._id}`}>
              <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                <div
                  className="h-1"
                  style={{ backgroundColor: project.primaryColor || '#000000' }}
                />
                <CardHeader>
                  <div className="flex items-center gap-2.5">
                    {project.faviconUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.faviconUrl}
                        alt=""
                        className="h-6 w-6 rounded object-cover"
                      />
                    )}
                    <CardTitle className="text-base">{project.name}</CardTitle>
                  </div>
                  <CardDescription className="font-mono text-xs">
                    {project.slug}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
