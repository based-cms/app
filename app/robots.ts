import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/imprint', '/terms', '/privacy', '/contact', '/faq'],
        disallow: [
          '/admin',
          '/admin/',
          '/superadmin',
          '/superadmin/',
          '/onboarding',
          '/onboarding/',
          '/sign-in',
          '/sign-in/',
          '/sign-out',
          '/sign-out/',
          '/select-org',
          '/select-org/',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}

