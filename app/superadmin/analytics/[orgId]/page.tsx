'use client'

import { use } from 'react'
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
import { ArrowLeft } from 'lucide-react'

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

export default function OrgDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = use(params)
  const data = useQuery(api.superadminAnalytics.getOrgDetailedUsage, { orgId })

  if (data === undefined) {
    return (
      <div>
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="mt-8 h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  const tierLabel = data.tier.charAt(0).toUpperCase() + data.tier.slice(1)

  return (
    <div>
      <Link
        href="/superadmin/analytics"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to platform analytics
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          Organization Details
        </h1>
        <Badge variant="secondary" className="text-xs">
          {tierLabel}
        </Badge>
      </div>
      <p className="mt-1 font-mono text-[13px] text-muted-foreground">
        {data.orgId}
      </p>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Projects"
          value={data.projectCount.toLocaleString()}
          sub={`/ ${formatLimit(data.limits.maxProjects)}`}
        />
        <SummaryCard
          label="Content Items"
          value={data.totalContentItems.toLocaleString()}
          sub={`/ ${formatLimit(data.limits.maxContentItemsPerProject)}/project`}
        />
        <SummaryCard
          label="Storage"
          value={formatBytes(data.storageBytes)}
          sub={`/ ${formatStorageLimit(data.limits.maxStorageBytes)}`}
        />
        <SummaryCard label="Plan" value={tierLabel} />
      </div>

      {/* Projects table */}
      <h2 className="mt-8 text-sm font-semibold">Projects</h2>
      {data.projects.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No projects in this organization.
        </p>
      ) : (
        <div className="mt-4 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Sections</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Media</TableHead>
                <TableHead className="text-right">Storage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.projects.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {p.slug}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.sectionCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.contentItems}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.mediaFileCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatBytes(p.mediaStorageBytes)}
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
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">
        {value}
        {sub && (
          <span className="text-sm font-normal text-muted-foreground">
            {' '}{sub}
          </span>
        )}
      </p>
    </div>
  )
}
