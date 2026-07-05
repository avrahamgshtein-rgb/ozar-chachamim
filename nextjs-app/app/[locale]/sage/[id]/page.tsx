import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchSageById, fetchSageConnections } from '@/lib/supabase'
import { isValidLocale, UI } from '@/lib/i18n'
import { ERA_LABELS, ERA_COLORS, CONNECTION_LABELS } from '@/lib/types'
import { formatYearRange } from '@/lib/utils'
import { EraChip } from '@/components/ui/EraChip'
import type { Locale, Sage } from '@/lib/types'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params
  const sage = await fetchSageById(id).catch(() => null)
  if (!sage) return {}

  const t = UI[(locale as Locale) ?? 'he']
  const title = sage.name_en
    ? `${sage.label} — ${sage.name_en}`
    : sage.label
  const description = sage.bio?.slice(0, 160) ?? `${sage.label} — ${t.appTitle}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
    alternates: {
      canonical: `/${locale}/sage/${id}`,
      languages: {
        he: `/he/sage/${id}`,
        en: `/en/sage/${id}`,
      },
    },
  }
}

function buildJsonLd(sage: Sage, locale: Locale) {
  const era = ERA_LABELS[sage.period]?.[locale] ?? sage.period
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: sage.name_en ?? sage.label,
    alternateName: sage.label,
    description: sage.bio ?? undefined,
    birthDate: sage.birth_year ? String(sage.birth_year) : undefined,
    deathDate: sage.death_year ? String(sage.death_year) : undefined,
    birthPlace: sage.location
      ? { '@type': 'Place', name: sage.location }
      : undefined,
    knowsAbout: sage.field ?? era,
    sameAs: [
      `https://he.wikipedia.org/wiki/${encodeURIComponent(sage.label)}`,
      sage.name_en
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(sage.name_en)}`
        : null,
    ].filter(Boolean),
  }
}

export default async function SagePage({ params }: PageProps) {
  const { locale, id } = await params

  if (!isValidLocale(locale)) notFound()

  const validLocale = locale as Locale
  const t = UI[validLocale]

  const [sage, connections] = await Promise.all([
    fetchSageById(id).catch(() => null),
    fetchSageConnections(id).catch(() => []),
  ])

  if (!sage) notFound()

  const dir        = validLocale === 'he' ? 'rtl' : 'ltr'
  const accentColor = ERA_COLORS[sage.period] ?? '#c9973a'
  const yearRange  = formatYearRange(sage.birth_year, sage.death_year)

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(sage, validLocale)) }}
      />

      <div
        className="min-h-dvh bg-ink-900 text-ink-100 font-sans"
        dir={dir}
        lang={validLocale === 'he' ? 'he' : 'en'}
      >
        {/* Top nav bar */}
        <nav className="sticky top-0 z-10 glass border-b border-gold-500/10 px-4 md:px-8 h-14 flex items-center justify-between gap-4">
          <Link
            href={`/${validLocale}`}
            className="flex items-center gap-2 text-sm font-sans text-ink-400 hover:text-gold-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={validLocale === 'he' ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
            </svg>
            {t.appTitle}
          </Link>

          <Link
            href={`/${validLocale === 'he' ? 'en' : 'he'}/sage/${id}`}
            className="text-xs font-sans text-ink-500 hover:text-ink-300 transition-colors px-3 py-1.5 rounded-lg glass-light border border-ink-700/40"
          >
            {validLocale === 'he' ? 'EN' : 'עב'}
          </Link>
        </nav>

        <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
          {/* ── Hero ──────────────────────────────────────────── */}
          <header
            className="rounded-2xl p-6 md:p-8 mb-8"
            style={{ background: `linear-gradient(135deg, ${accentColor}18 0%, transparent 60%)`,
                     border: `1px solid ${accentColor}25` }}
          >
            <EraChip period={sage.period} locale={validLocale} className="mb-4" />

            <h1 className="font-serif text-3xl md:text-4xl font-bold text-ink-50 leading-tight">
              {sage.label}
            </h1>

            {sage.name_en && (
              <p className="font-sans text-lg text-ink-400 mt-2">{sage.name_en}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm font-sans text-ink-400">
              {yearRange && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {yearRange}
                </span>
              )}
              {sage.location && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {sage.location}
                </span>
              )}
              {sage.field && (
                <span className="text-ink-500">
                  {sage.field}
                </span>
              )}
            </div>

            {/* Tags */}
            {sage.tags && sage.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {sage.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-xs font-sans bg-ink-800/60 text-ink-300 border border-ink-700/40"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* ── Body grid ─────────────────────────────────────── */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Left: main content */}
            <div className="md:col-span-2 space-y-8">

              {/* Core concept */}
              {sage.core_concept && (
                <Section title={t.coreConcept}>
                  <blockquote
                    className="border-s-2 ps-5 py-1 italic font-serif text-base text-ink-100 leading-relaxed"
                    style={{ borderColor: accentColor }}
                  >
                    {sage.core_concept}
                  </blockquote>
                </Section>
              )}

              {/* Biography */}
              {sage.bio && (
                <Section title={t.biography}>
                  <p className="font-sans text-sm text-ink-200 leading-loose whitespace-pre-line">
                    {sage.bio}
                  </p>
                </Section>
              )}

              {/* Migration path */}
              {sage.migration_path && (
                <Section title={t.migrationPath}>
                  <MigrationPath path={sage.migration_path} accentColor={accentColor} />
                </Section>
              )}

              {/* External links */}
              <Section title={t.externalLinks}>
                <div className="flex flex-wrap gap-2">
                  <ExtLink
                    href={`https://www.sefaria.org/search#${encodeURIComponent(sage.name_en ?? sage.label)}`}
                    label="Sefaria" icon="📜"
                  />
                  <ExtLink
                    href={`https://he.wikipedia.org/wiki/${encodeURIComponent(sage.label)}`}
                    label="ויקיפדיה" icon="📖"
                  />
                  {sage.name_en && (
                    <ExtLink
                      href={`https://en.wikipedia.org/wiki/${encodeURIComponent(sage.name_en)}`}
                      label="Wikipedia" icon="🌐"
                    />
                  )}
                  <ExtLink
                    href={`https://www.nli.org.il/find/books?query=${encodeURIComponent(sage.label)}`}
                    label="הספרייה הלאומית" icon="🏛"
                  />
                </div>
              </Section>
            </div>

            {/* Right: connections sidebar */}
            <aside className="space-y-6">
              {connections.length > 0 && (
                <Section title={`${t.relatedSages} (${connections.length})`}>
                  <ul className="space-y-2">
                    {connections.map((conn, idx) => {
                      const other      = conn.otherSage
                      const connLabel  = CONNECTION_LABELS[conn.type]?.[validLocale] ?? conn.type
                      const otherColor = ERA_COLORS[other.period] ?? '#7a6550'
                      return (
                        <li key={idx}>
                          <Link
                            href={`/${validLocale}/sage/${other.id}`}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-ink-800/40 hover:bg-ink-700/50 border border-ink-700/40 hover:border-ink-600/60 transition-all group"
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: otherColor }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-serif text-ink-100 group-hover:text-gold-300 transition-colors truncate">
                                {other.label}
                              </p>
                              {other.name_en && (
                                <p className="text-xs font-sans text-ink-500 truncate">{other.name_en}</p>
                              )}
                            </div>
                            <span
                              className="text-[10px] font-sans px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{ background: `${accentColor}18`, color: accentColor }}
                            >
                              {connLabel}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </Section>
              )}

              {/* Data source badge */}
              <div className="rounded-xl border border-ink-700/40 p-4 bg-ink-800/30">
                <p className="text-[10px] font-sans uppercase tracking-widest text-ink-600 mb-2">
                  {validLocale === 'he' ? 'מקור נתונים' : 'Data Source'}
                </p>
                <p className="text-xs font-sans text-ink-400">
                  {validLocale === 'he'
                    ? 'אוצר חכמים — בסיס הנתונים של חכמי ישראל'
                    : 'Ozar Chachamim — Jewish Sages Knowledge Base'}
                </p>
                <p className="text-xs font-sans text-ink-600 mt-1">
                  ID: {sage.id}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-500 mb-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

function MigrationPath({ path, accentColor }: {
  path: NonNullable<Sage['migration_path']>
  accentColor: string
}) {
  const stops = [path.from, ...(path.intermediate ?? []), path.to]
  return (
    <div className="flex items-center flex-wrap gap-1.5">
      {stops.map((stop, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span
            className="px-3 py-1.5 rounded-lg text-sm font-sans"
            style={i === 0 || i === stops.length - 1
              ? { background: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}44` }
              : { background: 'rgba(42,35,24,0.6)', color: '#9a8570', border: '1px solid rgba(58,50,38,0.5)' }}
          >
            {stop}
          </span>
          {i < stops.length - 1 && (
            <svg className="w-3 h-3 text-ink-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-sans bg-ink-800/50 hover:bg-ink-700/60 text-ink-300 hover:text-ink-100 border border-ink-700/40 hover:border-ink-600/50 transition-all"
    >
      <span>{icon}</span> {label}
    </a>
  )
}
