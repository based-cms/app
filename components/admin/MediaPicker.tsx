'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useAction, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileIcon,
  Film,
  ImageIcon,
  FileText,
  Folder,
  Loader2,
  Upload,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type MediaFieldType = 'image' | 'video' | 'document'

interface Props {
  projectId: Id<'projects'>
  fieldType: MediaFieldType
  accept?: string[]
  value: string
  onChange: (url: string) => void
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Check if a MIME type matches the field type category */
function matchesFieldType(mime: string, fieldType: MediaFieldType): boolean {
  switch (fieldType) {
    case 'image':
      return mime.startsWith('image/')
    case 'video':
      return mime.startsWith('video/')
    case 'document':
      // Documents = anything that's not image or video
      return !mime.startsWith('image/') && !mime.startsWith('video/')
  }
}

/** Check if a MIME type matches an accept pattern (supports wildcards like image/*) */
function matchesAccept(mime: string, acceptList: string[]): boolean {
  return acceptList.some((pattern) => {
    if (pattern === mime) return true
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -1) // e.g. "image/"
      return mime.startsWith(prefix)
    }
    return false
  })
}

function getFieldIcon(fieldType: MediaFieldType) {
  switch (fieldType) {
    case 'image':
      return <ImageIcon className="h-4 w-4" />
    case 'video':
      return <Film className="h-4 w-4" />
    case 'document':
      return <FileText className="h-4 w-4" />
  }
}

function getAcceptString(fieldType: MediaFieldType, accept?: string[]): string {
  if (accept) return accept.join(',')
  switch (fieldType) {
    case 'image':
      return 'image/*'
    case 'video':
      return 'video/*'
    case 'document':
      return '.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx'
  }
}

export function MediaPicker({
  projectId,
  fieldType,
  accept,
  value,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false)
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allMedia = useQuery(api.media.listAll, open ? { projectId } : 'skip')
  const allFolders = useQuery(api.folders.listAll, open ? { projectId } : 'skip')
  const generateUploadUrl = useAction(api.media.generateUploadUrl)
  const createMedia = useMutation(api.media.create)

  // Filter files by field type and optional accept list
  const filteredFiles = (allMedia ?? []).filter((file) => {
    if (!matchesFieldType(file.mimeType, fieldType)) return false
    if (accept && accept.length > 0 && !matchesAccept(file.mimeType, accept)) return false
    if (folderFilter !== null && (file.folder ?? '') !== folderFilter) return false
    return true
  })

  // Unique folders from the filtered set for folder chips
  const folderPaths = Array.from(
    new Set((allFolders ?? []).map((f) => f.path))
  ).sort()

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const { uploadUrl, r2Key, publicUrl } = await generateUploadUrl({
          projectId,
          filename: file.name,
          mimeType: file.type,
        })
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })
        if (!res.ok) throw new Error('Upload to R2 failed')
        await createMedia({
          projectId,
          r2Key,
          url: publicUrl,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          folder: '',
        })
        toast.success('File uploaded')
        onChange(publicUrl)
        setOpen(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [generateUploadUrl, createMedia, projectId, onChange]
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" title={`Browse ${fieldType}s`}>
          {getFieldIcon(fieldType)}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getFieldIcon(fieldType)}
            Select {fieldType}
          </DialogTitle>
        </DialogHeader>

        {/* Upload + folder filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-3.5 w-3.5" />
            )}
            Upload new
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={getAcceptString(fieldType, accept)}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleUpload(file)
            }}
          />

          <div className="h-4 w-px bg-border" />

          <button
            onClick={() => setFolderFilter(null)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
              folderFilter === null
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFolderFilter('')}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
              folderFilter === ''
                ? 'border-foreground bg-foreground text-background'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            Root
          </button>
          {folderPaths.map((path) => (
            <button
              key={path}
              onClick={() => setFolderFilter(path)}
              className={cn(
                'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors',
                folderFilter === path
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <Folder className="h-2.5 w-2.5" />
              {path}
            </button>
          ))}
        </div>

        {/* File grid */}
        <ScrollArea className="h-72">
          {allMedia === undefined ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm text-muted-foreground">
                No {fieldType} files found.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload one
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 p-1 sm:grid-cols-4">
              {filteredFiles.map((file) => {
                const isSelected = value === file.url
                return (
                  <button
                    key={file._id}
                    onClick={() => {
                      onChange(file.url)
                      setOpen(false)
                    }}
                    className={cn(
                      'group relative overflow-hidden rounded-lg border text-left transition-all hover:ring-2 hover:ring-ring',
                      isSelected && 'ring-2 ring-primary'
                    )}
                  >
                    {/* Preview */}
                    <div className="flex h-24 items-center justify-center bg-muted">
                      {file.mimeType.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={file.url}
                          alt={file.filename}
                          className="h-full w-full object-cover"
                        />
                      ) : file.mimeType.startsWith('video/') ? (
                        <Film className="h-8 w-8 text-muted-foreground" />
                      ) : (
                        <FileIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-1.5">
                      <p className="truncate text-[11px] font-medium">{file.filename}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
