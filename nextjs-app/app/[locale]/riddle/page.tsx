import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidLocale, UI } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { SITE_URL } from '@/lib/siteUrl'
import { pageMetadata } from '@/lib/siteMetadata'
import { riddlePayload } from '@/lib/riddleServer'
import { SHARE_TITLE } from '@/lib/riddle'
import { SiteTopBar } from '@/components/layout/SiteTopBar'
import { RiddleGame } from '@/components/riddle/RiddleGame'
import { Toaster } from '@/components/sages/Toast'

// "Sage Riddle": one hidden sage a day, the same for every visitor, found from clues that come one at a time
// (lib/riddle.ts). The day turns at midnight in Israel and the page is rebuilt every half hour, as the Today
// page is; the game itself runs in the browser and keeps its streak there.
export const revalidate = 1800

interface PageProps {
  params: Promise<{ locale: string }>
}

const S = {
  description: {
    he: 'חכם נסתר אחד בכל יום: נחשו מי החכם לפי רמזים שנחשפים אחד אחד. כל ניחוש שגוי מגלה רמז נוסף, ואפשר לשתף את התוצאה בלי לחשוף את התשובה.',
    en: 'One hidden sage a day: guess who he or she is from clues revealed one by one. Every wrong guess unlocks the next clue, and you can share your result without giving the answer away.',
    ru: 'Каждый день один скрытый мудрец: угадайте, кто это, по подсказкам, которые открываются одна за другой. Каждая ошибка открывает следующую подсказку, а результатом можно поделиться, не выдавая ответа.',
  },
  intro: {
    he: 'חכם אחד נסתר, שישה ניחושים. כל ניחוש שגוי חושף רמז נוסף ומראה אם החכם הנסתר מוקדם או מאוחר ממנו, באותו אזור, או קשור אליו ישירות.',
    en: 'One hidden sage, six guesses. Each wrong guess unlocks another clue and tells you whether the hidden sage came before or after yours, in the same region, or is directly linked.',
    ru: 'Один скрытый мудрец, шесть попыток. Каждая ошибка открывает ещё одну подсказку и показывает, как скрытый мудрец соотносится с вашей попыткой: раньше или позже, в том же ли регионе, есть ли прямая связь.',
  },
  note: {
    he: 'החידה מתחלפת בחצות לפי שעון ישראל, והרצף והסטטיסטיקה נשמרים בדפדפן הזה בלבד.',
    en: 'The riddle changes at midnight, Israel time. Your streak and statistics stay in this browser only.',
    ru: 'Загадка меняется в полночь по израильскому времени. Серия и статистика хранятся только в этом браузере.',
  },
} as const

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const loc = locale as Locale
  return pageMetadata({ locale: loc, path: '/riddle', title: SHARE_TITLE[loc], description: S.description[loc] })
}

export default async function RiddlePage({ params }: PageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()
  const loc = locale as Locale
  const dir = loc === 'he' ? 'rtl' : 'ltr'
  const payload = riddlePayload(loc)

  return (
    <div className="h-dvh overflow-y-auto scroll-smooth bg-ink-900 text-ink-100">
      <SiteTopBar locale={loc} path="/riddle" />
      <main id="main" lang={loc} dir={dir} className="mx-auto max-w-2xl px-4 pb-20 pt-6 font-sans sm:px-6 md:pt-10">
        <header>
          <h1 className="font-serif text-4xl font-bold leading-tight text-ink-50 md:text-5xl">
            <span aria-hidden>🧩</span> {SHARE_TITLE[loc]}
            {payload.number >= 1 && <span className="ms-2 text-2xl text-gold-400 md:text-3xl" dir="ltr">#{payload.number}</span>}
          </h1>
          <p className="mt-3 leading-relaxed text-ink-300">{S.intro[loc]}</p>
        </header>

        <RiddleGame locale={loc} payload={payload} pageUrl={`${SITE_URL}/${loc}/riddle`} />

        <p className="mt-10 text-xs text-ink-500">{S.note[loc]}</p>
        <p className="mt-2 text-xs"><Link href={`/${loc}`} className="text-gold-400 hover:underline">{UI[loc].backToMap}</Link></p>
      </main>
      <Toaster />
    </div>
  )
}
