import { OrganizationList } from '@clerk/nextjs'

export default function SelectOrgPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40">
      <OrganizationList
        hidePersonal
        afterSelectOrganizationUrl="/admin"
        afterCreateOrganizationUrl="/admin"
      />
    </main>
  )
}
