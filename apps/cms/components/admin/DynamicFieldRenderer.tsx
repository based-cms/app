'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Id } from '@/convex/_generated/dataModel'
import { MediaPicker } from './MediaPicker'
import { FileIcon, Film } from 'lucide-react'

export interface FieldDef {
  type: 'string' | 'number' | 'boolean' | 'image' | 'video' | 'document'
  optional?: boolean
  multiline?: boolean
  labelText?: string
  defaultValue?: unknown
  accept?: string[]
}

export type FieldsSchema = Record<string, FieldDef>

interface Props {
  fieldKey: string
  def: FieldDef
  value: unknown
  onChange: (value: unknown) => void
  projectId?: Id<'projects'>
  slug?: string
}

export function DynamicFieldRenderer({
  fieldKey,
  def,
  value,
  onChange,
  projectId,
  slug,
}: Props) {
  const label = def.labelText ?? fieldKey
  const id = `field-${fieldKey}`

  if (def.type === 'boolean') {
    return (
      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label htmlFor={id} className="cursor-pointer font-normal">
          {label}
        </Label>
        <Switch
          id={id}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked)}
        />
      </div>
    )
  }

  // Unified media handler for image, video, document
  if (def.type === 'image' || def.type === 'video' || def.type === 'document') {
    const url = typeof value === 'string' ? value : ''
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex gap-2">
          <Input
            id={id}
            placeholder="https://..."
            value={url}
            onChange={(e) => onChange(e.target.value)}
            className="font-mono text-xs"
          />
          {projectId && (
            <MediaPicker
              projectId={projectId}
              slug={slug}
              fieldType={def.type}
              accept={def.accept}
              value={url}
              onChange={(newUrl) => onChange(newUrl)}
            />
          )}
        </div>
        {/* Type-appropriate preview */}
        {url && def.type === 'image' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="mt-2 h-24 w-24 rounded-md object-cover"
          />
        )}
        {url && def.type === 'video' && (
          <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
            <Film className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-xs text-muted-foreground">{url}</span>
          </div>
        )}
        {url && def.type === 'document' && (
          <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
            <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-mono text-xs text-muted-foreground">{url}</span>
          </div>
        )}
      </div>
    )
  }

  if (def.type === 'number') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          type="number"
          value={typeof value === 'number' ? value : (def.defaultValue as number ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    )
  }

  // string — multiline or single line
  if (def.multiline) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        <Textarea
          id={id}
          placeholder={`Enter ${label.toLowerCase()}…`}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        placeholder={`Enter ${label.toLowerCase()}…`}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
