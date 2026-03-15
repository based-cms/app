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
import { ArrowLeft, ArrowUpRight } from 'lucide-react'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`
}

const TIER_COLORS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  free: 'secondary',
  pro: 'default',
  max: 'default',
  enterprise: 'default',
}

export default function SuperadminAnalyticsPage() {
  const data = useQuery(api.superadminAnalytics.getPlatformUsage)

  if (data === undefined) {
    return (
      <div>
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="mt-8 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  const { summary, orgs } = data

  return (
    <div>
      <Link
        href="/superadmin"
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to overview
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">
        Platform Analytics
      </h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Usage across all organizations on this deployment
      </p>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Organizations" value={summary.totalOrgs} />
        <SummaryCard label="Projects" value={summary.totalProjects} />
        <SummaryCard
          label="Total Storage"
          value={formatBytes(summary.totalStorageBytes)}
        />
        <div className="rounded-lg border p-4">
          <p className="text-[13px] text-muted-foreground">Plan Distribution</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(summary.tierDistribution)
              .filter(([, count]) => count > 0)
              .map(([tier, count]) => (
                <Badge key={tier} variant="secondary" className="text-[10px]">
                  {tier}: {count}
                </Badge>
              ))}
            {Object.values(summary.tierDistribution).every((c) => c === 0) && (
              <span className="text-xs text-muted-foreground">None</span>
            )}
          </div>
        </div>
      </div>

      {/* Orgs table */}
      <h2 className="mt-8 text-sm font-semibold">Organizations</h2>
      {orgs.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No organizations yet.
        </p>
      ) : (
        <div className="mt-4 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Org ID</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Storage</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => (
                <TableRow key={org.orgId}>
                  <TableCell className="font-mono text-xs">
                    {org.orgId}
                  </TableCell>
                  <TableCell>
                    <Badge variant={TIER_COLORS[org.tier] ?? 'secondary'} className="text-[10px]">
                      {org.tier}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {org.projectCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {org.contentItemCount}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatBytes(org.storageBytes)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/superadmin/analytics/${encodeURIComponent(org.orgId)}`}
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
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}
