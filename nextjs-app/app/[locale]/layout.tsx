import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale, UI } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { LocaleProvider } from '@/components/providers/LocaleProvider'
import { SITE_URL } from '@/lib/siteUrl'

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
  const validLocale = locale as Locale
  const t = UI[validLocale]
  const OG_LOCALES: Record<Locale, string> = { he: 'he_IL', en: 'en_US', ru: 'ru_RU' }

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${t.appTitle} — ${t.appSubtitle}`,
      template: `%s | ${t.appTitle}`,
    },
    openGraph: {
      title: t.appTitle,
      description: t.appSubtitle,
      type: 'website',
      locale: OG_LOCALES[validLocale],
      url: `${SITE_URL}/${validLocale}`,
    },
    alternates: {
      canonical: `/${validLocale}`,
      languages: {
        he: '/he',
        en: '/en',
        ru: '/ru',
        'x-default': '/he',
      },
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
      {children}
    </LocaleProvider>
  )
}
