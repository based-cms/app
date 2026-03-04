import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'

const publicRoutes = ['/', '/imprint', '/terms', '/privacy', '/contact', '/faq']

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return publicRoutes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : 0.7,
  }))
}

