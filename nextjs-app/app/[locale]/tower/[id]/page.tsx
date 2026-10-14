import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale, UI } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { pageMetadata } from '@/lib/siteMetadata'
import { SITE_URL } from '@/lib/siteUrl'
import { lineageOf } from '@/lib/tower'
import { towerData } from '@/lib/towerServer'
import { TOWER_SUBTITLE, TowerPage } from '@/components/tower/TowerPage'

// The Tower of Generations opened on one sage, his chain of transmission already lit: the link the
// "see him in the tower" chip on his page leads to, and the address the scene keeps up to date as
// the visitor chooses sages, so a shared link (WhatsApp …) opens on the same sage and its preview
// is his share card. Pages are made on first request and then served from the cache.

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

const IN_TOWER = { he: 'במגדל הדורות', en: 'in the Tower of Generations', ru: 'в Башне поколений' }

function chainLine(n: number, loc: Locale): string {
  if (!n) return ''
  if (loc === 'he') return `${n === 1 ? 'חכם אחד' : `${n} חכמים`} בשלשלת המסירה. `
  if (loc === 'ru') return `В цепи передачи: ${n}. `
  return `${n} ${n === 1 ? 'sage' : 'sages'} in the chain of transmission. `
}

export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params
  if (!isValidLocale(locale)) return {}
  const loc = locale as Locale
  const data = towerData(loc)
  const node = data.nodes.find(n => n.id === id)
  if (!node) return {}
  const chain = lineageOf(data, id, 4)
  const title = `${node.short} ${IN_TOWER[loc]}`
  const description = chainLine(chain.up.size + chain.down.size + chain.family.size, loc) + TOWER_SUBTITLE[loc]
  const base = pageMetadata({ locale: loc, path: `/tower/${id}`, title, description })
  // the preview is the sage's own share card (app/[locale]/sage/[id]/opengraph-image.tsx)
  const image = { url: `${SITE_URL}/${loc}/sage/${id}/opengraph-image`, width: 1200, height: 630, alt: node.name }
  return {
    ...base,
    // one page per sage and language is for sharing, not for search: /tower is the indexed page
    robots: { index: false, follow: true },
    openGraph: { ...base.openGraph, images: [image] },
    twitter: { card: 'summary_large_image', title: `${title} | ${UI[loc].appTitle}`, description, images: [image] },
  }
}

export default async function TowerSagePage({ params }: PageProps) {
  const { locale, id } = await params
  if (!isValidLocale(locale)) notFound()
  const loc = locale as Locale
  const data = towerData(loc)
  if (!data.nodes.some(n => n.id === id)) notFound()
  return <TowerPage locale={loc} data={data} initialSage={id} />
}
