import { createCMSClient } from 'cms-client'

export const cms = createCMSClient({
  key: process.env['BETTER-CMS-KEY']!,
})
