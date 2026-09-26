import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import { getAllSages, getCorpusStats } from '@/lib/serverData'
import { regionsOf } from '@/lib/regions'
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

  // Initial stats come from the same static corpus the client loads (computed
  // at build time; this page is prerendered). They used to be a Supabase count,
  // which was 0 until Supabase answered and, when it did, an old snapshot.
  const corpus = getCorpusStats()
  const initialStats = {
    ...corpus,
    regions: new Set(getAllSages().flatMap(s => regionsOf(s.location))).size,
  }

  return (
    <AppShell
      locale={validLocale}
      initialTotal={corpus.sages}
      initialLastUpdate={new Date().toLocaleDateString('he-IL')}
      initialStats={initialStats}
    />
  )
}
