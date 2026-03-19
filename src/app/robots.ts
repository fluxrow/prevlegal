import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.prevlegal.com.br'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/lp.html'],
        disallow: [
          '/dashboard',
          '/leads',
          '/caixa-de-entrada',
          '/agendamentos',
          '/campanhas',
          '/relatorios',
          '/configuracoes',
          '/financeiro',
          '/admin',
          '/portal',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
