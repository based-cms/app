'use client'

import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use, useState } from 'react'
import Link from 'next/link'
import { MediaUploader } from '@/components/admin/MediaUploader'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Copy, Trash2, FileIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MediaPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const media = useQuery(api.media.list, {
    projectId: projectId as Id<'projects'>,
  })
  const removeMedia = useMutation(api.media.remove)
  const deleteFromR2 = useAction(api.media.deleteFromR2)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(mediaId: Id<'media'>, r2Key: string) {
    setDeleting(mediaId)
    try {
      await removeMedia({ mediaId })
      await deleteFromR2({ r2Key })
      toast.success('File deleted')
    } catch {
      toast.error('Failed to delete file')
    } finally {
      setDeleting(null)
    }
  }

  function copyUrl(url: string) {
    void navigator.clipboard.writeText(url)
    toast.success('URL copied')
  }

  const isImage = (mime: string) => mime.startsWith('image/')

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/admin/${projectId}`}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to project
        </Link>
        <h1 className="text-2xl font-semibold">Media</h1>
      </div>

      <MediaUploader projectId={projectId as Id<'projects'>} />

      <div className="mt-8">
        {media === undefined ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : media.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No files uploaded yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {media.map((item) => (
              <div
                key={item._id}
                className="group relative overflow-hidden rounded-lg border bg-card"
              >
                {/* Preview */}
                <div className="flex h-36 items-center justify-center bg-muted">
                  {isImage(item.mimeType) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.filename}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="truncate text-xs font-medium">{item.filename}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(item.size)}</p>
                </div>

                {/* Hover actions */}
                <div className={cn(
                  'absolute inset-0 flex items-center justify-center gap-2',
                  'bg-background/80 opacity-0 transition-opacity group-hover:opacity-100'
                )}>
                  <Button size="icon" variant="secondary" onClick={() => copyUrl(item.url)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    disabled={deleting === item._id}
                    onClick={() => void handleDelete(item._id, item.r2Key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
