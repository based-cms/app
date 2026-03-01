import { redirect } from 'next/navigation'

// Redirect old /media route to the new /files route
export default async function MediaRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  redirect(`/admin/${projectId}/files`)
}
