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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Projects</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Manage your client websites
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New project
        </Button>
      </div>

      {projects === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium">No projects yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Create a project to start managing content for a client website.
          </p>
          <Button size="sm" variant="outline" className="mt-4" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create your first project
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project._id} href={`/admin/${project._id}`}>
              <Card className="group h-full overflow-hidden transition-all hover:border-foreground/20 hover:shadow-sm">
                <div
                  className="h-0.5"
                  style={{ backgroundColor: project.primaryColor || 'transparent' }}
                />
                <CardHeader className="p-4">
                  <div className="flex items-center gap-2.5">
                    {project.faviconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.faviconUrl}
                        alt=""
                        className="h-5 w-5 rounded object-cover"
                      />
                    ) : (
                      <span
                        className="h-5 w-5 rounded"
                        style={{
                          backgroundColor: project.primaryColor || '#e5e5e5',
                        }}
                      />
                    )}
                    <CardTitle className="text-sm">{project.name}</CardTitle>
                  </div>
                  <CardDescription className="mt-1.5 font-mono text-[11px]">
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
