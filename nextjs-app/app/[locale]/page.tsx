import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import { fetchSageStats } from '@/lib/supabase'
import type { Locale } from '@/lib/types'
import { AppShell } from '@/components/layout/AppShell'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function MainPage({ params }: PageProps) {
  const { locale } = await params

  if (!isValidLocale(locale)) {
    notFound()
  }

  const validLocale = locale as Locale

  // Fetch initial stats server-side (fast first paint)
  const stats = await fetchSageStats().catch(() => ({ total: 0, lastUpdate: '' }))

  return (
    <AppShell
      locale={validLocale}
      initialTotal={stats.total}
      initialLastUpdate={stats.lastUpdate}
    />
  )
}
