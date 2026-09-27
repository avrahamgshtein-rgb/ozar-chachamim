import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSageById, getSageConnections, getResearchDocs, hasLocalisedResearch } from '@/lib/serverData'
import { localizeSage, translatedFields } from '@/lib/serverDataTranslator'
import { parseResearchDocs } from '@/lib/researchParse'
import { getSageBreadcrumbSchema, getSageSchema, jsonLdScript } from '@/lib/structuredData'
import { labelParts } from '@/lib/displayName'
import { isValidLocale, UI, LOCALES, LOCALE_SHORT } from '@/lib/i18n'
import { ERA_LABELS, ERA_COLORS } from '@/lib/types'
import { formatYearRangeFor } from '@/lib/utils'
import { EraChip } from '@/components/ui/EraChip'
import { ResearchReader } from '@/components/sages/ResearchReader'
import { RelatedSages, type RelatedPersonView } from '@/components/sages/RelatedSages'
import { groupRelated } from '@/components/sages/relations'
import { SpotifyListen } from '@/components/sages/SpotifyListen'
import { PrintButton, ShareButton, ThemeToggle } from '@/components/sages/PageActions'
import { Toaster } from '@/components/sages/Toast'
import type { Locale, Sage } from '@/lib/types'
import { SITE_URL } from '@/lib/siteUrl'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

// Page strings not in lib/i18n's UI dictionary.
const S = {
  related: { he: 'חכמים קשורים', en: 'Related sages', ru: 'Связанные мудрецы' },
  showInGraph: { he: 'הצגה ברשת הקשרים', en: 'Show in the network', ru: 'Показать в сети' },
  readResearch: { he: 'לקריאת המחקר', en: 'Read the research', ru: 'Читать исследование' },
  minRead: { he: 'דק׳', en: 'min', ru: 'мин' },
  back: { he: 'חזרה לאוצר חכמים', en: 'Back to Ozar Chachamim', ru: 'Назад в Озар Хахамим' },
  breadcrumbs: { he: 'פירורי לחם', en: 'Breadcrumbs', ru: 'Навигационная цепочка' },
  language: { he: 'שפה', en: 'Language', ru: 'Язык' },
  dataSource: { he: 'מקור הנתונים', en: 'Data source', ru: 'Источник данных' },
  dataSourceText: {
    he: 'אוצר חכמים — בסיס הנתונים של חכמי ישראל',
    en: 'Ozar Chachamim — Jewish Sages Knowledge Base',
    ru: 'Озар Хахамим — база знаний о мудрецах Израиля',
  },
  untranslated: {
    he: '',
    en: 'This profile has not been translated yet; the text below is in Hebrew.',
    ru: 'Этот профиль ещё не переведён; текст ниже — на иврите.',
  },
  wikipedia: { he: 'ויקיפדיה', en: 'Wikipedia (he)', ru: 'Википедия (иврит)' },
  nli: { he: 'הספרייה הלאומית', en: 'National Library of Israel', ru: 'Национальная библиотека Израиля' },
} satisfies Record<string, Record<Locale, string>>

const OG_LOCALES: Record<Locale, string> = { he: 'he_IL', en: 'en_US', ru: 'ru_RU' }

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? flat.slice(0, max - 1).trimEnd() + '…' : flat
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params
  const raw = getSageById(id)
  if (!raw) notFound()

  const loc = (isValidLocale(locale) ? locale : 'he') as Locale
  const sage = localizeSage(raw, loc)
  const { name, tagline } = labelParts(sage.label)
  const era = ERA_LABELS[sage.period]?.[loc] ?? sage.period
  const years = formatYearRangeFor(loc, sage.birth_year, sage.death_year, sage.date_precision)
  const title = loc === 'he' && raw.name_en ? `${name} — ${raw.name_en}` : name
  // A Hebrew bio is no description for an English or Russian page.
  const bioIsLocal = loc === 'he' || translatedFields(raw.id, loc).has('bio')
  const summary = [name, tagline, era, years].filter(Boolean).join(' · ')
  const description = clip((bioIsLocal && (sage.bio || sage.core_concept)) || `${summary} — ${UI[loc].appTitle}`, 160)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      locale: OG_LOCALES[loc],
      url: `${SITE_URL}/${loc}/sage/${id}`,
    },
    alternates: {
      canonical: `/${loc}/sage/${id}`,
      languages: {
        he: `/he/sage/${id}`,
        en: `/en/sage/${id}`,
        ru: `/ru/sage/${id}`,
        'x-default': `/he/sage/${id}`,
      },
    },
  }
}

export default async function SagePage({ params }: PageProps) {
  const { locale, id } = await params
  if (!isValidLocale(locale)) notFound()
  const loc = locale as Locale
  const t = UI[loc]

  const raw = getSageById(id)
  if (!raw) notFound()
  const sage = localizeSage(raw, loc)
  const connections = getSageConnections(raw.id)

  // Research is resolved and parsed on the server, so the full text ships in
  // the initial HTML. getResearchDocs prefers <id>.<locale>.json and falls
  // back to Hebrew.
  const researchDocs = parseResearchDocs(await getResearchDocs(raw.id, loc))
  const researchIsFallback =
    loc !== 'he' && researchDocs.length > 0 && !(await hasLocalisedResearch(raw.id, loc))

  const dir = loc === 'he' ? 'rtl' : 'ltr'
  const accent = ERA_COLORS[sage.period] ?? '#c9973a'
  const { name, tagline, fullName } = labelParts(sage.label)
  const era = ERA_LABELS[sage.period]?.[loc] ?? sage.period
  const yearRange = formatYearRangeFor(loc, sage.birth_year, sage.death_year, sage.date_precision)
  const pageUrl = `${SITE_URL}/${loc}/sage/${raw.id}`
  const researchMinutes = researchDocs.reduce((n, d) => n + d.readingMinutes, 0)
  const untranslated = loc !== 'he' && translatedFields(raw.id, loc).size === 0 && !raw.name_en

  // Related sages, grouped by how they stand to this one (link direction matters).
  const people = new Map<string, RelatedPersonView>()
  for (const c of connections) {
    const other = localizeSage(c.otherSage, loc)
    people.set(other.id, {
      id: other.id,
      label: other.label,
      name: labelParts(other.label).name,
      name_en: loc === 'he' ? other.name_en : undefined,
      period: other.period,
      birth_year: other.birth_year,
    })
  }
  const related = groupRelated(raw.id, connections, otherId => people.get(otherId))
  const relatedCount = related.reduce((n, g) => n + g.people.length, 0)

  const jsonLd = jsonLdScript(
    getSageSchema(sage, loc, {
      url: pageUrl,
      // On en/ru pages the Hebrew name is an alternate name too.
      alternateNames: loc !== 'he' ? [labelParts(raw.label).name] : [],
      research: researchDocs.map(d => ({ title: d.title, wordCount: d.wordCount, inLanguage: d.dir === 'rtl' ? 'he' : loc === 'he' ? 'en' : loc })),
    }),
    getSageBreadcrumbSchema(loc, {
      home: t.appTitle,
      era: { name: era, period: sage.period },
      sage: { name, url: pageUrl },
    }),
  )

  const searchName = labelParts(raw.label).name

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <div id="sage-scroll" className="sage-page h-dvh overflow-y-auto scroll-smooth bg-ink-900 font-sans text-ink-100" dir={dir} lang={loc}>
        {/* ── Top bar ─────────────────────────────────────────── */}
        <nav className="no-print sticky top-0 z-40 glass border-x-0 border-t-0 border-b border-gold-500/10">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-8">
            <Link href={`/${loc}`} aria-label={S.back[loc]}
              className="flex h-9 flex-shrink-0 items-center gap-2 rounded-lg px-1.5 text-sm text-ink-300 transition-colors hover:text-gold-300">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={dir === 'rtl' ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
              </svg>
              <span className="font-serif font-semibold text-gold-300 sm:inline hidden">{t.appTitle}</span>
            </Link>

            <ol aria-label={S.breadcrumbs[loc]} className="hidden min-w-0 items-center gap-1.5 text-xs text-ink-500 md:flex">
              <li aria-hidden className="text-ink-600">/</li>
              <li>
                <Link href={`/${loc}?periods=${sage.period}`} className="whitespace-nowrap hover:text-gold-300">{era}</Link>
              </li>
              <li aria-hidden className="text-ink-600">/</li>
              <li aria-current="page" dir="auto" className="truncate text-ink-300">{name}</li>
            </ol>

            <div className="ms-auto flex flex-shrink-0 items-center gap-1.5">
              <ShareButton title={name} text={tagline ?? undefined} locale={loc} />
              <span className="hidden sm:contents"><PrintButton locale={loc} /></span>
              <ThemeToggle locale={loc} />
              <div role="group" aria-label={S.language[loc]} className="ms-1 flex h-9 items-center rounded-lg border border-ink-700/50 bg-ink-800/40 p-0.5 text-[11px]">
                {LOCALES.map(l => (
                  <Link key={l} href={`/${l}/sage/${raw.id}`} hrefLang={l} lang={l}
                    aria-current={l === loc ? 'page' : undefined}
                    className={`flex h-full items-center rounded-md px-2 transition-colors ${
                      l === loc ? 'bg-gold-500/20 font-semibold text-gold-300' : 'text-ink-400 hover:text-ink-100'
                    }`}>
                    {LOCALE_SHORT[l]}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pb-16 pt-6 outline-none md:px-8 md:pt-10">
          {/* ── Hero ──────────────────────────────────────────── */}
          <header
            className="sage-hero relative overflow-hidden rounded-3xl border p-6 md:p-10"
            style={{
              borderColor: `${accent}33`,
              background: `radial-gradient(120% 140% at ${dir === 'rtl' ? '100%' : '0%'} 0%, ${accent}24 0%, transparent 58%)`,
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <EraChip period={sage.period} locale={loc} />
              {yearRange && (
                <MetaChip icon="calendar">{yearRange}</MetaChip>
              )}
              {sage.location && (
                <MetaChip icon="pin">{sage.location}</MetaChip>
              )}
            </div>

            <h1 dir="auto" className="mt-5 font-serif text-[2.1rem] font-bold leading-[1.12] tracking-tight text-ink-50 [overflow-wrap:anywhere] md:text-5xl">
              {name}
            </h1>
            {fullName && (
              <p dir="auto" className="mt-2 font-serif text-lg text-ink-300 md:text-xl">({fullName})</p>
            )}
            {tagline && (
              <p dir="auto" className="mt-3 max-w-3xl font-serif text-lg italic leading-relaxed text-ink-300 md:text-xl">{tagline}</p>
            )}
            {loc === 'he' && raw.name_en && (
              <p className="mt-2 font-sans text-base text-ink-400" dir="ltr">{raw.name_en}</p>
            )}
            {sage.field && (
              <p dir="auto" className="mt-4 font-sans text-sm text-ink-400">{sage.field}</p>
            )}

            {sage.tags && sage.tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {sage.tags.map(tag => (
                  <li key={tag} dir="auto" className="rounded-full border border-ink-700/40 bg-ink-800/60 px-2.5 py-0.5 text-xs text-ink-300">{tag}</li>
                ))}
              </ul>
            )}

            <div className="no-print mt-6 flex flex-wrap gap-2">
              {researchDocs.length > 0 && (
                <a href="#research"
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:brightness-125"
                  style={{ borderColor: `${accent}66`, background: `${accent}22` }}>
                  <svg className="h-4 w-4 text-gold-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
                  </svg>
                  <span className="text-ink-50">{S.readResearch[loc]}</span>
                  <span className="text-xs text-ink-400">· {researchMinutes} {S.minRead[loc]}</span>
                </a>
              )}
              <Link href={`/${loc}?sage=${raw.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-ink-700/50 bg-ink-800/40 px-4 py-2 text-sm text-ink-200 transition-colors hover:border-gold-500/40 hover:text-gold-300">
                <span aria-hidden className="font-mono text-xs">⬡</span>
                {S.showInGraph[loc]}
              </Link>
            </div>
          </header>

          {untranslated && S.untranslated[loc] && (
            <p className="mt-4 rounded-lg border border-ink-700/40 bg-ink-800/40 px-3 py-2 text-xs text-ink-400">{S.untranslated[loc]}</p>
          )}

          {/* ── Listen + overview + related ───────────────────── */}
          <div className={`mt-8 grid grid-cols-1 gap-8 lg:gap-12 ${relatedCount > 0 ? 'lg:grid-cols-[minmax(0,1fr)_20rem]' : 'max-w-4xl'}`}>
            <div className="min-w-0 space-y-8">
              {sage.spotify_url && (
                <div id="listen" className="scroll-mt-20">
                  <SpotifyListen url={sage.spotify_url} locale={loc} name={name} />
                </div>
              )}

              {sage.core_concept && (
                <Section title={t.coreConcept}>
                  <blockquote dir="auto" className="border-s-[3px] ps-5 py-1 font-serif text-lg italic leading-relaxed text-ink-100 md:text-xl" style={{ borderColor: accent }}>
                    {sage.core_concept}
                  </blockquote>
                </Section>
              )}

              {sage.bio && (
                <Section title={t.biography}>
                  <p dir="auto" className="whitespace-pre-line text-[15px] leading-loose text-ink-200">{sage.bio}</p>
                </Section>
              )}

              {sage.works && sage.works.length > 0 && (
                <Section title={t.works}>
                  <ul className="flex flex-wrap gap-2">
                    {sage.works.map(work => (
                      <li key={work}>
                        <a href={`https://www.sefaria.org/search?q=${encodeURIComponent(work)}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700/40 bg-ink-800/60 px-3 py-1.5 text-sm text-ink-200 transition-colors hover:border-gold-500/30 hover:text-gold-300">
                          <span aria-hidden>📖</span>{work}
                        </a>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {sage.migration_path && (
                <Section title={t.migrationPath}>
                  <MigrationPath path={sage.migration_path} accentColor={accent} />
                </Section>
              )}
            </div>

            {relatedCount > 0 && (
              <aside className="min-w-0">
                <section aria-labelledby="related-title" className="rounded-2xl border border-ink-700/40 bg-ink-800/25 p-4 md:p-5">
                  <h2 id="related-title" className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
                    {S.related[loc]}
                    <span className="rounded-full bg-ink-700/60 px-1.5 text-[10px] tabular-nums text-ink-300">{relatedCount}</span>
                  </h2>
                  <RelatedSages groups={related} locale={loc} hrefFor={otherId => `/${loc}/sage/${otherId}`} />
                </section>
              </aside>
            )}
          </div>

          {/* ── Full research ─────────────────────────────────── */}
          {researchDocs.length > 0 && (
            <div className="mt-14 border-t border-ink-700/40 pt-10 md:mt-16">
              <ResearchReader docs={researchDocs} locale={loc} isFallback={researchIsFallback} />
            </div>
          )}

          {/* ── Elsewhere ─────────────────────────────────────── */}
          <footer className="mt-16 grid gap-6 border-t border-ink-700/40 pt-8 md:grid-cols-[minmax(0,1fr)_auto]">
            <Section title={t.externalLinks}>
              <div className="flex flex-wrap gap-2">
                <ExtLink href={`https://www.sefaria.org/search?q=${encodeURIComponent(raw.name_en ?? searchName)}`} label="Sefaria" icon="📜" />
                <ExtLink href={`https://he.wikipedia.org/w/index.php?search=${encodeURIComponent(searchName)}`} label={S.wikipedia[loc]} icon="📖" />
                {raw.name_en && (
                  <ExtLink href={`https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(raw.name_en)}`} label="Wikipedia" icon="🌐" />
                )}
                <ExtLink href={`https://www.nli.org.il/find/books?query=${encodeURIComponent(searchName)}`} label={S.nli[loc]} icon="🏛" />
              </div>
            </Section>
            <div className="text-xs text-ink-500 md:text-end">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-ink-600">{S.dataSource[loc]}</p>
              <p className="text-ink-400">{S.dataSourceText[loc]}</p>
              <p className="mt-1 tabular-nums text-ink-600">ID {raw.id}</p>
            </div>
          </footer>
        </main>
        <Toaster />
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-sans font-semibold uppercase tracking-widest text-ink-500">{title}</h2>
      {children}
    </section>
  )
}

function MetaChip({ icon, children }: { icon: 'calendar' | 'pin'; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-ink-700/50 bg-ink-800/50 px-3 py-1 text-xs text-ink-300">
      <svg className="h-3.5 w-3.5 flex-shrink-0 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        {icon === 'calendar' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        ) : (
          <>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </>
        )}
      </svg>
      <span dir="auto" className="truncate">{children}</span>
    </span>
  )
}

function MigrationPath({ path, accentColor }: { path: NonNullable<Sage['migration_path']>; accentColor: string }) {
  const stops = [path.from, ...(path.intermediate ?? []), path.to]
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stops.map((stop, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span
            className={`rounded-lg px-3 py-1.5 text-sm ${i === 0 || i === stops.length - 1 ? '' : 'border border-ink-700/50 bg-ink-800/60 text-ink-300'}`}
            style={i === 0 || i === stops.length - 1
              ? { background: `${accentColor}22`, border: `1px solid ${accentColor}55` }
              : undefined}
          >
            {stop}
          </span>
          {i < stops.length - 1 && (
            <svg className="h-3 w-3 flex-shrink-0 text-ink-600 rtl:-scale-x-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </span>
      ))}
    </div>
  )
}

function ExtLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-ink-700/40 bg-ink-800/50 px-3 py-2 text-sm text-ink-300 transition-colors hover:border-ink-600/50 hover:bg-ink-700/60 hover:text-ink-100">
      <span aria-hidden>{icon}</span> {label}
    </a>
  )
}
