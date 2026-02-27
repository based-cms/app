'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { DynamicFieldRenderer, type FieldsSchema } from './DynamicFieldRenderer'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  projectId: Id<'projects'>
  slug?: string
  sectionType: string
  env: 'production' | 'preview'
  fieldsSchema: FieldsSchema
  initialItems: Record<string, unknown>[]
}

export function SectionEditor({
  projectId,
  slug,
  sectionType,
  env,
  fieldsSchema,
  initialItems,
}: Props) {
  const [items, setItems] = useState<Record<string, unknown>[]>(initialItems)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setItems_ = useMutation(api.sectionContent.setItems)

  const save = useCallback(
    async (nextItems: Record<string, unknown>[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setSaving(true)
        try {
          await setItems_({ projectId, sectionType, env, items: nextItems })
        } catch {
          toast.error('Failed to save')
        } finally {
          setSaving(false)
        }
      }, 600) // debounce 600ms
    },
    [setItems_, projectId, sectionType, env]
  )

  function updateItem(index: number, fieldKey: string, value: unknown) {
    const next = items.map((item, i) =>
      i === index ? { ...item, [fieldKey]: value } : item
    )
    setItems(next)
    void save(next)
  }

  function addItem() {
    // Build a new item with default values from fieldsSchema
    const blank: Record<string, unknown> = {}
    for (const [key, def] of Object.entries(fieldsSchema)) {
      blank[key] = def.defaultValue ?? (def.type === 'boolean' ? false : def.type === 'number' ? 0 : '')
    }
    const next = [...items, blank]
    setItems(next)
    void save(next)
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index)
    setItems(next)
    void save(next)
  }

  const fieldEntries = Object.entries(fieldsSchema)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} item{items.length !== 1 ? 's' : ''}
          {saving && <span className="ml-2 text-xs opacity-60">Saving…</span>}
        </p>
        <Button size="sm" onClick={addItem}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">No items yet</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={addItem}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add first item
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="rounded-lg border bg-card">
              <div className="flex items-center gap-2 border-b px-4 py-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                <span className="flex-1 text-xs font-medium text-muted-foreground">
                  Item {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-7 w-7 text-muted-foreground hover:text-destructive')}
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-4 p-4">
                {fieldEntries.map(([key, def], fi) => (
                  <div key={key}>
                    <DynamicFieldRenderer
                      fieldKey={key}
                      def={def}
                      value={item[key]}
                      onChange={(val) => updateItem(index, key, val)}
                      projectId={projectId}
                      slug={slug}
                    />
                    {fi < fieldEntries.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
