import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidLocale } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { SITE_URL } from '@/lib/siteUrl'
import { KIDS_ROUTES, stationAnchor, type JourneyRoute, type JourneyStation } from '@/lib/kidsJourney'
import { kidsTourPath } from '@/lib/kidsTour'
import { SiteTopBar } from '@/components/layout/SiteTopBar'
import { KidsPassport } from '@/components/kids/KidsPassport'
import { StationDone } from '@/components/kids/StationDone'
import { StationQuiz } from '@/components/kids/StationQuiz'

// The children's track: "היכן החכמה מתגוררת", the owner's two books for ages 9–12, as a journey through the
// site. Hebrew only, like the books; the English and Russian addresses show the same page with a note, and
// point search engines at the Hebrew one.

interface PageProps {
  params: Promise<{ locale: string }>
}

const TITLE = 'היכן החכמה מתגוררת: מסע לילדים'
const DESCRIPTION = 'מסע בעקבות חכמי ישראל לגילאי 9–12: שאלתי והמגיד בשבעה מפגשים, ושירה והמספרת בשמונה תחנות בשער החכמות. כרטיסי מסע, משחקים ומשימות, ודרכון מסע.'

const NOTE: Partial<Record<Locale, string>> = {
  en: 'This journey for children is in Hebrew, like the books it comes from.',
  ru: 'Это путешествие для детей на иврите, как и книги, на которых оно основано.',
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  if (!isValidLocale(locale)) return {}
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: `${SITE_URL}/he/kids` },
    robots: locale === 'he' ? undefined : { index: false, follow: true },
    openGraph: { title: TITLE, description: DESCRIPTION, images: [{ url: `${SITE_URL}/kids/saltiel-cover.webp`, width: 1400, height: 786 }] },
  }
}

export default async function KidsPage({ params }: PageProps) {
  const { locale } = await params
  if (!isValidLocale(locale)) notFound()
  const saltiel = KIDS_ROUTES[0]

  return (
    <div className="h-dvh overflow-y-auto scroll-smooth bg-ink-900 text-ink-100">
      <SiteTopBar locale={locale} path="/kids" />
      <main id="main" lang="he" dir="rtl" className="mx-auto max-w-5xl px-4 pb-20 pt-6 font-sans sm:px-6 md:pt-10">
        {NOTE[locale] && (
          <p lang={locale} dir="ltr" className="mb-6 rounded-lg border border-ink-700/40 bg-ink-800/40 px-3 py-2 text-sm text-ink-300">{NOTE[locale]}</p>
        )}

        {/* ── Opening ─────────────────────────────────────────── */}
        <header>
          <p className="text-sm font-semibold text-gold-400">מסע לילדים · לגילאי 9–12</p>
          <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-ink-50 md:text-5xl">היכן החכמה מתגוררת</h1>
          <p className="mt-2 font-serif text-xl text-gold-300">מסע בעקבות החכמים</p>
          <img
            src={saltiel.cover.src} width={saltiel.cover.width} height={saltiel.cover.height}
            alt="שאלתי והמגיד בתחנות המסע: האותיות המנגנות, יבנה, בבל, ירושלים, פראג, היער ותל אביב"
            className="mt-6 h-auto w-full rounded-2xl border border-ink-700/40"
          />
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-ink-200">
            בבית המדרש הגדול יש דלת בצורת האות מ׳. מי שעובר בה יוצא למסע בזמן ופוגש את חכמי ישראל בעצמם.
            יש כאן שני מסעות: <a href="#saltiel" className="link-gold font-semibold">המסע של שאלתי</a> עם המגיד, בשבעה מפגשים,
            ו<a href="#shira" className="link-gold font-semibold">המסע של שירה</a> עם המספרת, בשמונה תחנות בשער החכמות.
          </p>
          <p className="mt-3 max-w-3xl leading-relaxed text-ink-300">
            בכל תחנה: כרטיס מסע, מה קורה שם, החכמים שפוגשים (ולכל אחד דף משלו באתר, עם פרק להאזנה ולפעמים סרטון),
            ומשחק ומשימה להמשך בבית או בכיתה. בסוף התחנה מחתימים את דרכון המסע.
          </p>
        </header>

        <div className="mt-10">
          <KidsPassport />
        </div>

        {KIDS_ROUTES.map(route => <RouteSection key={route.key} route={route} />)}

        {/* ── About the books ─────────────────────────────────── */}
        <footer className="mt-20 border-t border-ink-700/40 pt-10">
          <h2 className="font-serif text-2xl font-bold text-ink-50">על הספרים</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-ink-300">
            המסעות לקוחים מסדרת הספרים ״היכן החכמה מתגוררת״: ״מסע בעקבות החכמים״ ו״קולה של החכמה״, מאת אברהם גולדשטיין,
            עם איורים של בנו משה יהודה גולדשטיין. הסיפורים משלבים עובדות היסטוריות ומקורות חז״ל עם דמיון: המסע בזמן והשיחות עם החכמים הם פרי הדמיון,
            ונועדו לקרב את הקוראים הצעירים אל עולמם של החכמים. כאן מופיעים רק כרטיסי המסע, תקציר קצר ודפי ״משחק ומשימה״; הסיפורים עצמם בספרים.
          </p>
          <figure className="mt-6">
            <div className="flex flex-wrap gap-4">
              <img src="/kids/original-1.webp" width={800} height={1331} alt="ציור מקורי של המאייר הצעיר: שאלתי והמגיד" loading="lazy" className="h-56 w-auto rounded-xl border border-ink-700/40" />
              <img src="/kids/original-2.webp" width={800} height={971} alt="ציור מקורי של המאייר הצעיר: המגיד" loading="lazy" className="h-56 w-auto rounded-xl border border-ink-700/40" />
            </div>
            <figcaption className="mt-2 text-sm text-ink-400">שאלתי והמגיד, כפי שצייר אותם המאייר הצעיר. איורי המפגשים מבוססים על הדמויות האלה.</figcaption>
          </figure>
          <p className="mt-6 text-xs text-ink-500">© כל הזכויות שמורות למשפחת גולדשטיין. הורים ומחנכים רשאים להעתיק את דפי ״משחק ומשימה״ לשימוש אישי ולימודי בלבד, שלא למטרות מסחר.</p>
          <p className="mt-4"><Link href={`/${locale}`} className="link-gold text-sm">חזרה לאוצר חכמים</Link></p>
        </footer>
      </main>
    </div>
  )
}

function RouteSection({ route }: { route: JourneyRoute }) {
  return (
    <section id={route.key} aria-labelledby={`${route.key}-title`} className="mt-16 scroll-mt-20">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_14rem] md:items-start">
        <div>
          <p className="text-sm font-semibold text-gold-400">{route.book}</p>
          <h2 id={`${route.key}-title`} className="mt-1 font-serif text-3xl font-bold text-ink-50">{route.title}</h2>
          <p className="mt-1 text-ink-300">{route.subtitle} · עם {route.guide}</p>
          <p className="mt-4 max-w-3xl leading-relaxed text-ink-200">{route.intro}</p>
          {/* a plain link: the kids' page does not prefetch the tower (three.js and every sage) */}
          <a href={kidsTourPath(route.key)}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-gold-500/60 bg-gradient-to-b from-gold-500/30 to-gold-500/10 px-5 py-3 font-semibold text-gold-100 shadow-[0_0_24px_rgba(233,196,106,0.2)] transition-colors hover:from-gold-500/40">
            <span aria-hidden className="text-xl">🚀</span>
            <span>מכונת הזמן: {route.title} בתלת־ממד</span>
          </a>
        </div>
        {route.key === 'shira' && (
          <img src={route.cover.src} width={route.cover.width} height={route.cover.height} alt={`כריכת הספר ״${route.book}״`} loading="lazy"
            className="hidden h-auto w-56 rounded-xl border border-ink-700/40 md:block" />
        )}
      </div>

      {/* The path: numbered stops joined by a line, as on the books' timelines */}
      <ol className="relative mt-8 space-y-8 border-s-2 border-gold-500/25 ps-6 md:ps-8">
        {route.stations.map(s => <Station key={s.n} route={route} station={s} />)}
      </ol>
    </section>
  )
}

function Station({ route, station: s }: { route: JourneyRoute; station: JourneyStation }) {
  const rows: Array<[string, React.ReactNode]> = [
    ['לאן?', s.place],
    ['מתי?', s.when],
    ['את מי נפגוש?', (
      <span className="flex flex-wrap gap-1.5">
        {s.who.map(p => p.id ? (
          <Link key={p.name} href={`/he/sage/${p.id}`} className="rounded-full border border-gold-500/40 bg-gold-500/10 px-2.5 py-0.5 text-gold-200 hover:bg-gold-500/20">{p.name}</Link>
        ) : (
          <span key={p.name} className="rounded-full border border-ink-600/50 px-2.5 py-0.5 text-ink-200">{p.name}</span>
        ))}
      </span>
    )],
  ]
  // Shira's stations name their secret under the title already
  if (!s.secret) rows.push(['מילות המפתח', s.keywords.join(' · ')])
  if (s.object) rows.push(['החפץ שנכנס לתיק', `${s.object.icon} ${s.object.name}`])

  return (
    <li id={stationAnchor(route.key, s.n)} className="relative scroll-mt-20">
      <span aria-hidden className="absolute -start-[2.35rem] top-1 grid h-9 w-9 place-items-center rounded-full border-2 border-gold-500 bg-ink-900 font-serif text-lg font-bold text-gold-300 md:-start-[2.85rem]">
        {s.n}
      </span>
      <article className="overflow-hidden rounded-2xl border border-ink-700/50 bg-ink-800/30">
        <div className={s.image ? 'grid gap-0 md:grid-cols-[18rem_minmax(0,1fr)]' : ''}>
          {s.image && (
            <img src={s.image.src} width={s.image.width} height={s.image.height} loading="lazy"
              alt={`${route.traveller} ו${route.guide} בתחנה ${s.n}: ${s.title}`}
              className="h-full max-h-[22rem] w-full object-cover md:max-h-none" />
          )}
          <div className="p-5 md:p-6">
            <p className="text-xs font-semibold text-gold-400">{route.key === 'saltiel' ? `המפגש ה${ORDINAL[s.n]}` : `התחנה ה${ORDINAL_F[s.n]}`}</p>
            <h3 className="mt-1 font-serif text-2xl font-bold leading-snug text-ink-50">{s.title}</h3>
            {s.secret && <p className="mt-0.5 font-serif text-lg text-gold-300">{s.secret}</p>}

            <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-xl border border-ink-700/40 bg-ink-900/40 p-4 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-semibold text-ink-400">{k}</dt>
                  <dd className="text-ink-100">{v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 leading-relaxed text-ink-200">{s.summary}</p>

            {s.tasks.length > 0 && (
              <details className="mt-4 rounded-xl border border-ink-700/40 bg-ink-900/30 p-4">
                <summary className="cursor-pointer font-semibold text-gold-300">🎲 משחק ומשימה לבית או לכיתה</summary>
                <ol className="mt-3 space-y-3">
                  {s.tasks.map(t => (
                    <li key={t.name}>
                      <p className="font-semibold text-ink-100">{t.name}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-300">{t.text}</p>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <div className="mt-5">
              <StationQuiz route={route.key} n={s.n} />
            </div>

            <div className="mt-5">
              <StationDone route={route.key} n={s.n} object={s.object} />
            </div>
          </div>
        </div>
      </article>
    </li>
  )
}

const ORDINAL: Record<number, string> = { 1: 'ראשון', 2: 'שני', 3: 'שלישי', 4: 'רביעי', 5: 'חמישי', 6: 'שישי', 7: 'שביעי', 8: 'שמיני' }
const ORDINAL_F: Record<number, string> = { 1: 'ראשונה', 2: 'שנייה', 3: 'שלישית', 4: 'רביעית', 5: 'חמישית', 6: 'שישית', 7: 'שביעית', 8: 'שמינית' }
