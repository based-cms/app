'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { use, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, FolderOpen, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

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
      toast.success('New token generated')
    } catch {
      toast.error('Failed to generate token')
    } finally {
      setGenerating(false)
    }
  }

  function copyToken() {
    if (!project?.registrationToken) return
    void navigator.clipboard.writeText(project.registrationToken)
    toast.success('Token copied')
  }

  const maskedToken = project.registrationToken
    ? `${project.registrationToken.slice(0, 8)}${'•'.repeat(24)}`
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

        {/* Registration token */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Registration token</p>
            <div className="flex gap-1">
              {project.registrationToken && (
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={copyToken}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                disabled={generating}
                onClick={handleGenerateToken}
                title={project.registrationToken ? 'Regenerate token' : 'Generate token'}
              >
                <RefreshCw className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {project.registrationToken ? (
            <code className="block w-full overflow-hidden rounded bg-background px-3 py-2 font-mono text-xs">
              {tokenVisible ? project.registrationToken : maskedToken}
            </code>
          ) : (
            <p className="rounded bg-background px-3 py-2 text-xs text-muted-foreground">
              No token yet — click ↻ to generate one
            </p>
          )}
        </div>

        {/* Code snippet */}
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">
            Add to your client project&apos;s <code className="text-xs">lib/cms.ts</code>
          </p>
          <pre className="overflow-x-auto rounded bg-background p-3 text-xs">
            {`import { createCMSClient } from 'cms-client'

export const cms = createCMSClient({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  orgSlug: '${project.slug}',
  registrationToken: process.env.BETTER_CMS_TOKEN,
})`}
          </pre>
        </div>

        <p className="text-xs text-muted-foreground">
          Set <code className="text-xs">BETTER_CMS_TOKEN</code> in your client project&apos;s{' '}
          <code className="text-xs">.env.local</code> — keep it server-side only (no{' '}
          <code className="text-xs">NEXT_PUBLIC_</code> prefix).
        </p>
      </div>
    </div>
  )
}
