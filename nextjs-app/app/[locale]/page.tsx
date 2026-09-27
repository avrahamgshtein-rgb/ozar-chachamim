import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale, UI } from '@/lib/i18n'
import { getSiteStats } from '@/lib/siteStats'
import { pageMetadata } from '@/lib/siteMetadata'
import type { Locale } from '@/lib/types'
import { AppShell } from '@/components/layout/AppShell'

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  return pageMetadata({ locale, path: '', description: UI[locale].seoDescription })
}

export default async function MainPage({ params }: PageProps) {
  const { locale } = await params

  if (!isValidLocale(locale)) {
    notFound()
  }

  const validLocale = locale as Locale

  // Initial stats come from the same static corpus the client loads (computed
  // at build time; this page is prerendered). They seed the header count and
  // the About tab, so neither shows "0" before the client dataset arrives.
  const initialStats = getSiteStats()

  return (
    <AppShell
      locale={validLocale}
      initialTotal={initialStats.sages}
      initialLastUpdate={new Date().toLocaleDateString('he-IL')}
      initialStats={initialStats}
    />
  )
}
