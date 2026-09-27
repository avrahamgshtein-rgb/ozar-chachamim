import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale, getDirection, getHtmlLang, OG_LOCALES, UI } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { SITE_URL } from '@/lib/siteUrl'
import { SkipLink } from '@/components/layout/SkipLink'
import { fontVariables, THEME_INIT_SCRIPT } from '../fonts'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateStaticParams() {
  return [{ locale: 'he' }, { locale: 'en' }, { locale: 'ru' }]
}

// Site-wide defaults only. Canonical URLs and hreflang alternates are set per
// page (home, about, sage pages): set here they would be inherited by every
// child route, pointing the about page's canonical at the home page.
export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const t = UI[locale]

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${t.appTitle} — ${t.appSubtitle}`,
      template: `%s | ${t.appTitle}`,
    },
    description: t.seoDescription,
    applicationName: t.appTitle,
    openGraph: {
      siteName: t.appTitle,
      type: 'website',
      locale: OG_LOCALES[locale],
    },
    twitter: { card: 'summary' },
  }
}

// This is the document shell: <html> is rendered here rather than in
// app/layout.tsx so lang/dir come out right in the server HTML for every
// locale. The previous shell always shipped he/rtl and patched en/ru from a
// client script, which ran only after first paint.
export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  if (!isValidLocale(locale)) {
    notFound()
  }

  const validLocale = locale as Locale

  return (
    // suppressHydrationWarning: the theme script sets data-theme before React
    // hydrates, so that one attribute legitimately differs from the server HTML.
    <html
      lang={getHtmlLang(validLocale)}
      dir={getDirection(validLocale)}
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans bg-ink-900 text-ink-100 antialiased">
        <SkipLink label={UI[validLocale].skipToContent} />
        {children}
      </body>
    </html>
  )
}
