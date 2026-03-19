import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.prevlegal.com.br'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.prevlegal.com.br'

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/lp.html`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${appUrl}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]
}
