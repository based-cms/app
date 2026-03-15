'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`
}

function formatLimit(value: number | null): string {
  return value === null ? 'Unlimited' : value.toLocaleString()
}

function formatStorageLimit(bytes: number | null): string {
  return bytes === null ? 'Unlimited' : formatBytes(bytes)
}

export default function OrgAnalyticsPage() {
  const usage = useQuery(api.analytics.getOrgUsage)
  const projectsUsage = useQuery(api.analytics.getProjectsUsage)

  if (usage === undefined || projectsUsage === undefined) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="mt-8 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  const tierLabel = usage.tier.charAt(0).toUpperCase() + usage.tier.slice(1)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Usage &amp; Analytics</h1>
        <Badge variant="secondary" className="text-xs">
          {tierLabel}
        </Badge>
      </div>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Monitor usage across all your projects
      </p>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Projects"
          value={usage.projectCount.toLocaleString()}
          limit={formatLimit(usage.limits.maxProjects)}
        />
        <SummaryCard
          label="Content Items"
          value={usage.totalContentItems.toLocaleString()}
          limit={null}
        />
        <SummaryCard
          label="Storage"
          value={formatBytes(usage.storageBytes)}
          limit={formatStorageLimit(usage.limits.maxStorageBytes)}
        />
      </div>

      {/* Projects table */}
      <h2 className="mt-8 text-sm font-semibold">Projects</h2>
      {projectsUsage.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <div className="mt-4 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Sections</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Storage</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsUsage.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">{p.sectionCount}</TableCell>
                  <TableCell className="text-right">{p.contentItems}</TableCell>
                  <TableCell className="text-right">
                    {formatBytes(p.mediaStorageBytes)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/${p._id}/analytics`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  limit,
}: {
  label: string
  value: string
  limit: string | null
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">
        {value}
        {limit && (
          <span className="text-sm font-normal text-muted-foreground">
            {' '}/ {limit}
          </span>
        )}
      </p>
    </div>
  )
}
