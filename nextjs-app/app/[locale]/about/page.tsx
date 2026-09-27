import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { getSiteStats } from '@/lib/siteStats'
import { pageMetadata } from '@/lib/siteMetadata'
import { AboutContent } from '@/components/about/AboutContent'
import { SiteTopBar } from '@/components/layout/SiteTopBar'

interface PageProps {
  params: Promise<{ locale: string }>
}

const TITLES: Record<Locale, string> = { he: 'אודות', en: 'About', ru: 'О проекте' }

const DESCRIPTIONS: Record<Locale, string> = {
  he: 'מה יש באוצר חכמים: עבודת מחקר על כל חכם, רשת הקשרים, מפה, ציר זמן, שושלות ופרקי האזנה; איך לצטט את האתר, ולמי לכתוב כשמוצאים טעות.',
  en: "What Ozar Chachamim holds: a research paper on each sage, the network of connections, a map, a timeline, lineages and podcast episodes; how to cite the site, and whom to write to when you find a mistake.",
  ru: 'Что есть в «Оцар Хахамим»: исследование о каждом мудреце, сеть связей, карта, хронология, династии и выпуски подкаста; как цитировать сайт и куда писать, если вы нашли ошибку.',
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  return pageMetadata({ locale, path: '/about', title: TITLES[locale], description: DESCRIPTIONS[locale] })
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()

  // Same component as the About tab, fed the same build-time figures.
  const stats = getSiteStats()

  return (
    // The page is its own scroller: body is overflow:hidden for the graph canvas.
    <div className="h-dvh overflow-y-auto bg-ink-900 text-ink-100">
      <SiteTopBar locale={locale} path="/about" />
      <main id="main">
        <AboutContent locale={locale} stats={stats} variant="page" />
      </main>
    </div>
  )
}
