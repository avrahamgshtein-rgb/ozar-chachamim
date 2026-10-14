import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { pageMetadata } from '@/lib/siteMetadata'
import { towerData } from '@/lib/towerServer'
import { TOWER_SUBTITLE, TOWER_TITLE, TowerPage } from '@/components/tower/TowerPage'

// The Tower of Generations: the whole corpus in 3D, height by time and direction by region,
// with the lines of transmission lit. The layout is computed here (lib/tower.ts); the page ships
// only positions and names, and three.js loads in the browser for this page alone.
// The same tower opened on one sage is tower/[id]/page.tsx.

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const loc = locale as Locale
  return pageMetadata({ locale: loc, path: '/tower', title: TOWER_TITLE[loc], description: TOWER_SUBTITLE[loc] })
}

export default async function TowerIndexPage({ params }: PageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()
  const loc = locale as Locale
  return <TowerPage locale={loc} data={towerData(loc)} />
}
