'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, FolderOpen, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Extract the deployment name from NEXT_PUBLIC_CONVEX_URL.
 * e.g. `https://elated-tapir-331.eu-central-1.convex.cloud` → `elated-tapir-331`
 */
function getDeploymentName(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return '<deployment-name>'
  try {
    const hostname = new URL(url).hostname
    // hostname: elated-tapir-331.eu-central-1.convex.cloud
    // deployment name is the first segment
    return hostname.split('.')[0] ?? '<deployment-name>'
  } catch {
    return '<deployment-name>'
  }
}

/**
 * Build a bcms_ key.
 * Format: bcms_<test|live>-<base64(deployment-name.SECRET24)>
 */
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
  const [tokenVisible, setTokenVisible] = useState(false)
  const [generating, setGenerating] = useState(false)

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
    return <div className="h-8 w-48 animate-pulse rounded bg-muted" />
  }

  if (!project) {
    return <p className="text-sm text-muted-foreground">Project not found.</p>
  }

  async function handleGenerateToken() {
    setGenerating(true)
    try {
      await generateToken({ projectId: projectId as Id<'projects'> })
      setTokenVisible(true)
      toast.success('New key generated')
    } catch {
      toast.error('Failed to generate key')
    } finally {
      setGenerating(false)
    }
  }

  function copyToClipboard(text: string, label: string) {
    void navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  const maskedKey = testKey
    ? `bcms_test-${'•'.repeat(20)}`
    : null

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All projects
        </Link>
        <div className="flex items-center gap-3">
          {project.faviconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.faviconUrl} alt="" className="h-8 w-8 rounded" />
          )}
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="font-mono text-xs text-muted-foreground">{project.slug}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Content card */}
        <Link href={`/admin/${projectId}/content`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Content</CardTitle>
              </div>
              <CardDescription>
                {sections === undefined ? (
                  '…'
                ) : sections.length === 0 ? (
                  'No sections registered yet'
                ) : (
                  <>
                    {sections.length} section{sections.length !== 1 ? 's' : ''} registered
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sections.map((s) => (
                        <Badge key={s._id} variant="secondary" className="text-xs">
                          {s.label}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {/* Files card */}
        <Link href={`/admin/${projectId}/files`}>
          <Card className="h-full transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Files</CardTitle>
              </div>
              <CardDescription>Upload and manage files in nested folders</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Package setup */}
      <div className="mt-6 space-y-4 rounded-lg border bg-muted/30 p-4">
        <p className="text-xs font-medium text-muted-foreground">Package setup</p>

        {/* Slug */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">BETTER-CMS-SLUG</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => copyToClipboard(project.slug, 'Slug')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <code className="block w-full overflow-hidden rounded bg-background px-3 py-2 font-mono text-xs">
            {project.slug}
          </code>
        </div>

        {/* Key */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">BETTER-CMS-KEY</p>
            <div className="flex gap-1">
              {testKey && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setTokenVisible((v) => !v)}
                  >
                    {tokenVisible ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={generating}
                onClick={handleGenerateToken}
                title={testKey ? 'Regenerate key' : 'Generate key'}
              >
                <RefreshCw className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {testKey && liveKey ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] shrink-0">test</Badge>
                <code className="flex-1 overflow-hidden rounded bg-background px-3 py-2 font-mono text-xs">
                  {tokenVisible ? testKey : maskedKey}
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
                <Badge variant="outline" className="text-[10px] shrink-0">live</Badge>
                <code className="flex-1 overflow-hidden rounded bg-background px-3 py-2 font-mono text-xs">
                  {tokenVisible ? liveKey : `bcms_live-${'•'.repeat(20)}`}
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
            <p className="rounded bg-background px-3 py-2 text-xs text-muted-foreground">
              No key yet — click ↻ to generate one
            </p>
          )}
        </div>

        {/* Code snippet */}
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">
            Add to your client project&apos;s <code className="text-xs">.env.local</code>
          </p>
          <pre className="overflow-x-auto rounded bg-background p-3 text-xs">
            {`BETTER-CMS-SLUG=${project.slug}
BETTER-CMS-KEY=${testKey ?? '<generate a key above>'}`}
          </pre>
        </div>

        <p className="text-xs text-muted-foreground">
          Or scaffold a new project instantly:{' '}
          <code className="text-xs">npx create-better-cms</code>
        </p>
      </div>
    </div>
  )
}
