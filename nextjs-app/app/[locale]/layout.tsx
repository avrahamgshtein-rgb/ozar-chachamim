import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Script from 'next/script'
import { isValidLocale, UI } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { LocaleProvider } from '@/components/providers/LocaleProvider'
import { getWebsiteSchema, getOrganizationSchema } from '@/lib/structuredData'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateStaticParams() {
  return [{ locale: 'he' }, { locale: 'en' }, { locale: 'ru' }]
}

export async function generateMetadata({
  params,
}: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const t = UI[locale as Locale]
  const baseUrl = 'https://ozar-chachamim.vercel.app'
  const langDir = locale === 'he' ? 'rtl' : 'ltr'

  return {
    title: {
      default: `${t.appTitle} — ${t.appSubtitle}`,
      template: `%s | ${t.appTitle}`,
    },
    description: 'Interactive knowledge graph of Jewish sages through the ages',
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        'he': `${baseUrl}/he`,
        'en': `${baseUrl}/en`,
        'ru': `${baseUrl}/ru`,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'he' ? 'he_IL' : locale === 'ru' ? 'ru_RU' : 'en_US',
      url: `${baseUrl}/${locale}`,
      title: t.appTitle,
      description: 'Interactive knowledge graph of Jewish sages through the ages',
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: t.appTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.appTitle,
      description: 'Interactive knowledge graph of Jewish sages through the ages',
      images: [`${baseUrl}/og-image.png`],
    },
  }
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  if (!isValidLocale(locale)) {
    notFound()
  }

  const validLocale = locale as Locale

  return (
    // LocaleProvider sets html[lang] and html[dir] on the client
    <LocaleProvider locale={validLocale}>
      {/* JSON-LD Structured Data for SEO */}
      <Script
        id="website-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getWebsiteSchema()),
        }}
      />
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getOrganizationSchema()),
        }}
      />
      {children}
    </LocaleProvider>
  )
}
