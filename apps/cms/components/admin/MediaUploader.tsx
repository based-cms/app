'use client'

import { useRef, useState } from 'react'
import { useAction, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  projectId: Id<'projects'>
  folder?: string
  onUploaded?: (url: string) => void
}

export function MediaUploader({ projectId, folder, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const generateUploadUrl = useAction(api.media.generateUploadUrl)
  const createMedia = useMutation(api.media.create)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      // 1. Get presigned upload URL + public CDN URL from Convex
      const { uploadUrl, r2Key, publicUrl } = await generateUploadUrl({
        projectId,
        filename: file.name,
        mimeType: file.type,
      })

      // 2. Upload directly to R2
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!res.ok) throw new Error('Upload to R2 failed')

      // 4. Index in Convex media table
      await createMedia({
        projectId,
        r2Key,
        url: publicUrl,
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        folder: folder ?? '',
      })

      toast.success('File uploaded')
      onUploaded?.(publicUrl)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 transition-colors hover:border-muted-foreground/50"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,.pdf,.svg"
        className="hidden"
        onChange={handleChange}
      />
      <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">Drop a file here or click to upload</p>
      <p className="mt-1 text-xs text-muted-foreground">Images, PDFs, SVGs</p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Uploading…
          </>
        ) : (
          'Choose file'
        )}
      </Button>
    </div>
  )
}
