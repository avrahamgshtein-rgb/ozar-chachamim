import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidLocale, UI } from '@/lib/i18n'
import type { Locale, Sage } from '@/lib/types'
import { SITE_URL } from '@/lib/siteUrl'
import { localizeSage, translatedFields } from '@/lib/serverDataTranslator'
import { labelParts } from '@/lib/displayName'
import { formatYearRangeFor } from '@/lib/utils'
import { hasQuiz } from '@/lib/quiz'
import { portraitCredit, portraitOf } from '@/lib/portraits'
import { sageVideos } from '@/lib/youtube'
import { formatCivilDate, formatHebrewDate, hebrewNumeral, MONTH_HE, type HebrewMonth } from '@/lib/today'
import { todayFeature, upcomingHillulot, yahrzeitOf } from '@/lib/todayServer'
import { SiteTopBar } from '@/components/layout/SiteTopBar'
import { EraChip } from '@/components/ui/EraChip'
import { ShareToday } from '@/components/today/ShareToday'
import { TodayFeaturedHead } from '@/components/today/TodayPortrait'
import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import { clipWords } from '@/lib/ogText'
import type { TodayCard } from '@/lib/todayVideo'

// "Today at Ozar Chachamim": today's Hebrew date; the sages whose hillula falls today, from the dates their
// own research papers give (lib/today.ts); otherwise the sage of the day; the hillulot of the coming month;
// and an image for a WhatsApp status. The day turns at midnight in Israel; the page is rebuilt every half hour.
export const revalidate = 1800

interface PageProps {
  params: Promise<{ locale: string }>
}

const S = {
  title: { he: 'היום באוצר חכמים', en: 'Today at Ozar Chachamim', ru: 'Сегодня в «Оцар Хахамим»' },
  description: {
    he: 'יום ההילולא של חכמי ישראל לפי הלוח העברי, וחכם היום: מחקר מלא, האזנה, סרטון וחידון.',
    en: 'The hillula (yahrzeit) of the sages of Israel by the Hebrew calendar, and a sage of the day: full research, listening, video and a quiz.',
    ru: 'Дни памяти (йорцайт) мудрецов Израиля по еврейскому календарю и мудрец дня: исследование, аудио, видео и викторина.',
  },
  hillula: { he: 'יום ההילולא', en: 'Hillula today', ru: 'День памяти сегодня' },
  daily: { he: 'חכם היום', en: 'Sage of the day', ru: 'Мудрец дня' },
  diedOn: { he: 'יום הפטירה:', en: 'Yahrzeit:', ru: 'День кончины:' },
  fromPaper: { he: 'מתוך המחקר', en: 'From the research paper', ru: 'Из исследования' },
  page: { he: 'לעמוד החכם', en: 'Open the page', ru: 'Открыть страницу' },
  read: { he: 'קריאה והאזנה למחקר', en: 'Read or listen', ru: 'Читать или слушать' },
  quiz: { he: 'חידון', en: 'Quiz', ru: 'Викторина' },
  video: { he: 'סרטון', en: 'Video', ru: 'Видео' },
  alsoToday: { he: 'גם היום', en: 'Also today', ru: 'Также сегодня' },
  upcoming: { he: 'ההילולות הקרובות', en: 'Coming hillulot', ru: 'Ближайшие дни памяти' },
  inDays: { he: (n: number) => (n === 1 ? 'מחר' : `בעוד ${n} ימים`), en: (n: number) => (n === 1 ? 'tomorrow' : `in ${n} days`), ru: (n: number) => (n === 1 ? 'завтра' : `через ${n} дн.`) },
  riddle: { he: 'חידת החכם של היום', en: 'Today’s Sage Riddle', ru: 'Загадка мудреца на сегодня' },
  riddleLine: {
    he: 'מי החכם הנסתר? נחשו לפי רמזים, ושתפו את התוצאה בלי לחשוף את התשובה.',
    en: 'Who is the hidden sage? Guess from the clues and share your result without giving the answer away.',
    ru: 'Кто этот скрытый мудрец? Угадайте по подсказкам и поделитесь результатом, не выдавая ответа.',
  },
  note: {
    he: 'תאריכי ההילולא לקוחים מהמחקרים שבאתר, כפי שהם כתובים בהם. היום מתחלף בחצות לפי שעון ישראל.',
    en: 'Hillula dates are taken from the research papers on the site, as they state them. The day changes at midnight, Israel time.',
    ru: 'Даты дней памяти взяты из исследований на сайте, как они там указаны. День меняется в полночь по израильскому времени.',
  },
} as const

// as the status image words them
const VIDEO_KIND = { hillula: { he: 'יום ההילולא של', en: 'The hillula of', ru: 'День памяти' } } as const
const VIDEO_MORE: Record<Locale, string> = {
  he: 'מחקר מלא · האזנה · סרטון · חידון', en: 'Full research · Listen · Video · Quiz', ru: 'Исследование · Аудио · Видео · Викторина',
}

const MONTH_RU: Record<HebrewMonth, string> = {
  Tishri: 'тишрея', Heshvan: 'хешвана', Kislev: 'кислева', Tevet: 'тевета', Shevat: 'швата', 'Adar I': 'адара I', Adar: 'адара',
  'Adar II': 'адара II', Nisan: 'нисана', Iyar: 'ияра', Sivan: 'сивана', Tamuz: 'тамуза', Av: 'ава', Elul: 'элула',
}

/** "כ׳ בטבת", "20 Tevet", "20 тевета". */
function dayMonth(day: number, month: HebrewMonth, loc: Locale): string {
  if (loc === 'he') return `${hebrewNumeral(day)} ב${MONTH_HE[month]}`
  if (loc === 'ru') return `${day} ${MONTH_RU[month]}`
  return `${day} ${month}`
}

function nameOf(sage: Sage, loc: Locale): string {
  return labelParts(localizeSage(sage, loc).label).name
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  const loc = locale as Locale
  const t = todayFeature()
  const lead = `${t.kind === 'hillula' ? S.hillula[loc] : S.daily[loc]}: ${nameOf(t.featured, loc)}`
  const title = `${S.title[loc]} · ${formatHebrewDate(t.date, loc)}`
  return {
    title,
    description: `${lead}. ${S.description[loc]}`,
    alternates: {
      canonical: `/${loc}/today`,
      languages: { he: '/he/today', en: '/en/today', ru: '/ru/today', 'x-default': '/he/today' },
    },
    openGraph: {
      title, description: lead, type: 'website', url: `${SITE_URL}/${loc}/today`,
      images: [{ url: `${SITE_URL}/${loc}/sage/${t.featured.id}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description: lead },
  }
}

export default async function TodayPage({ params }: PageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()
  const loc = locale as Locale
  const dir = loc === 'he' ? 'rtl' : 'ltr'
  const t = todayFeature()
  const upcoming = upcomingHillulot(t.date, 30).slice(0, 12)
  const pageUrl = `${SITE_URL}/${loc}/today`

  const featured = localizeSage(t.featured, loc)
  const { name, tagline } = labelParts(featured.label)
  const years = formatYearRangeFor(loc, featured.birth_year, featured.death_year, featured.date_precision)
  const y = yahrzeitOf(t.featured.id)
  const bioIsLocal = loc === 'he' || translatedFields(t.featured.id, loc).has('bio')
  const bio = bioIsLocal ? (featured.bio || featured.core_concept || '') : ''
  const href = `/${loc}/sage/${t.featured.id}`
  const videos = sageVideos(t.featured.id, loc).length > 0
  // the video for a status says what the status image says (app/[locale]/today/story/route.tsx); with a portrait it
  // also shows his picture, and the caption for its kind (the video component never looks a portrait up itself)
  const portrait = portraitOf(t.featured.id)
  const card: TodayCard = {
    dir,
    heading: S.title[loc],
    date: formatHebrewDate(t.date, loc),
    kind: t.kind === 'hillula' ? VIDEO_KIND.hillula[loc] : S.daily[loc],
    name,
    sub: [ERA_LABELS[featured.period]?.[loc], years].filter(Boolean).join('  ·  '),
    line: loc === 'he' || translatedFields(t.featured.id, loc).has('core_concept') ? clipWords(featured.core_concept || '', 150) : '',
    more: VIDEO_MORE[loc],
    host: `${SITE_URL.replace(/^https?:\/\//, '')}/${loc}/today`,
    appTitle: UI[loc].appTitle,
    accent: ERA_COLORS[featured.period] ?? '#c9973a',
    ...(portrait ? { portrait: { src: portrait.src, caption: portraitCredit(portrait, loc) } } : {}),
  }

  return (
    <div className="h-dvh overflow-y-auto scroll-smooth bg-ink-900 text-ink-100">
      <SiteTopBar locale={loc} path="/today" />
      <main id="main" lang={loc} dir={dir} className="mx-auto max-w-3xl px-4 pb-20 pt-6 font-sans sm:px-6 md:pt-10">
        <header>
          <p className="text-sm font-semibold text-gold-400">{S.title[loc]}</p>
          <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-ink-50 md:text-5xl">{formatHebrewDate(t.date, loc)}</h1>
          <p className="mt-1 text-ink-400">{formatCivilDate(t.date, loc)}</p>
        </header>

        <section aria-labelledby="today-featured" className="mt-8 rounded-2xl border border-gold-500/30 bg-gold-500/[0.06] p-5 sm:p-7">
          <TodayFeaturedHead id={t.featured.id} name={name} locale={loc} accent={card.accent}>
            <p className="inline-flex items-center gap-2 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-300">
              <span aria-hidden>{t.kind === 'hillula' ? '🕯️' : '📜'}</span>
              {t.kind === 'hillula' ? S.hillula[loc] : S.daily[loc]}
            </p>
            <h2 id="today-featured" className="mt-3 font-serif text-3xl font-bold leading-tight text-ink-50 md:text-4xl">
              <Link href={href} className="hover:text-gold-300">{name}</Link>
            </h2>
            {tagline && <p className="mt-1 font-serif text-lg text-gold-300">{tagline}</p>}
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-300">
              <EraChip period={featured.period} locale={loc} size="sm" />
              {years && <span className="tabular-nums">{years}</span>}
              {y && <span>· {S.diedOn[loc]} {dayMonth(y.day, y.month, loc)}</span>}
            </p>
          </TodayFeaturedHead>

          {t.kind === 'hillula' && y && loc === 'he' && (
            <blockquote className="mt-4 border-s-2 border-gold-500/50 ps-4 font-serif text-ink-200">
              <span className="mb-1 block font-sans text-[11px] font-semibold uppercase tracking-widest text-gold-400/80">{S.fromPaper[loc]}</span>
              …{y.quote}…
            </blockquote>
          )}
          {bio && <p className="mt-4 leading-relaxed text-ink-200">{bio}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={href} className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-900 hover:bg-gold-400">{S.page[loc]}</Link>
            <Link href={`${href}#research`} className="rounded-lg border border-gold-500/40 px-4 py-2 text-sm text-gold-200 hover:bg-gold-500/10">{S.read[loc]}</Link>
            {hasQuiz(t.featured.id, loc) && (
              <Link href={`${href}#quiz`} className="rounded-lg border border-gold-500/40 px-4 py-2 text-sm text-gold-200 hover:bg-gold-500/10">{S.quiz[loc]}</Link>
            )}
            {videos && (
              <Link href={`${href}#video`} className="rounded-lg border border-gold-500/40 px-4 py-2 text-sm text-gold-200 hover:bg-gold-500/10">{S.video[loc]}</Link>
            )}
          </div>
        </section>

        {t.hillulot.length > 1 && (
          <section aria-labelledby="today-also" className="mt-6">
            <h2 id="today-also" className="text-xs font-semibold uppercase tracking-widest text-ink-400">{S.alsoToday[loc]}</h2>
            <ul className="mt-2 space-y-1.5">
              {t.hillulot.slice(1).map(s => (
                <li key={s.id}><Link href={`/${loc}/sage/${s.id}`} className="font-serif text-lg text-ink-100 hover:text-gold-300">{nameOf(s, loc)}</Link></li>
              ))}
            </ul>
          </section>
        )}

        <ShareToday locale={loc} pageUrl={pageUrl} card={card} shareText={`${S.title[loc]} · ${t.kind === 'hillula' ? S.hillula[loc] : S.daily[loc]}: ${name}`} />

        {/* a plain <a>: a <Link> would prefetch the riddle's payload (every sage's name) for each visitor of this page */}
        <a
          href={`/${loc}/riddle`}
          className="mt-6 flex items-center gap-4 rounded-2xl border border-ink-700/50 bg-ink-800/30 p-4 transition-colors hover:border-gold-500/40 hover:bg-gold-500/[0.06]"
        >
          <span aria-hidden className="text-3xl">🧩</span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-lg font-bold text-ink-50">{S.riddle[loc]}</span>
            <span className="mt-0.5 block text-sm text-ink-300">{S.riddleLine[loc]}</span>
          </span>
          <span aria-hidden className="text-gold-400">{dir === 'rtl' ? '←' : '→'}</span>
        </a>

        {upcoming.length > 0 && (
          <section aria-labelledby="today-upcoming" className="mt-10">
            <h2 id="today-upcoming" className="text-xs font-semibold uppercase tracking-widest text-ink-400">{S.upcoming[loc]}</h2>
            <ul className="mt-3 divide-y divide-ink-700/40 rounded-xl border border-ink-700/40">
              {upcoming.map(u => {
                const yz = yahrzeitOf(u.sage.id)!
                return (
                  <li key={`${u.sage.id}-${u.inDays}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <Link href={`/${loc}/sage/${u.sage.id}`} className="min-w-0 truncate font-serif text-ink-100 hover:text-gold-300">{nameOf(u.sage, loc)}</Link>
                    <span className="flex-shrink-0 text-xs text-ink-400">
                      {dayMonth(yz.day, yz.month, loc)} · {S.inDays[loc](u.inDays)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <p className="mt-10 text-xs text-ink-500">{S.note[loc]}</p>
        <p className="mt-2 text-xs"><Link href={`/${loc}`} className="text-gold-400 hover:underline">{UI[loc].backToMap}</Link></p>
      </main>
    </div>
  )
}
