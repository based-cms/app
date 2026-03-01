'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use, useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronDown, Archive, RotateCcw, Trash2 } from 'lucide-react'
import type { FieldsSchema } from '@/components/admin/DynamicFieldRenderer'

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function ContentPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const pid = projectId as Id<'projects'>
  const sections = useQuery(api.sectionRegistry.list, { projectId: pid })
  const restoreMutation = useMutation(api.sectionRegistry.restore)
  const permanentDeleteMutation = useMutation(api.sectionRegistry.permanentDelete)
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { active, archived } = useMemo(() => {
    if (!sections) return { active: [], archived: [] }
    return {
      active: sections.filter((s) => !s.archivedAt),
      archived: sections.filter((s) => s.archivedAt),
    }
  }, [sections])

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">Sections</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Registered automatically when your client app boots.
        </p>
      </div>

      {sections === undefined ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : active.length === 0 && archived.length === 0 ? (
        <div className="rounded-lg border border-dashed py-14 text-center">
          <p className="text-sm font-medium">No sections registered yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted-foreground">
            Define sections in your client app using{' '}
            <code className="rounded bg-muted px-1 text-[11px]">defineCMSSection()</code> and call{' '}
            <code className="rounded bg-muted px-1 text-[11px]">registerSections()</code> on boot.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Active sections */}
          {active.map((section) => {
            let fieldNames: string[] = []
            try {
              const fields = JSON.parse(section.fieldsSchema) as FieldsSchema
              fieldNames = Object.keys(fields)
            } catch {
              // ignore
            }

            return (
              <Link
                key={section._id}
                href={`/admin/${projectId}/content/${section.sectionType}`}
              >
                <Card className="transition-all hover:border-foreground/20 hover:shadow-sm">
                  <CardHeader className="flex flex-row items-center p-4">
                    <div className="flex-1">
                      <CardTitle className="text-sm">{section.label}</CardTitle>
                      <CardDescription className="mt-0.5 flex items-center gap-2 font-mono text-[11px]">
                        {section.sectionType}
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {fieldNames.length} field{fieldNames.length !== 1 ? 's' : ''}
                        </Badge>
                      </CardDescription>
                      {fieldNames.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {fieldNames.map((name) => (
                            <span
                              key={name}
                              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardHeader>
                </Card>
              </Link>
            )
          })}

          {/* Archived sections */}
          {archived.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowArchived((prev) => !prev)}
                className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>
                  {archived.length} archived section{archived.length !== 1 ? 's' : ''}
                </span>
                <ChevronDown
                  className={`ml-auto h-3.5 w-3.5 transition-transform ${showArchived ? 'rotate-180' : ''}`}
                />
              </button>

              {showArchived && (
                <div className="mt-2 space-y-2">
                  {archived.map((section) => (
                    <Card
                      key={section._id}
                      className="border-dashed opacity-60"
                    >
                      <CardHeader className="flex flex-row items-center p-4">
                        <div className="flex-1">
                          <CardTitle className="text-sm">{section.label}</CardTitle>
                          <CardDescription className="mt-0.5 flex items-center gap-2 font-mono text-[11px]">
                            {section.sectionType}
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              Archived {section.archivedAt ? timeAgo(section.archivedAt) : ''}
                            </Badge>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-[11px]"
                            onClick={() => {
                              restoreMutation({
                                projectId: pid,
                                sectionType: section.sectionType,
                              })
                            }}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </Button>
                          {confirmDelete === section.sectionType ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => {
                                  permanentDeleteMutation({
                                    projectId: pid,
                                    sectionType: section.sectionType,
                                  })
                                  setConfirmDelete(null)
                                }}
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => setConfirmDelete(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-[11px] text-destructive hover:text-destructive"
                              onClick={() => setConfirmDelete(section.sectionType)}
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
