'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { formatYearRange } from '@/lib/utils'
import { EraChip } from '@/components/ui/EraChip'
import { CONNECTION_LABELS, ERA_COLORS } from '@/lib/types'
import type { Sage, Connection, Locale } from '@/lib/types'
import { UI } from '@/lib/i18n'
import { useAppStore } from '@/store/useAppStore'
import { fetchResearchContent } from '@/lib/supabase'
import { ReadingControls, useReadingPrefs, readingStyle } from '@/components/ui/ReadingControls'

interface SageCardProps {
  sage: Sage
  locale: Locale
  onClose: () => void
}

export function SageCard({ sage, locale, onClose }: SageCardProps) {
  const t = UI[locale]
  const { connections, sageMap, selectSage, openComparator, setActiveTab, activeTab } = useAppStore()
  const [research, setResearch] = useState<string | null>(null)
  const [researchOpen, setResearchOpen] = useState(false)
  const [readingPrefs, setReadingPrefs] = useReadingPrefs()

  useEffect(() => {
    setResearch(null)
    setResearchOpen(false)
    fetchResearchContent(sage.id).then(setResearch)
  }, [sage.id])

  const sageConnections: Array<Connection & { otherSage: Sage | undefined }> =
    connections
      .filter(c => c.source === sage.id || c.target === sage.id)
      .map(c => {
        const otherId = c.source === sage.id ? c.target : c.source
        return { ...c, otherSage: sageMap.get(otherId) }
      })
      .filter(c => c.otherSage)
      .slice(0, 12)

  const accentColor = ERA_COLORS[sage.period] ?? '#c9973a'
  const yearRange   = formatYearRange(sage.birth_year, sage.death_year)

  return (
    <article className="flex flex-col h-full overflow-hidden">
      {/* Hero header */}
      <header
        className="relative px-6 pt-8 pb-6 flex-shrink-0"
        style={{
          background: `linear-gradient(to bottom, ${accentColor}18 0%, transparent 100%)`,
          borderBottom: `1px solid ${accentColor}22`,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 text-ink-500 hover:text-ink-100 transition-colors p-1.5 rounded-lg hover:bg-ink-700/50"
          aria-label={t.close}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Era chip */}
        <EraChip period={sage.period} locale={locale} className="mb-3" />

        {/* Name */}
        <h1 className="font-serif text-2xl font-bold text-ink-50 leading-tight">
          {sage.label}
        </h1>
        {sage.name_en && (
          <p className="font-sans text-sm text-ink-300 mt-1">{sage.name_en}</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
          {yearRange && (
            <span className="text-xs font-sans text-ink-400">
              {yearRange}
            </span>
          )}
          {sage.location && (
            <>
              <span className="text-ink-700" aria-hidden>·</span>
              <span className="flex items-center gap-1 text-xs font-sans text-ink-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {sage.location}
              </span>
            </>
          )}
          {sage.field && (
            <>
              <span className="text-ink-700" aria-hidden>·</span>
              <span className="text-xs font-sans text-ink-400">{sage.field}</span>
            </>
          )}
        </div>

        {/* Tags */}
        {sage.tags && sage.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {sage.tags.slice(0, 5).map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-xs font-sans bg-ink-700/60 text-ink-300 border border-ink-600/40"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Cross-view sync: jump to this sage in other tabs */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {activeTab !== 'graph' && (
            <CrossViewBtn onClick={() => setActiveTab('graph')} icon="⬡"
              label={locale === 'he' ? 'הצג ברשת' : 'Show in network'} />
          )}
          {activeTab !== 'map' && (
            <CrossViewBtn onClick={() => setActiveTab('map')} icon="◎"
              label={locale === 'he' ? 'הצג במפה' : 'Show on map'} />
          )}
          {activeTab !== 'timeline' && (
            <CrossViewBtn onClick={() => setActiveTab('timeline')} icon="▷"
              label={locale === 'he' ? 'הצג בציר הזמן' : 'Show on timeline'} />
          )}
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Core concept */}
        {sage.core_concept && (
          <section>
            <SectionLabel>{t.coreConcept}</SectionLabel>
            <blockquote
              className="border-s-2 ps-4 py-1 italic text-sm text-ink-200 font-serif leading-relaxed"
              style={{ borderColor: accentColor }}
            >
              {sage.core_concept}
            </blockquote>
          </section>
        )}

        {/* Biography */}
        {sage.bio && (
          <section>
            <SectionLabel>{t.biography}</SectionLabel>
            <p className="text-sm font-sans text-ink-200 leading-relaxed">
              {sage.bio}
            </p>
          </section>
        )}

        {/* Research content (lazy-loaded from Supabase) */}
        {research && (
          <section>
            <div className="flex items-center justify-between gap-2 mb-1">
              <button
                onClick={() => setResearchOpen(o => !o)}
                className="flex items-center gap-2 text-start group"
              >
                <SectionLabel>
                  {locale === 'he' ? 'מחקר מורחב' : 'Research'}
                </SectionLabel>
                <span className="text-ink-600 text-xs mb-2">{researchOpen ? '▾' : '▸'}</span>
              </button>
              {researchOpen && (
                <ReadingControls prefs={readingPrefs} onChange={setReadingPrefs} locale={locale} />
              )}
            </div>
            {researchOpen && (
              <p
                className="text-sm text-ink-300 whitespace-pre-wrap"
                style={readingStyle(readingPrefs)}
              >
                {research}
              </p>
            )}
          </section>
        )}

        {/* Migration path */}
        {sage.migration_path && (
          <section>
            <SectionLabel>{t.migrationPath}</SectionLabel>
            <MigrationViz path={sage.migration_path} />
          </section>
        )}

        {/* Related sages */}
        {sageConnections.length > 0 && (
          <section>
            <SectionLabel>{t.relatedSages} ({sageConnections.length})</SectionLabel>
            <ul className="space-y-1.5">
              {sageConnections.map((conn, idx) => {
                const other = conn.otherSage!
                const connType = conn.type
                const connLabel = CONNECTION_LABELS[connType]?.[locale] ?? connType
                const isSource = conn.source === sage.id
                const otherColor = ERA_COLORS[other.period] ?? '#7a6550'

                return (
                  <li key={idx}>
                    <button
                      onClick={() => selectSage(other)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-start',
                        'bg-ink-800/40 hover:bg-ink-700/50 border border-ink-700/40',
                        'transition-colors group',
                      )}
                    >
                      <span
                        className="era-dot flex-shrink-0"
                        style={{ background: otherColor }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-serif text-ink-100 group-hover:text-gold-300 transition-colors truncate block">
                          {other.label}
                        </span>
                        {other.name_en && (
                          <span className="text-xs font-sans text-ink-400 truncate block">
                            {other.name_en}
                          </span>
                        )}
                      </span>
                      <span
                        className="text-xs font-sans px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: `${accentColor}18`,
                          color: accentColor,
                          border: `1px solid ${accentColor}33`,
                        }}
                      >
                        {isSource ? '← ' : ''}{connLabel}{!isSource ? ' →' : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* External links */}
        <section>
          <SectionLabel>{t.externalLinks}</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {sage.spotify_url && (
              <a
                href={sage.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans transition-all duration-150 border"
                style={{ background: '#1DB95418', borderColor: '#1DB95444', color: '#1DB954' }}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                {locale === 'he' ? 'פודקאסט' : 'Podcast'}
              </a>
            )}
            <ExternalLink
              href={`https://www.sefaria.org/search#${encodeURIComponent(sage.name_en ?? sage.label)}`}
              label="Sefaria"
              icon="📜"
            />
            <ExternalLink
              href={`https://he.wikipedia.org/wiki/${encodeURIComponent(sage.label)}`}
              label="ויקיפדיה"
              icon="📖"
            />
            <ExternalLink
              href={`https://www.nli.org.il/find/books?query=${encodeURIComponent(sage.label)}`}
              label="הספרייה הלאומית"
              icon="🏛"
            />
          </div>
        </section>
      </div>

      {/* Footer actions */}
      <footer className="flex-shrink-0 px-6 py-4 border-t border-ink-700/40 flex gap-2">
        {/* Full detail page link */}
        <Link
          href={`/${locale}/sage/${sage.id}`}
          className={cn(
            'flex-1 py-2.5 rounded-xl text-sm font-sans font-medium text-center',
            'border transition-all duration-200 hover:shadow-gold-glow',
          )}
          style={{
            background: `${accentColor}18`,
            borderColor: `${accentColor}44`,
            color: accentColor,
          }}
        >
          {locale === 'he' ? 'דף מלא' : 'Full Profile'}
        </Link>

        {/* Compare button */}
        <button
          onClick={() => openComparator(sage)}
          aria-label={locale === 'he' ? 'השווה' : 'Compare'}
          title={locale === 'he' ? 'השווה עם חכם אחר' : 'Compare with another sage'}
          className="px-3 py-2.5 rounded-xl border border-ink-700/40 text-ink-400 hover:text-gold-300 hover:border-gold-500/40 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </button>

        {/* Print */}
        <button
          aria-label={t.exportPDF}
          className="px-3 py-2.5 rounded-xl border border-ink-700/40 text-ink-400 hover:text-ink-200 hover:border-ink-600/60 transition-all"
          onClick={() => window.print()}
          title={t.exportPDF}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </button>
      </footer>
    </article>
  )
}

function CrossViewBtn({ onClick, icon, label }: {
  onClick: () => void; icon: string; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-sans',
        'bg-ink-800/50 hover:bg-ink-700/60 text-ink-300 hover:text-gold-300',
        'border border-ink-700/40 hover:border-gold-500/30',
        'transition-all duration-150',
      )}
    >
      <span className="font-mono text-[11px]" aria-hidden>{icon}</span>
      {label}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-sans font-semibold uppercase tracking-widest text-ink-500 mb-2">
      {children}
    </p>
  )
}

function MigrationViz({ path }: { path: NonNullable<Sage['migration_path']> }) {
  const stops = [path.from, ...(path.intermediate ?? []), path.to]

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stops.map((stop, idx) => (
        <div key={idx} className="flex items-center gap-1">
          <span
            className={cn(
              'px-2 py-1 rounded text-xs font-sans',
              idx === 0 || idx === stops.length - 1
                ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30'
                : 'bg-ink-700/50 text-ink-300 border border-ink-600/40',
            )}
          >
            {stop}
          </span>
          {idx < stops.length - 1 && (
            <svg className="w-3 h-3 text-ink-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      ))}
    </div>
  )
}

function ExternalLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans',
        'bg-ink-800/60 hover:bg-ink-700/70 text-ink-300 hover:text-ink-100',
        'border border-ink-700/40 hover:border-ink-600/60',
        'transition-all duration-150',
      )}
    >
      <span>{icon}</span>
      {label}
    </a>
  )
}
