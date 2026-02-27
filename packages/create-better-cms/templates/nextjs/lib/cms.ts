import { createCMSClient } from 'cms-client'

export const cms = createCMSClient({
  token: process.env.NEXT_PUBLIC_BETTER_CMS_TOKEN!,
})
