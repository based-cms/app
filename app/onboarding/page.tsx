'use client'

import { useState, useCallback, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Copy, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { resolvePostAuthRoute, waitForActiveOrganization } from '@/lib/org-routing'
type Step = 'org' | 'project' | 'keys' | 'done'

export default function OnboardingPage() {
  const router = useRouter()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const convexActiveOrgId = useQuery(api.auth.getSessionOrganization)

  const [orgCount, setOrgCount] = useState(0)
  useEffect(() => {
    void authClient.organization.list().then(({ data }) => {
      setOrgCount(data?.length ?? 0)
    })
  }, [])

  const hasOrg = !!activeOrg
  // Skip org step if user already has an org
  const [step, setStep] = useState<Step>(hasOrg ? 'project' : 'org')

  // Org creation state
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [orgCreating, setOrgCreating] = useState(false)

  // Project creation state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const createProject = useMutation(api.projects.create)
  const generateToken = useMutation(api.projects.generateRegistrationToken)

  // Keys state
  const [projectId, setProjectId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const isConvexOrgReady = !!activeOrg?.id && convexActiveOrgId === activeOrg.id

  function handleNameChange(value: string) {
    setName(value)
    setSlug(value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    if (!isConvexOrgReady) {
      toast.error('Workspace is still activating. Please try again in a second.')
      return
    }
    setLoading(true)
    try {
      const pid = await createProject({ name: name.trim(), slug: slug.trim() })
      const tok = await generateToken({ projectId: pid })
      setProjectId(pid)
      setToken(tok)
      setStep('keys')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  function handleOrgNameChange(value: string) {
    setOrgName(value)
    setOrgSlug(
      value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    )
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim() || !orgSlug.trim()) return
    setOrgCreating(true)
    try {
      const { data, error } = await authClient.organization.create({
        name: orgName.trim(),
        slug: orgSlug.trim(),
      })
      if (error) {
        toast.error(error.message ?? 'Failed to create workspace')
        return
      }
      if (data) {
        const { error: setActiveError } = await authClient.organization.setActive({
          organizationId: data.id,
        })
        if (setActiveError) {
          toast.error(setActiveError.message ?? 'Failed to activate workspace')
          return
        }

        const synced = await waitForActiveOrganization(data.id)
        if (!synced) {
          const destination = await resolvePostAuthRoute()
          router.push(destination)
          return
        }

        setStep('project')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setOrgCreating(false)
    }
  }

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`${label} copied`)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  // Build the display key from the deployment name + token
  const deploymentName = process.env.NEXT_PUBLIC_CONVEX_URL
    ?.replace('https://', '')
    .replace(/\.[a-z0-9-]+\.convex\.cloud$/, '')
    .replace('.convex.cloud', '') ?? ''
  const fullKey = token
    ? `bcms_live-${btoa(`${deploymentName}.${token}`)}`
    : ''
  const envSnippet = `BASED-CMS-SLUG=${slug}\nBASED-CMS-KEY=${fullKey}`

  return (
    <div className="space-y-8 py-10">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {(['org', 'project', 'keys'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                step === s
                  ? 'bg-foreground text-background'
                  : step === 'done' || (['project', 'keys', 'done'].indexOf(step) > i)
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {(['project', 'keys', 'done'].indexOf(step) > i) || step === 'done' ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && (
              <div className="h-px w-8 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Organization */}
      {step === 'org' && (
        <div className="space-y-6 text-center">
          <div>
            <h1 className="text-xl font-semibold">Create your workspace</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Each workspace isolates your projects and team members.
            </p>
          </div>
          {orgCount >= 1 && activeOrg ? (
            <div className="space-y-4">
              <p className="text-sm">
                You already have a workspace: <strong>{activeOrg.name}</strong>
              </p>
              <Button onClick={() => setStep('project')}>
                Continue
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCreateOrg} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <Label htmlFor="orgName">Workspace name</Label>
                <Input
                  id="orgName"
                  placeholder="My Company"
                  value={orgName}
                  onChange={(e) => handleOrgNameChange(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orgSlug">Slug</Label>
                <Input
                  id="orgSlug"
                  placeholder="my-company"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <Button type="submit" disabled={orgCreating || !orgName || !orgSlug} className="w-full">
                {orgCreating ? 'Creating...' : 'Create workspace'}
              </Button>
            </form>
          )}
        </div>
      )}

      {/* Step 2: Project */}
      {step === 'project' && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold">Create your first project</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Each project maps to a client website.
            </p>
          </div>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Project name</Label>
              <Input
                id="name"
                placeholder="My Website"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="my-website"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Public identifier — used as <code>BASED-CMS-SLUG</code> in your client app.
              </p>
            </div>
            <Button
              type="submit"
              disabled={loading || !name || !slug || !isConvexOrgReady}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create project'}
            </Button>
            {!isConvexOrgReady && (
              <p className="text-xs text-muted-foreground">
                Finalizing workspace activation...
              </p>
            )}
          </form>
        </div>
      )}

      {/* Step 3: Keys */}
      {step === 'keys' && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold">Your API keys</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Add these to your client project&apos;s <code className="rounded bg-muted px-1 text-[11px]">.env.local</code>
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label>BASED-CMS-SLUG</Label>
                <Badge variant="secondary" className="text-[10px]">public</Badge>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg border bg-muted/50 px-3 py-2 font-mono text-sm">
                  {slug}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => copyToClipboard(slug, 'Slug')}
                >
                  {copied === 'Slug' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label>BASED-CMS-KEY</Label>
                <Badge variant="secondary" className="text-[10px]">server-only</Badge>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg border bg-muted/50 px-3 py-2 font-mono text-xs">
                  {fullKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => copyToClipboard(fullKey, 'Key')}
                >
                  {copied === 'Key' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep this secret. Do not prefix with <code>NEXT_PUBLIC_</code>.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label>.env.local snippet</Label>
                <Badge variant="secondary" className="text-[10px]">one-click</Badge>
              </div>
              <div className="flex items-start gap-2">
                <code className="flex-1 whitespace-pre rounded-lg border bg-muted/50 px-3 py-2 font-mono text-xs">
                  {envSnippet}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => copyToClipboard(envSnippet, '.env snippet')}
                >
                  {copied === '.env snippet' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-[12px] text-amber-700 dark:text-amber-400">
              Save these now — the key won&apos;t be shown again after you leave this page.
              You can regenerate it from project settings.
            </p>
          </div>

          <Button
            className="w-full"
            onClick={() => {
              if (projectId) router.push(`/admin/${projectId}`)
            }}
          >
            Go to project
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
