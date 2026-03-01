'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useDeployment } from '@/components/providers/DeploymentProvider'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { makeFunctionReference } from 'convex/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  ArrowRightLeft,
  Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDeploymentName(url: string | undefined | null): string {
  if (!url) return '<not-configured>'
  try {
    return new URL(url).hostname.split('.')[0] ?? '<deployment-name>'
  } catch {
    return '<deployment-name>'
  }
}

function buildKey(
  env: 'test' | 'live',
  deploymentName: string,
  secret: string
): string {
  return `bcms_${env}-${btoa(`${deploymentName}.${secret}`)}`
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
  const {
    env: deploymentEnv,
    liveUrl,
    testUrl,
    testAvailable,
    canSwitchEnv,
    getAuthTestClient,
    getAuthBothClients,
  } = useDeployment()

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

  const liveDeploymentName = useMemo(() => getDeploymentName(liveUrl), [liveUrl])
  const testDeploymentName = useMemo(
    () => getDeploymentName(testUrl),
    [testUrl]
  )

  const liveKey = useMemo(() => {
    if (!project?.registrationToken) return null
    return buildKey('live', liveDeploymentName, project.registrationToken)
  }, [liveDeploymentName, project?.registrationToken])

  const testKey = useMemo(() => {
    if (!project?.registrationToken || !testAvailable) return null
    return buildKey('test', testDeploymentName, project.registrationToken)
  }, [testDeploymentName, project?.registrationToken, testAvailable])

  async function handleGenerateToken() {
    setGenerating(true)
    try {
      const token = await generateToken({ projectId: pid })
      setJustGenerated(true)

      // Sync token to test deployment (so client packages using test keys work)
      if (testAvailable && project?.slug) {
        const testClient = await getAuthTestClient()
        if (testClient) {
          try {
            // Ensure shadow project exists on test deployment first
            const ensureRef = makeFunctionReference<'mutation'>(
              'projects:ensureExists' as never
            )
            await testClient.mutation(ensureRef, {
              slug: project.slug,
              name: project.name,
            })
            // Then sync the token
            const syncRef = makeFunctionReference<'mutation'>(
              'projects:syncRegistrationToken' as never
            )
            await testClient.mutation(syncRef, {
              slug: project.slug,
              registrationToken: token,
            })
          } catch {
            toast.warning('Token synced locally but failed on test deployment')
          }
        }
      }

      toast.success('New key generated')
    } catch {
      toast.error('Failed to generate key')
    } finally {
      setGenerating(false)
    }
  }

  function handleGenerateClick() {
    if (liveKey) {
      setConfirmRegenOpen(true)
    } else {
      void handleGenerateToken()
    }
  }

  const showKeys = justGenerated && liveKey

  // ─── Data Migration ────────────────────────────────────────────────────────
  const [migrating, setMigrating] = useState(false)
  const [migrateDirection, setMigrateDirection] = useState<
    'live-to-test' | 'test-to-live' | null
  >(null)

  async function handleMigrate() {
    if (!migrateDirection || !project) return
    setMigrating(true)
    try {
      const { live: liveClient, test: testClient } = await getAuthBothClients()
      if (!testClient) throw new Error('Test deployment not configured')

      const getAllRef = makeFunctionReference<'query'>(
        'sectionContent:getAllBySlug' as never
      )
      const setItemsRef = makeFunctionReference<'mutation'>(
        'sectionContent:setItemsBySlug' as never
      )

      if (migrateDirection === 'live-to-test') {
        // Read from live, write to test
        const content = await liveClient.query(getAllRef, {
          slug: project.slug,
        })
        for (const doc of content as Array<{
          sectionType: string
          env: string
          items: unknown[]
        }>) {
          await testClient.mutation(setItemsRef, {
            slug: project.slug,
            sectionType: doc.sectionType,
            env: 'preview' as const,
            items: doc.items,
          })
        }
        toast.success('Content pushed to Test deployment')
      } else {
        // Read from test, write to live
        const content = await testClient.query(getAllRef, {
          slug: project.slug,
        })
        for (const doc of content as Array<{
          sectionType: string
          env: string
          items: unknown[]
        }>) {
          await liveClient.mutation(setItemsRef, {
            slug: project.slug,
            sectionType: doc.sectionType,
            env: 'production' as const,
            items: doc.items,
          })
        }
        toast.success('Content pulled from Test deployment')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Migration failed')
    } finally {
      setMigrating(false)
      setMigrateDirection(null)
    }
  }

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

      // Best-effort cleanup on test deployment
      if (testAvailable) {
        const testClient = await getAuthTestClient()
        if (testClient) {
          try {
            const removeRef = makeFunctionReference<'mutation'>(
              'projects:removeBySlug' as never
            )
            await testClient.mutation(removeRef, { slug: project.slug })
          } catch {
            // Silent — test deployment cleanup is best-effort
          }
        }
      }

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
          <h2 className="text-sm font-semibold">API Keys</h2>
          <Button
            variant="outline"
            size="sm"
            disabled={generating}
            onClick={handleGenerateClick}
          >
            <RefreshCw
              className={`mr-1.5 h-3 w-3 ${generating ? 'animate-spin' : ''}`}
            />
            {liveKey ? 'Regenerate' : 'Generate'}
          </Button>
        </div>

        <div className="mt-4 space-y-3 rounded-lg border p-5">
          {showKeys && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Copy your keys now. They won&apos;t be shown again after you
                leave this page.
              </p>
            </div>
          )}

          {liveKey ? (
            <div className="space-y-2">
              {/* Live key */}
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                  >
                    live
                  </Badge>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {liveDeploymentName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-hidden rounded bg-muted px-2.5 py-1.5 font-mono text-[11px]">
                    {showKeys ? liveKey : `bcms_live-${'•'.repeat(20)}`}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyToClipboard(liveKey, 'Live key')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Test key — only visible with env switch permission */}
              {canSwitchEnv && testKey && (
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400"
                    >
                      test
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {testDeploymentName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-hidden rounded bg-muted px-2.5 py-1.5 font-mono text-[11px]">
                      {showKeys ? testKey : `bcms_test-${'•'.repeat(20)}`}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => copyToClipboard(testKey, 'Test key')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {canSwitchEnv && !testAvailable && (
                <p className="text-[11px] text-muted-foreground">
                  Test key unavailable — set{' '}
                  <code className="text-[10px]">NEXT_PUBLIC_CONVEX_TEST_URL</code>{' '}
                  to enable.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No key yet — click Regenerate to generate one.
            </p>
          )}
        </div>
      </section>

      {/* ── Data Migration (only with env switch permission) ────────── */}
      {canSwitchEnv && (
        <>
          <Separator className="my-8" />

          <section>
            <h2 className="text-sm font-semibold">Data Migration</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Sync section content between Live and Test deployments.
            </p>

            <div className="mt-4 rounded-lg border p-5">
              {testAvailable ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={migrating}
                    onClick={() => setMigrateDirection('live-to-test')}
                  >
                    <ArrowRightLeft className="mr-1.5 h-3 w-3" />
                    Push Live → Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={migrating}
                    onClick={() => setMigrateDirection('test-to-live')}
                  >
                    <ArrowRightLeft className="mr-1.5 h-3 w-3" />
                    Pull Test → Live
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Migration unavailable — set{' '}
                  <code className="text-[10px]">NEXT_PUBLIC_CONVEX_TEST_URL</code>{' '}
                  to enable dual deployments.
                </p>
              )}
            </div>
          </section>
        </>
      )}

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

      {/* Migration confirmation */}
      <AlertDialog
        open={migrateDirection !== null}
        onOpenChange={(open) => !open && setMigrateDirection(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {migrateDirection === 'live-to-test'
                ? 'Push Live → Test?'
                : 'Pull Test → Live?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {migrateDirection === 'live-to-test'
                ? 'This will overwrite all section content in the Test deployment with content from Live.'
                : 'This will overwrite all section content in the Live deployment with content from Test.'}
              {' '}This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={migrating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={migrating}
              onClick={() => void handleMigrate()}
            >
              {migrating && (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              )}
              {migrateDirection === 'live-to-test'
                ? 'Push to Test'
                : 'Pull to Live'}
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
