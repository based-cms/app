import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'

const publicRoutes = ['/', '/imprint', '/terms', '/privacy', '/contact', '/faq']

export default function sitemap(): MetadataRoute.Sitemap {
  // Use a fixed date for legal/static pages — avoids misleading crawlers
  // into re-crawling unchanged pages on every request.
  const staticDate = new Date('2026-03-04')

  return publicRoutes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: staticDate,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.7,
  }))
}

