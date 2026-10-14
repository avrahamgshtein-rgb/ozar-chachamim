import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { SITE_URL } from '@/lib/siteUrl'
import { towerData } from '@/lib/towerServer'
import { KIDS_TOUR_ROUTES, kidsTour, kidsTourPath } from '@/lib/kidsTour'
import { SiteTopBar } from '@/components/layout/SiteTopBar'
import { TowerScene } from '@/components/tower/TowerScene'

// "מכונת הזמן": a route of the kids' journey (lib/kidsJourney.ts) flown in the Tower of Generations,
// station by station. Hebrew, like the books; the English and Russian addresses show the same journey
// and point search engines at the Hebrew one, as the kids' page does.

interface PageProps {
  params: Promise<{ locale: string; route: string }>
}

export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, route } = await params
  if (!isValidLocale(locale)) return {}
  const tour = kidsTour(towerData('he'), route)
  if (!tour) return {}
  const title = `מכונת הזמן: ${tour.title} בתלת־ממד`
  const description = `טסים במגדל הדורות מתחנה לתחנה במסע של ${tour.traveller} ו${tour.guide}: ${tour.stations.length} תחנות, מי פוגשים בכל אחת, ומשחק, משימה וחידון.`
  const cover = tour.route === 'shira' ? '/kids/shira-cover.webp' : '/kids/saltiel-cover.webp'
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${kidsTourPath(tour.route)}` },
    robots: locale === 'he' ? undefined : { index: false, follow: true },
    openGraph: { title, description, images: [{ url: `${SITE_URL}${cover}` }] },
  }
}

export default async function KidsTourPage({ params }: PageProps) {
  const { locale, route } = await params
  if (!isValidLocale(locale) || !KIDS_TOUR_ROUTES.includes(route as never)) notFound()
  const data = towerData('he')
  const tour = kidsTour(data, route)
  if (!tour) notFound()
  return (
    <div className="flex h-dvh flex-col bg-[#06050a] text-ink-100">
      <SiteTopBar locale={locale as Locale} path={`/kids/journey/${route}`} />
      <main id="main" lang="he" dir="rtl" className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute start-4 top-4 z-10 hidden max-w-[19rem] sm:block md:start-6">
          <h1 className="font-serif text-2xl font-bold text-gold-300 md:text-3xl">מכונת הזמן</h1>
          <p className="mt-1 text-xs leading-relaxed text-ink-300">{tour.title}: טסים במגדל הדורות, שבו הגובה הוא הזמן והכיוון הוא המקום, מתחנה לתחנה.</p>
        </div>
        <TowerScene data={data} locale="he" tour={tour} />
      </main>
    </div>
  )
}
