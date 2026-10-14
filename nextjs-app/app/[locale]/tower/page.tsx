import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { pageMetadata } from '@/lib/siteMetadata'
import { getAllConnections, getAllSages } from '@/lib/serverData'
import { localizeSage } from '@/lib/serverDataTranslator'
import { buildTower } from '@/lib/tower'
import { SiteTopBar } from '@/components/layout/SiteTopBar'
import { TowerScene } from '@/components/tower/TowerScene'

// The Tower of Generations: the whole corpus in 3D, height by time and direction by region,
// with the lines of transmission lit. The layout is computed here (lib/tower.ts); the page ships
// only positions and names, and three.js loads in the browser for this page alone.

interface PageProps {
  params: Promise<{ locale: string }>
}

const TITLE = { he: 'מגדל הדורות', en: 'Tower of Generations', ru: 'Башня поколений' }
const SUBTITLE = {
  he: 'כל חכמי ישראל בתלת־ממד: הגובה הוא הזמן, הכיוון הוא המקום, והאור הוא המסירה מרב לתלמיד',
  en: 'Every sage in 3D: height is time, direction is place, and the light is the passing of Torah from teacher to student',
  ru: 'Все мудрецы в 3D: высота — время, направление — место, а свет — передача Торы от учителя к ученику',
}

const HINT = {
  he: 'גררו לסיבוב, צבטו או גללו לקירוב, ולחצו על חכם כדי להאיר את שלשלת המסירה שלו.',
  en: 'Drag to turn, pinch or scroll to zoom, and press a sage to light up his chain of transmission.',
  ru: 'Тяните, чтобы вращать, щипок или колесо для приближения; нажмите на мудреца, чтобы осветить его цепь передачи.',
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const loc = locale as Locale
  return pageMetadata({ locale: loc, path: '/tower', title: TITLE[loc], description: SUBTITLE[loc] })
}

export default async function TowerPage({ params }: PageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()
  const loc = locale as Locale
  const data = buildTower(getAllSages().map(s => localizeSage(s, loc)), getAllConnections(), loc)
  return (
    <div className="flex h-dvh flex-col bg-[#06050a] text-ink-100">
      <SiteTopBar locale={loc} path="/tower" />
      <main id="main" className="relative min-h-0 flex-1">
        <div dir={loc === 'he' ? 'rtl' : 'ltr'} className="pointer-events-none absolute start-4 top-4 z-10 max-w-[19rem] md:start-6">
          <h1 className="font-serif text-2xl font-bold text-gold-300 md:text-3xl">{TITLE[loc]}</h1>
          <p className="mt-1 hidden text-xs leading-relaxed text-ink-300 sm:block">{SUBTITLE[loc]}</p>
          <p className="mt-2 hidden text-[11px] leading-relaxed text-ink-500 md:block">{HINT[loc]}</p>
        </div>
        <TowerScene data={data} locale={loc} />
      </main>
    </div>
  )
}
