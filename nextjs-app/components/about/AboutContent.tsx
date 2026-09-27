// The one About. Rendered by the About tab (inside AppShell) and by the
// standalone /[locale]/about page, so the two can no longer drift apart.
// No hooks and no store: it takes server-computed figures as props and renders
// the same markup on the server (about page) and in the client (tab).
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { TAB_META } from '@/lib/types'
import type { Locale, Tab } from '@/lib/types'
import { UI } from '@/lib/i18n'
import { SITE_URL } from '@/lib/siteUrl'
import type { CorpusStats } from '@/lib/siteStats'
import { ABOUT_COPY, formatAboutDate } from './aboutCopy'
import { CiteBox } from './CiteBox'

export type { CorpusStats }

const VIEWS: Tab[] = ['graph', 'map', 'traditions', 'timeline', 'genealogy', 'ideas']

const CONTACT_NAME = 'Avraham Goldshtein'
const CONTACT_EMAIL = 'avraham.gshtein@gmail.com'

interface AboutContentProps {
  locale: Locale
  stats: CorpusStats
  /** 'tab': inside AppShell's canvas (own scroller, clears the tab bar). 'page': the /about route. */
  variant: 'tab' | 'page'
  /** Tab variant: switch views in place instead of reloading the home page. */
  onOpenTab?: (tab: Tab) => void
}

export function AboutContent({ locale, stats, variant, onOpenTab }: AboutContentProps) {
  const c = ABOUT_COPY[locale]
  const t = UI[locale]
  const isHe = locale === 'he'
  const fmt = (n: number) => n.toLocaleString(locale === 'he' ? 'he-IL' : locale)
  const arrow = isHe ? '←' : '→'

  // The page owns the document's h1; inside the app shell, the header's site
  // title is the h1, so every level here drops by one.
  const H1 = variant === 'page' ? 'h1' : 'h2'
  const H2 = variant === 'page' ? 'h2' : 'h3'
  const H3 = variant === 'page' ? 'h3' : 'h4'

  const figures = [
    { value: stats.sages, label: c.stats.sages },
    { value: stats.withResearch, label: c.stats.research },
    { value: stats.connections, label: c.stats.connections },
    { value: stats.episodes, label: c.stats.episodes },
  ]

  const more = [
    { title: c.listenTitle, body: c.listenBody(fmt(stats.episodes)), icon: <IconHeadphones /> },
    { title: c.askTitle, body: c.askBody, icon: <IconChat /> },
    { title: c.searchTitle, body: c.searchBody, icon: <IconSearch /> },
    { title: c.langsTitle, body: c.langsBody, icon: <IconGlobe /> },
  ]

  const sectionTitle = 'font-serif text-2xl md:text-3xl font-bold text-ink-50'

  const body = (
    <article className={cn('about-content mx-auto max-w-4xl px-4 sm:px-8', variant === 'tab' ? 'pt-10 pb-36' : 'pt-10 md:pt-14 pb-20')}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="text-center animate-fade-in">
        <Image
          src="/images/temple-medallion.png"
          alt=""
          width={112}
          height={112}
          sizes="112px"
          priority={variant === 'page'}
          className="mx-auto h-24 w-24 md:h-28 md:w-28 rounded-full ring-1 ring-gold-500/30 shadow-gold-glow"
        />
        <p className={cn('mt-6 font-sans text-xs font-semibold text-gold-400', !isHe && 'uppercase tracking-[0.18em]')}>
          {c.eyebrow}
        </p>
        <H1 className="mt-2 font-serif text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-gold-300">
          {t.appTitle}
        </H1>
        <p className="mt-5 mx-auto max-w-2xl font-serif text-lg md:text-xl leading-relaxed text-ink-100">
          {c.lede}
        </p>
        <p className="mt-4 mx-auto max-w-2xl font-sans text-sm md:text-base leading-relaxed text-ink-300">
          {c.audience}
        </p>
      </header>

      {/* ── Live figures ─────────────────────────────────────── */}
      <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-2xl border border-gold-500/15 bg-gold-500/10">
        {figures.map(f => (
          <div key={f.label} className="flex flex-col-reverse items-center justify-center gap-1 bg-ink-850 px-3 py-5 text-center">
            <dt className="font-sans text-xs leading-snug text-ink-400">{f.label}</dt>
            <dd className="font-serif text-3xl md:text-4xl font-bold tabular-nums text-gold-300">{fmt(f.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-center font-sans text-xs text-ink-400">
        {c.asOf}{formatAboutDate(new Date(`${stats.asOf}T12:00:00Z`), locale)}
      </p>

      {/* ── The research ─────────────────────────────────────── */}
      <section
        aria-labelledby="about-research"
        className="mt-14 rounded-2xl border border-gold-500/20 bg-gradient-to-b from-gold-500/[0.07] to-transparent p-6 md:p-8"
      >
        <H2 id="about-research" className={sectionTitle}>{c.researchTitle}</H2>
        <p className="mt-4 font-sans text-base leading-relaxed text-ink-200">
          {c.researchBody(fmt(stats.sages), fmt(stats.withResearch))}
        </p>
        <p className="mt-3 font-sans text-sm leading-relaxed text-ink-300">{c.researchHow}</p>
      </section>

      {/* ── Views ────────────────────────────────────────────── */}
      <section aria-labelledby="about-views" className="mt-14">
        <H2 id="about-views" className={sectionTitle}>{c.viewsTitle}</H2>
        <p className="mt-3 font-sans text-base leading-relaxed text-ink-300">{c.viewsIntro}</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VIEWS.map(tab => {
            const meta = TAB_META[tab]
            const label = isHe ? meta.labelHe : locale === 'ru' ? meta.labelRu : meta.labelEn
            const href = tab === 'graph' ? `/${locale}` : `/${locale}?tab=${tab}`
            return (
              <li key={tab}>
                <a
                  href={href}
                  onClick={onOpenTab ? e => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                    e.preventDefault()
                    onOpenTab(tab)
                  } : undefined}
                  className={cn(
                    'group flex h-full flex-col rounded-xl border border-ink-700/60 bg-ink-800/40 p-5',
                    'transition-colors duration-200 hover:border-gold-500/40 hover:bg-ink-800/80',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-gold-500/10 text-base text-gold-400 font-mono"
                    >
                      {meta.icon === 'temple' ? '◆' : meta.icon}
                    </span>
                    <H3 className="font-serif text-lg font-bold text-ink-50">{label}</H3>
                  </div>
                  <p className="mt-3 flex-1 font-sans text-sm leading-relaxed text-ink-300">{c.views[tab]}</p>
                  <span className="mt-4 font-sans text-xs font-semibold text-gold-400">
                    {c.openView} <span aria-hidden className="inline-block transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">{arrow}</span>
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── Listen, ask, search, languages ───────────────────── */}
      <section aria-labelledby="about-more" className="mt-14">
        <H2 id="about-more" className={sectionTitle}>{c.moreTitle}</H2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {more.map(item => (
            <li key={item.title} className="flex gap-4 rounded-xl border border-ink-700/60 p-5">
              <span aria-hidden className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-gold-500/10 text-gold-400">
                {item.icon}
              </span>
              <div>
                <H3 className="font-serif text-lg font-bold text-ink-50">{item.title}</H3>
                <p className="mt-1.5 font-sans text-sm leading-relaxed text-ink-300">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Citation ─────────────────────────────────────────── */}
      <section aria-labelledby="about-cite" className="mt-14">
        <H2 id="about-cite" className={sectionTitle}>{c.citeTitle}</H2>
        <p className="mt-3 font-sans text-base leading-relaxed text-ink-300">{c.citeIntro}</p>
        <CiteBox locale={locale} siteUrl={SITE_URL} />
      </section>

      {/* ── Data and people ──────────────────────────────────── */}
      <div className="mt-14 grid gap-4 md:grid-cols-[3fr_2fr]">
        <section aria-labelledby="about-data" className="rounded-2xl border border-ink-700/60 bg-ink-800/30 p-6">
          <H2 id="about-data" className="font-serif text-xl font-bold text-ink-50">{c.dataTitle}</H2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-ink-300">{c.dataBody}</p>
          <p className="mt-2 font-sans text-sm leading-relaxed text-ink-300">{c.dataDates}</p>
          <p className="mt-4 font-sans text-sm leading-relaxed text-ink-200">
            {c.dataInvite}{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(c.dataSubject)}`}
              className="link-gold font-medium"
              dir="ltr"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>

        <section aria-labelledby="about-credits" className="rounded-2xl border border-ink-700/60 bg-ink-800/30 p-6">
          <H2 id="about-credits" className="font-serif text-xl font-bold text-ink-50">{c.creditsTitle}</H2>
          <p className="mt-3 font-serif text-lg font-bold text-ink-100" lang="en" dir="ltr">
            <bdi>{CONTACT_NAME}</bdi>
          </p>
          <p className="mt-1 font-sans text-sm text-ink-300">{c.creditsRole}</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="link-gold mt-3 inline-block font-sans text-sm" dir="ltr">
            {CONTACT_EMAIL}
          </a>
        </section>
      </div>

      {/* ── Closing ──────────────────────────────────────────── */}
      <footer className="mt-16 text-center">
        <div aria-hidden className="mx-auto mb-6 h-px w-24 bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
        <p className="mx-auto max-w-2xl font-serif text-lg md:text-xl leading-relaxed text-ink-200">{c.spirit}</p>
        <p className="mt-4 font-serif text-base font-bold text-gold-400">{t.appTitle}</p>
      </footer>
    </article>
  )

  if (variant === 'page') return body
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain">
      {body}
    </div>
  )
}

/* ── Icons (stroke, currentColor) ──────────────────────────── */

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
function IconHeadphones() {
  return <Svg><path d="M3 14v-2a9 9 0 0118 0v2" /><path d="M21 14v3a2 2 0 01-2 2h-1v-6h3M3 14v3a2 2 0 002 2h1v-6H3" /></Svg>
}
function IconChat() {
  return <Svg><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.4A8 8 0 1121 12z" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" /></Svg>
}
function IconSearch() {
  return <Svg><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>
}
function IconGlobe() {
  return <Svg><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" /></Svg>
}
