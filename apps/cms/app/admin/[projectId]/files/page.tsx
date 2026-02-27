'use client'

import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  FileIcon,
  Folder,
  FolderOpen,
  FolderInput,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(mime: string) {
  return mime.startsWith('image/')
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({
  currentPath,
  onNavigate,
}: {
  currentPath: string
  onNavigate: (path: string) => void
}) {
  const segments = currentPath ? currentPath.split('/') : []

  return (
    <nav className="flex items-center gap-1 text-sm">
      <button
        onClick={() => onNavigate('')}
        className={cn(
          'rounded px-1 py-0.5 transition-colors',
          currentPath === ''
            ? 'font-medium text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Root
      </button>
      {segments.map((seg, i) => {
        const path = segments.slice(0, i + 1).join('/')
        const isLast = i === segments.length - 1
        return (
          <span key={path} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => onNavigate(path)}
              className={cn(
                'rounded px-1 py-0.5 transition-colors',
                isLast
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {seg}
            </button>
          </span>
        )
      })}
    </nav>
  )
}

// ─── Folder Card ──────────────────────────────────────────────────────────────

interface FolderDoc {
  _id: Id<'folders'>
  name: string
  path: string
  parentPath: string
}

function FolderCard({
  folder,
  onEnter,
  onRename,
  onDelete,
}: {
  folder: FolderDoc
  onEnter: () => void
  onRename: (id: Id<'folders'>, currentName: string) => void
  onDelete: (id: Id<'folders'>) => void
}) {
  return (
    <div className="group relative rounded-lg border bg-card transition-colors hover:bg-muted/40">
      <button
        className="flex w-full items-center gap-3 p-3 text-left"
        onClick={onEnter}
      >
        <Folder className="h-8 w-8 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{folder.name}</span>
      </button>

      {/* Hover actions */}
      <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation()
            onRename(folder._id, folder.name)
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(folder._id)
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── File Card ────────────────────────────────────────────────────────────────

interface MediaDoc {
  _id: Id<'media'>
  filename: string
  mimeType: string
  size: number
  url: string
  r2Key: string
  folder?: string
}

function FileCard({
  file,
  allFolders,
  currentPath,
  onRename,
  onDelete,
  onMove,
  onCopy,
}: {
  file: MediaDoc
  allFolders: FolderDoc[]
  currentPath: string
  onRename: (id: Id<'media'>, currentName: string) => void
  onDelete: (id: Id<'media'>, r2Key: string) => void
  onMove: (id: Id<'media'>, folder: string) => void
  onCopy: (url: string) => void
}) {
  const [showMover, setShowMover] = useState(false)

  // Build picker list: Root + all folders except the current one
  const moveTargets = [
    { label: 'Root', path: '' },
    ...allFolders.map((f) => ({
      label: f.path,
      path: f.path,
    })),
  ].filter((t) => t.path !== currentPath)

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card">
      {/* Preview */}
      <div className="flex h-32 items-center justify-center bg-muted">
        {isImage(file.mimeType) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt={file.filename}
            className="h-full w-full object-cover"
          />
        ) : (
          <FileIcon className="h-10 w-10 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="truncate text-xs font-medium">{file.filename}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
      </div>

      {/* Hover overlay */}
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center gap-2',
          'bg-background/85 opacity-0 transition-opacity group-hover:opacity-100'
        )}
      >
        <div className="flex gap-1.5">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            title="Copy URL"
            onClick={() => onCopy(file.url)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            title="Rename"
            onClick={() => onRename(file._id, file.filename)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            title="Move to folder"
            onClick={() => setShowMover((v) => !v)}
          >
            <FolderInput className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8"
            title="Delete"
            onClick={() => onDelete(file._id, file.r2Key)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Folder picker */}
        {showMover && (
          <div className="w-44 overflow-hidden rounded-md border bg-popover shadow-md">
            <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">
              Move to…
            </p>
            <div className="max-h-40 overflow-y-auto">
              {moveTargets.map((t) => (
                <button
                  key={t.path}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-accent"
                  onClick={() => {
                    onMove(file._id, t.path)
                    setShowMover(false)
                  }}
                >
                  <Folder className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{t.label || 'Root'}</span>
                </button>
              ))}
              {moveTargets.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  No other folders
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Inline Rename Input ──────────────────────────────────────────────────────

function RenameInput({
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') onConfirm()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        className="h-7 text-sm"
      />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onConfirm}>
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FilesPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const pid = projectId as Id<'projects'>

  // ── Navigation state
  const [currentPath, setCurrentPath] = useState('')

  // ── Folder rename state
  const [renamingFolderId, setRenamingFolderId] = useState<Id<'folders'> | null>(null)
  const [renameFolderValue, setRenameFolderValue] = useState('')

  // ── File rename state
  const [renamingFileId, setRenamingFileId] = useState<Id<'media'> | null>(null)
  const [renameFileValue, setRenameFileValue] = useState('')

  // ── New folder state
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // ── Upload panel state
  const [uploaderOpen, setUploaderOpen] = useState(false)

  // ── Uploader ref for drag-drop
  const uploaderRef = useRef<HTMLInputElement>(null)

  // ── Convex queries
  const folders = useQuery(api.folders.list, { projectId: pid, parentPath: currentPath })
  const files = useQuery(api.media.list, { projectId: pid, folder: currentPath })
  const allFolders = useQuery(api.folders.listAll, { projectId: pid })

  // ── Convex mutations
  const createFolder = useMutation(api.folders.create)
  const renameFolder = useMutation(api.folders.rename)
  const deleteFolder = useMutation(api.folders.remove)
  const renameFile = useMutation(api.media.rename)
  const moveFile = useMutation(api.media.moveToFolder)
  const removeMedia = useMutation(api.media.remove)
  const deleteFromR2 = useAction(api.media.deleteFromR2)

  // ── Upload handler (inline, passes current folder)
  const generateUploadUrl = useAction(api.media.generateUploadUrl)
  const createMedia = useMutation(api.media.create)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleUploadFile = useCallback(
    async (file: File) => {
      setUploading(true)
      try {
        const { uploadUrl, r2Key, publicUrl } = await generateUploadUrl({
          projectId: pid,
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
          projectId: pid,
          r2Key,
          url: publicUrl,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          folder: currentPath,
        })
        toast.success('File uploaded')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [generateUploadUrl, createMedia, pid, currentPath]
  )

  // ── Folder actions
  async function handleCreateFolder() {
    const trimmed = newFolderName.trim()
    if (!trimmed) return
    try {
      await createFolder({ projectId: pid, parentPath: currentPath, name: trimmed })
      setNewFolderMode(false)
      setNewFolderName('')
      toast.success('Folder created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create folder')
    }
  }

  function startFolderRename(id: Id<'folders'>, name: string) {
    setRenamingFolderId(id)
    setRenameFolderValue(name)
  }

  async function confirmFolderRename() {
    if (!renamingFolderId) return
    try {
      await renameFolder({ folderId: renamingFolderId, name: renameFolderValue.trim() })
      toast.success('Folder renamed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rename failed')
    } finally {
      setRenamingFolderId(null)
      setRenameFolderValue('')
    }
  }

  async function handleDeleteFolder(id: Id<'folders'>) {
    try {
      await deleteFolder({ folderId: id })
      toast.success('Folder deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete folder')
    }
  }

  // ── File actions
  function startFileRename(id: Id<'media'>, name: string) {
    setRenamingFileId(id)
    setRenameFileValue(name)
  }

  async function confirmFileRename() {
    if (!renamingFileId) return
    try {
      await renameFile({ mediaId: renamingFileId, filename: renameFileValue.trim() })
      toast.success('File renamed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rename failed')
    } finally {
      setRenamingFileId(null)
      setRenameFileValue('')
    }
  }

  async function handleDeleteFile(mediaId: Id<'media'>, r2Key: string) {
    try {
      await removeMedia({ mediaId })
      await deleteFromR2({ r2Key })
      toast.success('File deleted')
    } catch {
      toast.error('Failed to delete file')
    }
  }

  async function handleMoveFile(mediaId: Id<'media'>, folder: string) {
    try {
      await moveFile({ mediaId, folder })
      toast.success('File moved')
    } catch {
      toast.error('Failed to move file')
    }
  }

  function copyUrl(url: string) {
    void navigator.clipboard.writeText(url)
    toast.success('URL copied')
  }

  const isLoading = folders === undefined || files === undefined

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/admin/${projectId}`}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to project
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Files</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewFolderMode(true)
                setNewFolderName('')
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New folder
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.svg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleUploadFile(file)
              }}
            />
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="mb-4">
        <Breadcrumb currentPath={currentPath} onNavigate={setCurrentPath} />
      </div>

      {/* Drag-and-drop zone (visible when no content yet) */}
      <div
        className="mb-6 rounded-lg border-2 border-dashed border-muted-foreground/20 p-4 text-center text-sm text-muted-foreground transition-colors hover:border-muted-foreground/40"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) void handleUploadFile(file)
        }}
      >
        Drop files here or use the Upload button above
      </div>

      {/* New folder inline creation */}
      {newFolderMode && (
        <div className="mb-4 flex items-center gap-2">
          <Folder className="h-5 w-5 shrink-0 text-muted-foreground" />
          <RenameInput
            value={newFolderName}
            onChange={setNewFolderName}
            onConfirm={handleCreateFolder}
            onCancel={() => {
              setNewFolderMode(false)
              setNewFolderName('')
            }}
          />
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          This folder is empty.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {/* Folders first */}
          {folders.map((folder) => (
            <div key={folder._id}>
              {renamingFolderId === folder._id ? (
                <div className="rounded-lg border bg-card p-3">
                  <RenameInput
                    value={renameFolderValue}
                    onChange={setRenameFolderValue}
                    onConfirm={confirmFolderRename}
                    onCancel={() => {
                      setRenamingFolderId(null)
                      setRenameFolderValue('')
                    }}
                  />
                </div>
              ) : (
                <FolderCard
                  folder={folder}
                  onEnter={() => setCurrentPath(folder.path)}
                  onRename={startFolderRename}
                  onDelete={handleDeleteFolder}
                />
              )}
            </div>
          ))}

          {/* Files */}
          {files.map((file) => (
            <div key={file._id}>
              {renamingFileId === file._id ? (
                <div className="rounded-lg border bg-card p-2">
                  <div className="mb-2 flex h-20 items-center justify-center bg-muted rounded">
                    {isImage(file.mimeType) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.url}
                        alt={file.filename}
                        className="h-full w-full object-cover rounded"
                      />
                    ) : (
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <RenameInput
                    value={renameFileValue}
                    onChange={setRenameFileValue}
                    onConfirm={confirmFileRename}
                    onCancel={() => {
                      setRenamingFileId(null)
                      setRenameFileValue('')
                    }}
                  />
                </div>
              ) : (
                <FileCard
                  file={file}
                  allFolders={allFolders ?? []}
                  currentPath={currentPath}
                  onRename={startFileRename}
                  onDelete={handleDeleteFile}
                  onMove={handleMoveFile}
                  onCopy={copyUrl}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
