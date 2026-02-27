'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { FileText, FolderOpen, Copy, RefreshCw, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

function getDeploymentName(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return '<deployment-name>'
  try {
    const hostname = new URL(url).hostname
    return hostname.split('.')[0] ?? '<deployment-name>'
  } catch {
    return '<deployment-name>'
  }
}

function buildKey(env: 'test' | 'live', deploymentName: string, secret: string): string {
  return `bcms_${env}-${btoa(`${deploymentName}.${secret}`)}`
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const project = useQuery(api.projects.get, {
    projectId: projectId as Id<'projects'>,
  })
  const sections = useQuery(api.sectionRegistry.list, {
    projectId: projectId as Id<'projects'>,
  })
  const generateToken = useMutation(api.projects.generateRegistrationToken)
  const [justGenerated, setJustGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const deploymentName = useMemo(() => getDeploymentName(), [])

  const testKey = useMemo(() => {
    if (!project?.registrationToken) return null
    return buildKey('test', deploymentName, project.registrationToken)
  }, [deploymentName, project?.registrationToken])

  const liveKey = useMemo(() => {
    if (!project?.registrationToken) return null
    return buildKey('live', deploymentName, project.registrationToken)
  }, [deploymentName, project?.registrationToken])

  if (project === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-muted-foreground">Project not found.</p>
      </div>
    )
  }

  async function handleGenerateToken() {
    setGenerating(true)
    try {
      await generateToken({ projectId: projectId as Id<'projects'> })
      setJustGenerated(true)
      toast.success('New key generated')
    } catch {
      toast.error('Failed to generate key')
    } finally {
      setGenerating(false)
    }
  }

  function handleGenerateClick() {
    if (testKey) {
      setConfirmOpen(true)
    } else {
      void handleGenerateToken()
    }
  }

  function copyToClipboard(text: string, label: string) {
    void navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  const showKeys = justGenerated && testKey && liveKey

  return (
    <div className="mx-auto max-w-3xl">
      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={`/admin/${projectId}/content`}>
          <Card className="h-full transition-all hover:border-foreground/20 hover:shadow-sm">
            <CardHeader className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-sm">Content</CardTitle>
                  <CardDescription className="text-xs">
                    {sections === undefined
                      ? '\u2026'
                      : sections.length === 0
                        ? 'No sections registered'
                        : `${sections.length} section${sections.length !== 1 ? 's' : ''}`}
                  </CardDescription>
                </div>
              </div>
              {sections && sections.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {sections.map((s) => (
                    <Badge key={s._id} variant="secondary" className="text-[10px]">
                      {s.label}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
          </Card>
        </Link>

        <Link href={`/admin/${projectId}/files`}>
          <Card className="h-full transition-all hover:border-foreground/20 hover:shadow-sm">
            <CardHeader className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/10">
                  <FolderOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-sm">Files</CardTitle>
                  <CardDescription className="text-xs">
                    Upload and manage media
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Connect your project */}
      <div className="mt-6 rounded-lg border p-5">
        <p className="text-sm font-semibold">Connect your client project</p>

        <div className="mt-5 space-y-5">
          {/* Step 1 */}
          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
              1
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-medium">Generate an API key</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {testKey
                  ? 'Key generated. Copy it below or regenerate.'
                  : 'Click the button to create your API key.'}
              </p>
              <div className="mt-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-mono text-[11px] text-muted-foreground">BASED-CMS-KEY</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={generating}
                    onClick={handleGenerateClick}
                    title={testKey ? 'Regenerate key' : 'Generate key'}
                  >
                    <RefreshCw className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {showKeys && (
                  <div className="mb-2 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Copy your keys now. They won&apos;t be shown again after you leave this page.
                    </p>
                  </div>
                )}

                {testKey && liveKey ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        test
                      </Badge>
                      <code className="flex-1 overflow-hidden rounded bg-muted px-2.5 py-1.5 font-mono text-[11px]">
                        {showKeys ? testKey : `bcms_test-${'•'.repeat(20)}`}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => copyToClipboard(testKey, 'Test key')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        live
                      </Badge>
                      <code className="flex-1 overflow-hidden rounded bg-muted px-2.5 py-1.5 font-mono text-[11px]">
                        {showKeys ? liveKey : `bcms_live-${'•'.repeat(20)}`}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => copyToClipboard(liveKey, 'Live key')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="rounded bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                    No key yet — click <RefreshCw className="inline h-3 w-3" /> to generate one
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
              2
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-medium">
                Add to <code className="text-[11px]">.env.local</code>
              </p>
              <div className="mt-2">
                <div className="mb-1 flex justify-end">
                  {testKey && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      title="Copy .env.local snippet"
                      onClick={() =>
                        copyToClipboard(
                          `BASED-CMS-SLUG=${project.slug}\nBASED-CMS-KEY=${testKey}`,
                          '.env.local snippet'
                        )
                      }
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <pre className="overflow-x-auto rounded-md bg-zinc-950 px-3.5 py-3 text-[11px] leading-relaxed text-zinc-100 dark:bg-zinc-900">
                  <span className="text-zinc-500"># Based CMS</span>
                  {'\n'}
                  <span className="text-emerald-400">BASED-CMS-SLUG</span>
                  <span className="text-zinc-400">=</span>
                  {project.slug}
                  {'\n'}
                  <span className="text-emerald-400">BASED-CMS-KEY</span>
                  <span className="text-zinc-400">=</span>
                  {showKeys
                    ? testKey
                    : testKey
                      ? `bcms_test-${'•'.repeat(20)}`
                      : '<generate a key above>'}
                </pre>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
              3
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-medium">Or scaffold a new project</p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-950 px-3.5 py-2.5 text-[11px] text-zinc-100 dark:bg-zinc-900">
                npx create-based-cms
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Regenerate confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate API key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate your current key. Any client projects using the old key will stop
              working until you update their environment variables.
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
    </div>
  )
}
