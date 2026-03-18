import type { Metadata } from 'next'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://prevlegal.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'PrevLegal — Operações de Captação Previdenciária',
    template: '%s | PrevLegal',
  },
  description:
    'Plataforma SaaS para operações de captação previdenciária. Qualificação por IA, WhatsApp automático, gestão de leads e documentos gerados em segundos.',
  keywords: [
    'previdenciário',
    'INSS',
    'revisão de benefício',
    'captação previdenciária',
    'gestão de leads previdenciário',
    'software advocacia previdenciária',
    'agente IA previdenciário',
    'WhatsApp automático advocacia',
    'STF RE 564.354',
    'revisão teto previdenciário',
  ],
  authors: [{ name: 'PrevLegal', url: SITE_URL }],
  creator: 'Fluxrow',
  publisher: 'PrevLegal',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: 'PrevLegal',
    title: 'PrevLegal — Do lead importado ao contrato fechado',
    description:
      'Qualificação por IA, WhatsApp automático e gestão completa para operações de captação previdenciária.',
    images: [{ url: '/og', width: 1200, height: 630, alt: 'PrevLegal — Plataforma de Captação Previdenciária' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrevLegal — Operações de Captação Previdenciária',
    description:
      'Qualificação por IA, WhatsApp automático e gestão completa para captação previdenciária.',
    images: ['/og'],
  },
  alternates: { canonical: SITE_URL },
  category: 'technology',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#07080d" />
        <meta name="color-scheme" content="dark" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'PrevLegal',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description: 'Plataforma SaaS para operações de captação previdenciária com IA.',
              url: SITE_URL,
              creator: { '@type': 'Organization', name: 'Fluxrow' },
              offers: {
                '@type': 'Offer',
                price: '1997',
                priceCurrency: 'BRL',
                priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  billingDuration: 'P1M',
                },
              },
            }),
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
