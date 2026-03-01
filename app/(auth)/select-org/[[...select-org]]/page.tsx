'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Check } from 'lucide-react'

interface Org {
  id: string
  name: string
  slug: string
  logo?: string | null
}

export default function SelectOrgPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    void authClient.organization.list().then(({ data }) => {
      setOrgs(data ?? [])
      setLoading(false)
    })
  }, [])

  async function selectOrg(orgId: string) {
    const { error } = await authClient.organization.setActive({
      organizationId: orgId,
    })
    if (error) {
      toast.error('Failed to select organization')
      return
    }
    router.push('/admin')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newSlug.trim()) return
    setCreating(true)
    try {
      const { data, error } = await authClient.organization.create({
        name: newName.trim(),
        slug: newSlug.trim(),
      })
      if (error) {
        toast.error(error.message ?? 'Failed to create organization')
        return
      }
      if (data) {
        await authClient.organization.setActive({
          organizationId: data.id,
        })
        router.push('/admin')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  function handleNameChange(value: string) {
    setNewName(value)
    setNewSlug(
      value
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Select a workspace</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Choose a workspace to continue, or create a new one.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : showCreate ? (
          <form onSubmit={handleCreate} className="space-y-4 rounded-lg border bg-background p-6">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Workspace name</Label>
              <Input
                id="orgName"
                placeholder="My Company"
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orgSlug">Slug</Label>
              <Input
                id="orgSlug"
                placeholder="my-company"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !newName || !newSlug}
                className="flex-1"
              >
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2 rounded-lg border bg-background p-2">
              {orgs.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No workspaces yet. Create one to get started.
                </p>
              ) : (
                orgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => selectOrg(org.id)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    {org.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={org.logo}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded"
                      />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-xs font-bold">
                        {org.name?.[0] ?? '?'}
                      </span>
                    )}
                    <span className="flex-1 truncate text-sm font-medium">
                      {org.name}
                    </span>
                    <Check className="h-4 w-4 text-muted-foreground opacity-0" />
                  </button>
                ))
              )}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowCreate(true)}
            >
              Create a new workspace
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
