'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'

export default function SuperadminPage() {
  const projects = useQuery(api.projects.listAll)

  // Group by orgId
  const byOrg = new Map<string, typeof projects>()
  if (projects) {
    for (const p of projects) {
      const list = byOrg.get(p.orgId) ?? []
      list.push(p)
      byOrg.set(p.orgId, list)
    }
  }

  return (
    <>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Superadmin</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Cross-org overview of all projects on this deployment.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/superadmin/analytics">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
            Platform Analytics
          </Link>
        </Button>
      </div>

      {projects === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {byOrg.size} org{byOrg.size !== 1 ? 's' : ''}
            </Badge>
            <Badge variant="secondary">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {Array.from(byOrg.entries()).map(([orgId, orgProjects]) => (
            <div key={orgId}>
              <h2 className="mb-2 font-mono text-xs text-muted-foreground">
                org: {orgId}
              </h2>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead className="text-right">ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgProjects!.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                        <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
                          {p._id}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
