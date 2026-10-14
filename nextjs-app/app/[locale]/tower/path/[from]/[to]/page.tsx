import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { pageMetadata } from '@/lib/siteMetadata'
import { towerData } from '@/lib/towerServer'
import { connectPathFor } from '@/lib/connectServer'
import { buildFlight } from '@/lib/connectFlight'
import { SiteTopBar } from '@/components/layout/SiteTopBar'
import { TowerScene } from '@/components/tower/TowerScene'

// A path between two sages (lib/connect.ts) flown in the Tower of Generations: the page the picker, the game's
// end screen and a shared link lead to. It plays by itself on load, station by station, a line on every link
// ("תלמידו של רש״י"). Pages are made on first request and then served from the cache; each is a pair of
// sages, for sharing and not for search (only /connect is indexed), and a pair with no path is a 404.

interface PageProps {
  params: Promise<{ locale: string; from: string; to: string }>
}

const S = {
  subtitle: {
    he: (n: number) => `${n === 1 ? 'צעד אחד' : `${n} צעדים`} במגדל הדורות`,
    en: (n: number) => `${n === 1 ? '1 step' : `${n} steps`} in the Tower of Generations`,
    ru: (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'шаг' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'шага' : 'шагов'} в Башне поколений`,
  },
  description: {
    he: (a: string, b: string, n: number) => `השרשרת בין ${a} לבין ${b}: ${n === 1 ? 'צעד אחד' : `${n} צעדים`} של רב ותלמיד, משפחה, חברים והשפעה, עם משפט על כל קשר, במגדל הדורות.`,
    en: (a: string, b: string, n: number) => `The chain between ${a} and ${b}: ${n === 1 ? '1 step' : `${n} steps`} of teacher and student, family, colleagues and influence, with a line on every link, flown in the Tower of Generations.`,
    ru: (a: string, b: string, n: number) => `Цепочка между «${a}» и «${b}»: шагов — ${n}; учитель и ученик, семья, коллеги, влияние, с пояснением к каждой связи, в Башне поколений.`,
  },
} as const

/** "Rashi ← the Rambam" in Hebrew (the arrow points the way the line reads), "Rashi → the Rambam" elsewhere. */
const titleOf = (a: string, b: string, loc: Locale) => `${a} ${loc === 'he' ? '←' : '→'} ${b}`

export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, from, to } = await params
  if (!isValidLocale(locale)) return {}
  const loc = locale as Locale
  const views = connectPathFor(loc, from, to)
  if (!views) return {}
  const a = views[0].name, b = views[views.length - 1].name
  const base = pageMetadata({
    locale: loc,
    path: `/tower/path/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
    title: titleOf(a, b, loc),
    description: S.description[loc](a, b, views.length - 1),
  })
  return { ...base, robots: { index: false, follow: true } }
}

export default async function TowerPathPage({ params }: PageProps) {
  const { locale, from, to } = await params
  if (!isValidLocale(locale)) notFound()
  const loc = locale as Locale
  const views = connectPathFor(loc, from, to)
  if (!views) notFound()
  const data = towerData(loc)
  const flight = buildFlight(data, loc, views)
  if (!flight) notFound()
  const dir = loc === 'he' ? 'rtl' : 'ltr'
  const a = views[0].name, b = views[views.length - 1].name

  return (
    <div className="flex h-dvh flex-col bg-[#06050a] text-ink-100">
      <SiteTopBar locale={loc} path={`/tower/path/${encodeURIComponent(from)}/${encodeURIComponent(to)}`} />
      <main id="main" className="relative min-h-0 flex-1">
        <div dir={dir} className="pointer-events-none absolute start-4 top-4 z-10 max-w-[19rem] md:start-6">
          <h1 className="font-serif text-base font-bold leading-tight text-gold-300 sm:text-xl md:text-2xl">{titleOf(a, b, loc)}</h1>
          <p className="mt-1 hidden text-xs leading-relaxed text-ink-300 sm:block">{S.subtitle[loc](views.length - 1)}</p>
        </div>
        <TowerScene data={data} locale={loc} flight={flight} />
      </main>
    </div>
  )
}
