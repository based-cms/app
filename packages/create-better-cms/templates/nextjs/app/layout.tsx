import type { Metadata } from 'next'
import { cms } from '@/lib/cms'
import { heroSection, teamSection } from '@/lib/sections'
import { Providers } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: '{{PROJECTNAME}}',
  description: 'Powered by Better CMS',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Register sections on every server boot — idempotent
  await cms.registerSections([heroSection, teamSection])

  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
