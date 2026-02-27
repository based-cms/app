'use client'

import { CMSProvider } from 'cms-client'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CMSProvider token={process.env.NEXT_PUBLIC_BETTER_CMS_TOKEN!}>
      {children}
    </CMSProvider>
  )
}
