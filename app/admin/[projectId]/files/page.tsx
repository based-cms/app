'use client'

import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import Image from 'next/image'
import { use, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ChevronRight,
  Copy,
  FileIcon,
  Folder,
  FolderInput,
  Info,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Check,
  X,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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

function FileBreadcrumb({
  currentPath,
  onNavigate,
}: {
  currentPath: string
  onNavigate: (path: string) => void
}) {
  const segments = currentPath ? currentPath.split('/') : []

  return (
    <nav className="flex items-center gap-1 text-[13px]">
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
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
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
    <div className="group relative rounded-lg border bg-card transition-colors hover:border-foreground/20">
      <button
        className="flex w-full items-center gap-2.5 p-3 text-left"
        onClick={onEnter}
      >
        <Folder className="h-7 w-7 shrink-0 text-muted-foreground" />
        <span className="truncate text-[13px] font-medium">{folder.name}</span>
      </button>

      <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            onRename(folder._id, folder.name)
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(folder._id)
          }}
        >
          <Trash2 className="h-3 w-3" />
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

  const moveTargets = [
    { label: 'Root', path: '' },
    ...allFolders.map((f) => ({
      label: f.path,
      path: f.path,
    })),
  ].filter((t) => t.path !== currentPath)

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card">
      <div className="flex h-32 items-center justify-center bg-muted">
        {isImage(file.mimeType) ? (
          <Image
            src={file.url}
            alt={`Preview of ${file.filename}`}
            width={48}
            height={48}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <FileIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      <div className="p-2">
        <p className="truncate text-[11px] font-medium">{file.filename}</p>
        <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>
      </div>

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
            className="h-7 w-7"
            title="Copy URL"
            onClick={() => onCopy(file.url)}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={() => onRename(file._id, file.filename)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Rename display name only — URL stays the same</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7"
            title="Move to folder"
            onClick={() => setShowMover((v) => !v)}
          >
            <FolderInput className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-7 w-7"
            title="Delete"
            onClick={() => onDelete(file._id, file.r2Key)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {showMover && (
          <div className="w-40 overflow-hidden rounded-md border bg-popover shadow-md">
            <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">
              Move to\u2026
            </p>
            <div className="max-h-36 overflow-y-auto">
              {moveTargets.map((t) => (
                <button
                  key={t.path}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-[11px] hover:bg-accent"
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
                <p className="px-2 py-1.5 text-[11px] text-muted-foreground">No other folders</p>
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
        className="h-7 text-[13px]"
      />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onConfirm}>
        <Check className="h-3 w-3" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onCancel}>
        <X className="h-3 w-3" />
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

  const [currentPath, setCurrentPath] = useState('')
  const [renamingFolderId, setRenamingFolderId] = useState<Id<'folders'> | null>(null)
  const [renameFolderValue, setRenameFolderValue] = useState('')
  const [renamingFileId, setRenamingFileId] = useState<Id<'media'> | null>(null)
  const [renameFileValue, setRenameFileValue] = useState('')
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const folders = useQuery(api.folders.list, { projectId: pid, parentPath: currentPath })
  const files = useQuery(api.media.list, { projectId: pid, folder: currentPath })
  const allFolders = useQuery(api.folders.listAll, { projectId: pid })

  const createFolder = useMutation(api.folders.create)
  const renameFolder = useMutation(api.folders.rename)
  const deleteFolder = useMutation(api.folders.remove)
  const renameFile = useMutation(api.media.rename)
  const moveFile = useMutation(api.media.moveToFolder)
  const removeMedia = useMutation(api.media.remove)
  const deleteFromR2 = useAction(api.media.deleteFromR2)

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
      await deleteFromR2({ projectId: pid, r2Key })
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
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Files</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[13px]"
            onClick={() => {
              setNewFolderMode(true)
              setNewFolderName('')
            }}
          >
            <Plus className="mr-1.5 h-3 w-3" />
            New folder
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[13px]"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Uploading\u2026
              </>
            ) : (
              <>
                <Upload className="mr-1.5 h-3 w-3" />
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

      {/* Breadcrumb */}
      <div className="mb-3">
        <FileBreadcrumb currentPath={currentPath} onNavigate={setCurrentPath} />
      </div>

      {/* Info note */}
      <div className="mb-4 flex items-center gap-2 rounded-md border border-border/50 bg-muted/40 px-3 py-1.5">
        <Info className="h-3 w-3 shrink-0 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          Renames change the display name only. URLs stay permanent.
        </p>
      </div>

      {/* Drag-and-drop zone */}
      <div
        className={cn(
          'mb-5 rounded-lg border-2 border-dashed border-muted-foreground/20 text-center text-muted-foreground transition-colors hover:border-muted-foreground/40',
          !isLoading && (folders?.length || files?.length)
            ? 'px-4 py-1.5 text-[11px]'
            : 'py-6 text-[13px]'
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) void handleUploadFile(file)
        }}
      >
        Drop files here or use the Upload button above
      </div>

      {/* New folder inline */}
      {newFolderMode && (
        <div className="mb-4 flex items-center gap-2">
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
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
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <p className="text-center text-[13px] text-muted-foreground">This folder is empty.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
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

          {files.map((file) => (
            <div key={file._id}>
              {renamingFileId === file._id ? (
                <div className="rounded-lg border bg-card p-2">
                  <div className="mb-2 flex h-16 items-center justify-center rounded bg-muted">
                    {isImage(file.mimeType) ? (
                      <Image
                        src={file.url}
                        alt={`Thumbnail of ${file.filename}`}
                        width={48}
                        height={48}
                        className="h-full w-full rounded object-cover"
                        unoptimized
                      />
                    ) : (
                      <FileIcon className="h-6 w-6 text-muted-foreground" />
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
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Info className="h-2.5 w-2.5 shrink-0" />
                    Renaming only changes the display name.
                  </p>
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
