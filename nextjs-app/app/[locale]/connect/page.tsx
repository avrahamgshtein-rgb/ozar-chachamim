import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidLocale, UI } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { SITE_URL } from '@/lib/siteUrl'
import { pageMetadata } from '@/lib/siteMetadata'
import { connectPageData } from '@/lib/chainServer'
import { CHAIN_TITLE } from '@/lib/chain'
import { SiteTopBar } from '@/components/layout/SiteTopBar'
import { ChainGame } from '@/components/connect/ChainGame'
import { ConnectPicker } from '@/components/connect/ConnectPicker'
import { Toaster } from '@/components/sages/Toast'

// "Six Steps": the shortest chain of recorded relations between any two sages (the picker), which the Tower of
// Generations flies station by station, and "Sage Chain", a daily game over the same links (lib/connect.ts,
// lib/chain.ts). The day turns at midnight in Israel and the page is rebuilt every half hour, as the riddle is;
// the picker and the game run in the browser, which holds the net of sages and links the page ships.
export const revalidate = 1800

interface PageProps {
  params: Promise<{ locale: string }>
}

const S = {
  title: { he: 'שישה צעדים', en: 'Six Steps', ru: 'Шесть шагов' },
  intro: {
    he: 'רוב החכמים באתר קשורים זה לזה בשרשרת קצרה של רב ותלמיד, משפחה, חברים והשפעה. שחקו במשחק היומי, או בחרו שני חכמים וטוסו בשרשרת שביניהם במגדל הדורות.',
    en: 'Most sages on the site are tied to one another by a short chain of teacher and student, family, colleagues and influence. Play the daily game, or pick two sages and fly the chain between them through the Tower of Generations.',
    ru: 'Большинство мудрецов на сайте связаны друг с другом короткой цепочкой: учитель и ученик, семья, коллеги, влияние. Сыграйте в ежедневную игру или выберите двух мудрецов и пролетите по цепочке между ними через Башню поколений.',
  },
  description: {
    he: 'משחק יומי, שרשרת החכמים: לחבר בין שני חכמים בכמה שפחות צעדים. ומסלול בין כל שני חכמים, שאפשר לטוס בו במגדל הדורות.',
    en: 'A daily game, Sage Chain: connect two sages in as few steps as you can. And a path between any two sages, which you can fly through the Tower of Generations.',
    ru: 'Ежедневная игра «Цепочка мудрецов»: соедините двух мудрецов как можно меньшим числом шагов. И путь между любыми двумя мудрецами, по которому можно пролететь через Башню поколений.',
  },
  note: {
    he: 'המשחק מתחלף בחצות לפי שעון ישראל, והרצף והסטטיסטיקה נשמרים בדפדפן הזה בלבד. הקשרים הם אלה המתועדים באתר, ולא כל קשר שהיה.',
    en: 'The game changes at midnight, Israel time. Your streak and statistics stay in this browser only. The links are those recorded on the site, not every tie there ever was.',
    ru: 'Игра меняется в полночь по израильскому времени. Серия и статистика хранятся только в этом браузере. Связи — это те, что записаны на сайте, а не все, что когда-либо были.',
  },
} as const

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const loc = locale as Locale
  return pageMetadata({ locale: loc, path: '/connect', title: `${S.title[loc]}: ${CHAIN_TITLE[loc]}`, description: S.description[loc] })
}

export default async function ConnectPage({ params }: PageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()
  const loc = locale as Locale
  const dir = loc === 'he' ? 'rtl' : 'ltr'
  const { net, day } = connectPageData(loc)

  return (
    <div className="h-dvh overflow-y-auto scroll-smooth bg-ink-900 text-ink-100">
      <SiteTopBar locale={loc} path="/connect" />
      <main id="main" lang={loc} dir={dir} className="mx-auto max-w-2xl px-4 pb-20 pt-6 font-sans sm:px-6 md:pt-10">
        <header>
          <h1 className="font-serif text-4xl font-bold leading-tight text-ink-50 md:text-5xl">
            <span aria-hidden>🔗</span> {S.title[loc]}
          </h1>
          <p className="mt-3 leading-relaxed text-ink-300">{S.intro[loc]}</p>
        </header>

        <ChainGame locale={loc} net={net} day={day} pageUrl={`${SITE_URL}/${loc}/connect`} />
        <ConnectPicker locale={loc} net={net} />

        <p className="mt-10 text-xs text-ink-500">{S.note[loc]}</p>
        <p className="mt-2 text-xs"><Link href={`/${loc}`} className="text-gold-400 hover:underline">{UI[loc].backToMap}</Link></p>
      </main>
      <Toaster />
    </div>
  )
}
