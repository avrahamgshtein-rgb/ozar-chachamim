import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale, UI } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { LocaleProvider } from '@/components/providers/LocaleProvider'

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateStaticParams() {
  return [{ locale: 'he' }, { locale: 'en' }]
}

export async function generateMetadata({
  params,
}: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const t = UI[locale as Locale]
  return {
    title: {
      default: `${t.appTitle} — ${t.appSubtitle}`,
      template: `%s | ${t.appTitle}`,
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
