'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient, useListOrganizations, useActiveOrganization } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Plus } from 'lucide-react'

export default function SelectOrgPage() {
  const router = useRouter()
  const { data: orgs, isPending } = useListOrganizations()
  const { data: activeOrg } = useActiveOrganization()
  const [showCreate, setShowCreate] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSelectOrg(orgId: string) {
    await authClient.organization.setActive({ organizationId: orgId })
    router.push('/admin')
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!newOrgName.trim()) return
    setError('')
    setLoading(true)

    try {
      const { data, error: createError } = await authClient.organization.create({
        name: newOrgName.trim(),
        slug: newOrgName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      })
      if (createError) {
        setError(createError.message ?? 'Failed to create organization')
        return
      }
      if (data) {
        await authClient.organization.setActive({ organizationId: data.id })
        router.push('/admin')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-background p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Select workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose an organization to continue
          </p>
        </div>

        {isPending ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {(orgs ?? []).length > 0 && (
              <div className="divide-y rounded-lg border">
                {(orgs ?? []).map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrg(org.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-bold">
                      {org.name?.[0]?.toUpperCase() ?? '?'}
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">
                      {org.name}
                    </span>
                    {activeOrg?.id === org.id && (
                      <Check className="h-4 w-4 text-foreground" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {showCreate ? (
              <form onSubmit={handleCreateOrg} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input
                    id="orgName"
                    placeholder="My Organization"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setShowCreate(false); setError('') }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !newOrgName.trim()}
                    className="flex-1"
                  >
                    {loading ? 'Creating…' : 'Create'}
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create organization
              </Button>
            )}
          </>
        )}
      </div>
    </main>
  )
}
