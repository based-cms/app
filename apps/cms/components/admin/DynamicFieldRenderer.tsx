'use client'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

export interface FieldDef {
  type: 'string' | 'number' | 'boolean' | 'image'
  optional?: boolean
  multiline?: boolean
  labelText?: string
  defaultValue?: unknown
}

export type FieldsSchema = Record<string, FieldDef>

interface Props {
  fieldKey: string
  def: FieldDef
  value: unknown
  onChange: (value: unknown) => void
  onImageUpload?: (fieldKey: string) => void
}

export function DynamicFieldRenderer({
  fieldKey,
  def,
  value,
  onChange,
  onImageUpload,
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

  if (def.type === 'image') {
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
          {onImageUpload && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onImageUpload(fieldKey)}
              title="Upload image"
            >
              <Upload className="h-4 w-4" />
            </Button>
          )}
        </div>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="mt-2 h-24 w-24 rounded-md object-cover"
          />
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
