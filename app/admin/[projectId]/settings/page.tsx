'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Copy,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? ''

function getDeploymentName(url: string): string {
  try {
    return new URL(url).hostname.split('.')[0] ?? '<deployment-name>'
  } catch {
    return '<deployment-name>'
  }
}

function buildKey(deploymentName: string, secret: string): string {
  return `bcms_live-${btoa(`${deploymentName}.${secret}`)}`
}

function copyToClipboard(text: string, label: string) {
  void navigator.clipboard.writeText(text)
  toast.success(`${label} copied`)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const pid = projectId as Id<'projects'>
  const project = useQuery(api.projects.get, { projectId: pid })
  const router = useRouter()

  // ─── General ───────────────────────────────────────────────────────────────
  const updateProject = useMutation(api.projects.update)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (project) {
      setName(project.name)
      setSlug(project.slug)
    }
  }, [project])

  async function handleSaveGeneral() {
    if (!project) return
    setSaving(true)
    try {
      await updateProject({
        projectId: pid,
        ...(name !== project.name ? { name } : {}),
        ...(slug !== project.slug ? { slug } : {}),
      })
      toast.success('Project updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const hasGeneralChanges =
    project && (name !== project.name || slug !== project.slug)

  // ─── API Keys ──────────────────────────────────────────────────────────────
  const generateToken = useMutation(api.projects.generateRegistrationToken)
  const [justGenerated, setJustGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [confirmRegenOpen, setConfirmRegenOpen] = useState(false)

  const deploymentName = useMemo(() => getDeploymentName(CONVEX_URL), [])

  const registrationToken = useQuery(api.projects.getRegistrationToken, { projectId: pid })

  const apiKey = useMemo(() => {
    if (!registrationToken) return null
    return buildKey(deploymentName, registrationToken)
  }, [deploymentName, registrationToken])

  async function handleGenerateToken() {
    setGenerating(true)
    try {
      await generateToken({ projectId: pid })
      setJustGenerated(true)
      toast.success('New key generated')
    } catch {
      toast.error('Failed to generate key')
    } finally {
      setGenerating(false)
    }
  }

  function handleGenerateClick() {
    if (apiKey) {
      setConfirmRegenOpen(true)
    } else {
      void handleGenerateToken()
    }
  }

  const showKey = justGenerated && apiKey

  // ─── Delete ────────────────────────────────────────────────────────────────
  const removeProject = useMutation(api.projects.remove)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!project) return
    setDeleting(true)
    try {
      await removeProject({ projectId: pid })
      toast.success('Project deleted')
      router.push('/admin')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (project === undefined) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 sm:px-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    )
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Manage project configuration
      </p>

      {/* ── General ──────────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold">General</h2>
        <div className="mt-4 space-y-4 rounded-lg border p-5">
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-[13px]">
              Project name
            </Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-slug" className="text-[13px]">
              Slug
            </Label>
            <Input
              id="project-slug"
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '-')
                    .replace(/-+/g, '-')
                )
              }
              className="h-9 font-mono text-[13px]"
            />
            <p className="text-[11px] text-muted-foreground">
              Used as the public identifier in client projects
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={saving || !hasGeneralChanges}
              onClick={() => void handleSaveGeneral()}
            >
              {saving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              Save changes
            </Button>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      {/* ── API Keys ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">API Key</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={generating}
            onClick={handleGenerateClick}
          >
            <RefreshCw
              className={`mr-1.5 h-3 w-3 ${generating ? 'animate-spin' : ''}`}
            />
            {apiKey ? 'Regenerate' : 'Generate'}
          </Button>
        </div>

        <div className="mt-4 space-y-3 rounded-lg border p-5">
          {showKey && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Copy your key now. It won&apos;t be shown again after you
                leave this page.
              </p>
            </div>
          )}

          {apiKey ? (
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {deploymentName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-hidden rounded bg-muted px-2.5 py-1.5 font-mono text-[11px]">
                  {showKey ? apiKey : `bcms_live-${'•'.repeat(20)}`}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => copyToClipboard(apiKey, 'API key')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No key yet — click Generate to create one.
            </p>
          )}
        </div>
      </section>

      <Separator className="my-8" />

      {/* ── Danger Zone ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-destructive">Danger Zone</h2>
        <div className="mt-4 rounded-lg border border-destructive/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium">Delete this project</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Permanently remove this project and all its content, sections,
                and files.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="mr-1.5 h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      </section>

      {/* ── Dialogs ──────────────────────────────────────────────────── */}

      {/* Regenerate confirmation */}
      <AlertDialog open={confirmRegenOpen} onOpenChange={setConfirmRegenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate your current key. Any client projects using
              the old key will stop working until you update their environment
              variables.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleGenerateToken()}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{project.name}</strong> and
              all its content, sections, media, and folders. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <Label
              htmlFor="delete-confirm"
              className="text-[13px] text-muted-foreground"
            >
              Type <strong>{project.name}</strong> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={project.name}
              className="mt-2 h-9"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              onClick={() => setDeleteInput('')}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting || deleteInput !== project.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              {deleting && (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              )}
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
