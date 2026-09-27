'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { ALL_PERIODS, ERA_COLORS, ERA_LABELS, REGION_COLORS, REGION_LABELS } from '@/lib/types'
import type { Locale, Period, Region, Sage } from '@/lib/types'
import { resolveSchools } from '@/lib/schools'
import type { L10n, ResolvedSchool, SchoolRelation } from '@/lib/schools'
import { displayName } from '@/lib/displayName'
import { cn, formatYear, formatYearRangeFor } from '@/lib/utils'
import { tr } from '@/lib/i18n'

/**
 * "בתי מדרש ומסורות" — schools of thought and centres of learning.
 *
 * The curated schools (lib/schools.ts) are resolved by name against the
 * loaded sages, then shown as cards on one shared time axis, with a small
 * "family map" of how they relate. Local filters (era range, region) narrow
 * the cards; the store's global filters never hide a school, they only dim
 * the members they exclude. "Show on the network" focuses the school's
 * members on the graph through the store's `group` filter.
 */

// ── Shared time axis ──────────────────────────────────────────────────────
// Piecewise linear: on the cards -100…1000 takes the first 30% and 1000…2030
// the rest, so the medieval and modern schools (most of them) can be told
// apart. Every axis draws its ticks, so the compression is visible.
type Stops = [year: number, at: number][]
const CARD_STOPS: Stops = [[-100, 0], [1000, 0.3], [2030, 1]]
/** The map is wider and its modern schools cluster, so it spreads 1500+ further. */
const MAP_STOPS: Stops = [[-100, 0], [1000, 0.2], [1500, 0.45], [2030, 1]]
const BREAK_AT = 0.3
const THIS_YEAR = new Date().getFullYear()

function scaleX(year: number, stops: Stops = CARD_STOPS): number {
  const y = Math.min(stops[stops.length - 1][0], Math.max(stops[0][0], year))
  for (let i = 1; i < stops.length; i++) {
    const [y1, a1] = stops[i]
    if (y <= y1) {
      const [y0, a0] = stops[i - 1]
      return a0 + ((y - y0) / (y1 - y0)) * (a1 - a0)
    }
  }
  return 1
}
const axisX = (year: number) => scaleX(year, CARD_STOPS)

const CARD_TICKS = [0, 500, 1000, 1500, 2000]
const MAP_TICKS = [0, 500, 1000, 1200, 1400, 1500, 1600, 1700, 1800, 1900, 2000]

/** Conventional era windows (as in the timeline), for the axis tint. */
const ERA_WINDOW: Partial<Record<Period, [number, number]>> = {
  'second-temple': [-516, 70],
  tannaim: [10, 220],
  amoraim: [220, 500],
  geonim: [589, 1038],
  rishonim: [1038, 1500],
  acharonim: [1500, 1880],
  modern: [1880, 2030],
}

const REGION_ORDER: Region[] = [
  'eretz-israel', 'mizrach', 'sefarad', 'provence', 'tsarfat', 'ashkenaz',
  'italy', 'east-europe', 'north-africa', 'other',
]

const REL_COLOR: Record<SchoolRelation, string> = {
  influenced: 'rgb(var(--gold-500-rgb))',
  grewOutOf: '#3fa876',
  opposed: '#d9574c',
}

/** Visible founders/members before "+N more". */
const CHIPS_COLLAPSED = 8

// ── Copy ──────────────────────────────────────────────────────────────────

const t = (locale: Locale, s: L10n) => s[locale]

/** Russian plural: 1 мудрец, 3 мудреца, 5 мудрецов. */
function ruPlural(n: number, one: string, few: string, many: string): string {
  const d = n % 10, h = n % 100
  if (d === 1 && h !== 11) return one
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few
  return many
}

const S = {
  title:        { he: 'בתי מדרש ומסורות', en: 'Schools and Centres of Learning', ru: 'Школы и центры учёности' },
  axisNote:     { he: 'ציר הזמן אינו אחיד: המאות הקדומות דחוסות', en: 'Time axis not to scale: earlier centuries are compressed', ru: 'Шкала времени неравномерна: ранние века сжаты' },
  era:          { he: 'תקופה', en: 'Era', ru: 'Эпоха' },
  region:       { he: 'אזור', en: 'Region', ru: 'Регион' },
  all:          { he: 'הכל', en: 'All', ru: 'Все' },
  rangeHint:    { he: 'בחרו תקופה נוספת כדי ליצור טווח', en: 'Pick a second era to make a range', ru: 'Выберите вторую эпоху, чтобы задать диапазон' },
  reset:        { he: 'נקה', en: 'Reset', ru: 'Сбросить' },
  none:         { he: 'אין בתי מדרש שמתאימים לסינון', en: 'No schools match these filters', ru: 'Нет школ, подходящих под фильтры' },
  founders:     { he: 'מייסדים', en: 'Founders', ru: 'Основатели' },
  members:      { he: 'חכמים', en: 'Members', ru: 'Представители' },
  keyIdeas:     { he: 'רעיונות מרכזיים', en: 'Key ideas', ru: 'Ключевые идеи' },
  related:      { he: 'קשרים', en: 'Connections', ru: 'Связи' },
  showOnGraph:  { he: 'הצג ברשת הקשרים', en: 'Show on the network', ru: 'Показать на графе' },
  focused:      { he: 'ממוקד ברשת', en: 'Focused on the network', ru: 'Выделено на графе' },
  clearFocus:   { he: 'בטל מיקוד', en: 'Clear focus', ru: 'Снять выделение' },
  less:         { he: 'הצג פחות', en: 'Show less', ru: 'Свернуть' },
  clearGlobal:  { he: 'נקה סינון כללי', en: 'Clear filters', ru: 'Сбросить фильтры' },
  dimmed:       { he: 'מחוץ לסינון הנוכחי', en: 'Outside the current filters', ru: 'Вне текущих фильтров' },
  mapTitle:     { he: 'מפת המשפחות', en: 'Family map', ru: 'Карта родства' },
  mapHint:      { he: 'מי צמח מתוך מי, מי השפיע על מי ומי נאבק במי. בחירה באסכולה מובילה לכרטיס שלה.', en: 'Who grew out of whom, who influenced whom, and who opposed whom. Select a school to jump to its card.', ru: 'Кто из кого вырос, кто на кого повлиял и кто с кем спорил. Выберите школу, чтобы перейти к её карточке.' },
  mapShow:      { he: 'הצג', en: 'Show', ru: 'Показать' },
  mapHide:      { he: 'הסתר', en: 'Hide', ru: 'Скрыть' },
  loading:      { he: 'טוען בתי מדרש…', en: 'Loading schools…', ru: 'Загрузка школ…' },
  present:      { he: 'היום', en: 'present', ru: 'наши дни' },
  approx:       { he: 'כ־', en: 'c. ', ru: 'ок. ' },
  ce:           { he: ' לספירה', en: ' CE', ru: ' н. э.' },
} satisfies Record<string, L10n>

const REL_LEGEND: Record<SchoolRelation, L10n> = {
  influenced: { he: 'השפעה', en: 'Influence', ru: 'Влияние' },
  grewOutOf:  { he: 'צמיחה מתוך', en: 'Grew out of', ru: 'Выросла из' },
  opposed:    { he: 'פולמוס', en: 'Opposition', ru: 'Противостояние' },
}

/** Labels for a relation as seen from the listing school (out) or the listed one (in). */
const REL_OUT: Record<SchoolRelation, L10n> = {
  influenced: { he: 'השפעה על', en: 'Influenced', ru: 'Влияние на' },
  grewOutOf:  { he: 'שורשים', en: 'Grew out of', ru: 'Истоки' },
  opposed:    { he: 'פולמוס עם', en: 'Opposed', ru: 'Полемика с' },
}
const REL_IN: Record<SchoolRelation, L10n> = {
  influenced: { he: 'בהשפעת', en: 'Influenced by', ru: 'Под влиянием' },
  grewOutOf:  { he: 'ענפים', en: 'Gave rise to', ru: 'Ответвления' },
  opposed:    { he: 'פולמוס עם', en: 'Opposed by', ru: 'Полемика с' },
}

function leadText(locale: Locale, schools: number, people: number): string {
  return tr(locale,
    `${schools} אסכולות ומרכזי לימוד לאורך אלפיים שנה, ו־${people} מחכמי המאגר שהשתייכו אליהם. כל כרטיס ממקם את האסכולה על ציר זמן משותף.`,
    `${schools} schools of thought and centres of learning across two thousand years, and the ${people} sages in this collection who belonged to them. Each card sets its school on a shared time axis.`,
    `${schools} ${ruPlural(schools, 'школа', 'школы', 'школ')} и центров учёности за две тысячи лет и ${people} ${ruPlural(people, 'мудрец', 'мудреца', 'мудрецов')} из нашего собрания, связанных с ними. Каждая карточка помещает школу на общую шкалу времени.`)
}

function showingText(locale: Locale, k: number, n: number): string {
  return tr(locale, `מוצגים ${k} מתוך ${n}`, `Showing ${k} of ${n}`, `Показано ${k} из ${n}`)
}

function peopleText(locale: Locale, n: number, inFilter: number | null): string {
  if (inFilter != null) {
    return tr(locale, `${inFilter} מתוך ${n} בסינון`, `${inFilter} of ${n} in the current filter`, `${inFilter} из ${n} в текущем фильтре`)
  }
  return tr(locale, `${n} חכמים במאגר`, `${n} sages in the collection`, `${n} ${ruPlural(n, 'мудрец', 'мудреца', 'мудрецов')} в собрании`)
}

function moreText(locale: Locale, n: number): string {
  return tr(locale, `+${n} נוספים`, `+${n} more`, `ещё ${n}`)
}

function globalNotice(locale: Locale, k: number, n: number): string {
  return tr(locale,
    `סינון כללי פעיל: ${k} מתוך ${n} חכמים. חכמים שמחוץ לסינון מעומעמים.`,
    `Site-wide filters are on: ${k} of ${n} sages. Members outside them are dimmed.`,
    `Действуют общие фильтры: ${k} из ${n}. Мудрецы вне фильтров приглушены.`)
}

function groupNotice(locale: Locale, name: string): string {
  return tr(locale, `מיקוד ברשת: ${name}`, `Network focus: ${name}`, `Фокус на графе: ${name}`)
}

function spanText(locale: Locale, [a, b]: [number, number | null]): string {
  const end = b == null
    ? t(locale, S.present)
    : formatYear(b, locale) + (a < 0 && b > 0 ? t(locale, S.ce) : '')
  return `${t(locale, S.approx)}${formatYear(a, locale)}–${end}`
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// ── Relations ─────────────────────────────────────────────────────────────

interface RelationLink { key: string; label: L10n; relation: SchoolRelation }
interface Edge { from: string; to: string; relation: SchoolRelation }

/** Every relation a school takes part in, in either direction. */
function relationsOf(school: ResolvedSchool, byKey: Map<string, ResolvedSchool>, all: ResolvedSchool[]): RelationLink[] {
  const out: RelationLink[] = school.related
    .filter(r => byKey.has(r.key))
    .map(r => ({ key: r.key, label: REL_OUT[r.relation], relation: r.relation }))
  const inc: RelationLink[] = []
  for (const other of all) {
    for (const r of other.related) {
      if (r.key === school.key) inc.push({ key: other.key, label: REL_IN[r.relation], relation: r.relation })
    }
  }
  return [...out, ...inc]
}

/** Map edges point forward in time: parent → child for "grew out of". */
function edgesOf(schools: ResolvedSchool[]): Edge[] {
  const keys = new Set(schools.map(s => s.key))
  const edges: Edge[] = []
  for (const s of schools) {
    for (const r of s.related) {
      if (!keys.has(r.key)) continue
      edges.push(r.relation === 'grewOutOf'
        ? { from: r.key, to: s.key, relation: r.relation }
        : { from: s.key, to: r.key, relation: r.relation })
    }
  }
  return edges
}

// ── Main ──────────────────────────────────────────────────────────────────

interface TraditionsProps {
  locale: Locale
}

export function Traditions({ locale }: TraditionsProps) {
  const sages = useAppStore(s => s.sages)
  const filteredSages = useAppStore(s => s.filteredSages)
  const group = useAppStore(s => s.filters.group ?? null)
  const selectSage = useAppStore(s => s.selectSage)
  const setGroupFocus = useAppStore(s => s.setGroupFocus)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const clearFilters = useAppStore(s => s.clearFilters)

  const schools = useMemo(
    () => resolveSchools(sages).sort((a, b) => a.span[0] - b.span[0]),
    [sages],
  )
  const byKey = useMemo(() => new Map(schools.map(s => [s.key, s])), [schools])
  const relationsByKey = useMemo(
    () => new Map(schools.map(s => [s.key, relationsOf(s, byKey, schools)])),
    [schools, byKey],
  )
  const peopleCount = useMemo(() => new Set(schools.flatMap(s => s.people.map(p => p.id))).size, [schools])

  // Global filters dim, never hide: null when nothing is filtered out.
  const inFilter = useMemo(() => {
    if (!sages.length || filteredSages.length === sages.length) return null
    return new Set(filteredSages.map(s => s.id))
  }, [sages.length, filteredSages])

  // ── Local filters ──
  const [eraRange, setEraRange] = useState<[number, number] | null>(null)   // indices into ALL_PERIODS
  const [eraAnchor, setEraAnchor] = useState<number | null>(null)
  const [regions, setRegions] = useState<Set<Region>>(new Set())

  // Only eras and regions that at least one school occupies get a chip.
  const eras = useMemo(
    () => ALL_PERIODS.filter(p => schools.some(s => s.periods.includes(p))),
    [schools],
  )
  const regionOptions = useMemo(
    () => REGION_ORDER.filter(r => schools.some(s => s.region === r)),
    [schools],
  )

  const visible = useMemo(() => schools.filter(s => {
    if (eraRange) {
      const [lo, hi] = eraRange
      if (!s.periods.some(p => { const i = ALL_PERIODS.indexOf(p); return i >= lo && i <= hi })) return false
    }
    if (regions.size && !regions.has(s.region)) return false
    return true
  }), [schools, eraRange, regions])
  const visibleKeys = useMemo(() => new Set(visible.map(s => s.key)), [visible])
  const localActive = !!eraRange || regions.size > 0

  const onEra = (p: Period) => {
    const i = ALL_PERIODS.indexOf(p)
    if (eraAnchor != null) {
      if (eraAnchor === i) { setEraRange(null); setEraAnchor(null); return }
      setEraRange([Math.min(eraAnchor, i), Math.max(eraAnchor, i)])
      setEraAnchor(null)
      return
    }
    setEraRange([i, i])
    setEraAnchor(i)
  }
  const toggleRegion = (r: Region) => setRegions(prev => {
    const next = new Set(prev)
    if (next.has(r)) next.delete(r)
    else next.add(r)
    return next
  })
  const resetLocal = () => { setEraRange(null); setEraAnchor(null); setRegions(new Set()) }

  // ── Jump to a card (related links, family map) ──
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const [pendingJump, setPendingJump] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jumpTo = useCallback((key: string) => {
    // A target hidden by the local filters is brought back first.
    if (!visibleKeys.has(key)) { setEraRange(null); setEraAnchor(null); setRegions(new Set()) }
    setPendingJump(key)
  }, [visibleKeys])
  useEffect(() => {
    if (!pendingJump) return
    const el = document.getElementById(`school-${pendingJump}`)
    if (!el) return
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    el.focus({ preventScroll: true })
    setFlashKey(pendingJump)
    setPendingJump(null)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashKey(null), 2200)
  }, [pendingJump, visible])
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current) }, [])

  // The sticky filter bar's height, so a jumped-to card lands below it.
  const rootRef = useRef<HTMLDivElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = stickyRef.current, root = rootRef.current
    if (!el || !root) return
    const publish = () => root.style.setProperty('--sc-sticky', `${el.offsetHeight}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => ro.disconnect()
  }, [schools.length])

  const showOnGraph = (s: ResolvedSchool) => {
    setGroupFocus({ key: s.key, label: s.short, ids: s.people.map(p => p.id) })
    setActiveTab('graph')
  }

  const edges = useMemo(() => edgesOf(schools), [schools])
  const [mapOpen, setMapOpen] = useState(true)
  const mapId = useId()

  if (!sages.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-ink-500 font-sans text-sm animate-pulse">{t(locale, S.loading)}</p>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="sc-root h-full overflow-y-auto">
      <style>{SCHOOLS_CSS}</style>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-36">
        {/* ── Heading ── */}
        <header className="mb-5 max-w-3xl">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-ink-50">{t(locale, S.title)}</h2>
          <p className="mt-2 font-sans text-sm md:text-[15px] leading-relaxed text-ink-300">
            {leadText(locale, schools.length, peopleCount)}
          </p>
        </header>

        {/* ── Family map ── */}
        <section className="sc-panel mb-5" aria-labelledby={`${mapId}-t`}>
          <div className="flex items-start justify-between gap-3 px-4 pt-3">
            <div className="min-w-0">
              <h3 id={`${mapId}-t`} className="font-serif text-base font-bold text-ink-100">{t(locale, S.mapTitle)}</h3>
              {mapOpen && <p className="mt-0.5 font-sans text-xs text-ink-400 leading-relaxed">{t(locale, S.mapHint)}</p>}
            </div>
            <button
              type="button"
              onClick={() => setMapOpen(v => !v)}
              aria-expanded={mapOpen}
              aria-controls={`${mapId}-m`}
              className="sc-btn flex-shrink-0"
            >
              {mapOpen ? t(locale, S.mapHide) : t(locale, S.mapShow)}
            </button>
          </div>
          {mapOpen && (
            <div id={`${mapId}-m`}>
              <FamilyMap
                schools={schools}
                edges={edges}
                visibleKeys={visibleKeys}
                locale={locale}
                onJump={jumpTo}
              />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-3 pt-1 font-sans text-[11px] text-ink-400">
                {(Object.keys(REL_LEGEND) as SchoolRelation[]).map(r => (
                  <span key={r} className="inline-flex items-center gap-1.5">
                    <svg width="26" height="8" aria-hidden className="flex-shrink-0">
                      <line x1="1" y1="4" x2="25" y2="4" stroke={REL_COLOR[r]} strokeWidth="2"
                        strokeDasharray={r === 'opposed' ? '4 3' : undefined} />
                    </svg>
                    {t(locale, REL_LEGEND[r])}
                  </span>
                ))}
                <span className="ms-auto">{t(locale, S.axisNote)}</span>
              </div>
            </div>
          )}
        </section>

        {/* ── Filters (sticky) ── */}
        <div ref={stickyRef} className="sc-sticky sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-2.5 mb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="sc-label">{t(locale, S.era)}</span>
              <div className="flex gap-1 overflow-x-auto no-scrollbar min-w-0 py-0.5" role="group" aria-label={t(locale, S.era)}>
                <button type="button" className="sc-chipbtn" aria-pressed={!eraRange}
                  onClick={() => { setEraRange(null); setEraAnchor(null) }}>
                  {t(locale, S.all)}
                </button>
                {eras.map(p => {
                  const i = ALL_PERIODS.indexOf(p)
                  const on = !!eraRange && i >= eraRange[0] && i <= eraRange[1]
                  return (
                    <button key={p} type="button" onClick={() => onEra(p)}
                      aria-pressed={on}
                      className={cn('sc-chipbtn', on && 'sc-on', eraAnchor === i && 'sc-anchor')}
                      style={{ '--c': ERA_COLORS[p] } as CSSProperties}>
                      <span className="sc-dot" aria-hidden />
                      {ERA_LABELS[p][locale]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="sc-label">{t(locale, S.region)}</span>
              <div className="flex gap-1 overflow-x-auto no-scrollbar min-w-0 py-0.5" role="group" aria-label={t(locale, S.region)}>
                <button type="button" className="sc-chipbtn" aria-pressed={regions.size === 0}
                  onClick={() => setRegions(new Set())}>
                  {t(locale, S.all)}
                </button>
                {regionOptions.map(r => {
                  const on = regions.has(r)
                  return (
                    <button key={r} type="button" onClick={() => toggleRegion(r)}
                      aria-pressed={on}
                      className={cn('sc-chipbtn', on && 'sc-on')}
                      style={{ '--c': REGION_COLORS[r] } as CSSProperties}>
                      <span className="sc-dot" aria-hidden />
                      {REGION_LABELS[r][locale]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[11.5px] text-ink-400 min-h-[18px]">
              <span aria-live="polite" className="tabular-nums text-ink-300">
                {showingText(locale, visible.length, schools.length)}
              </span>
              {eraAnchor != null && <span className="text-gold-400">{t(locale, S.rangeHint)}</span>}
              {localActive && (
                <button type="button" onClick={resetLocal} className="sc-link">{t(locale, S.reset)}</button>
              )}
              {inFilter && (
                <span className="sc-notice">
                  {group ? groupNotice(locale, group.label[locale]) + ' · ' : ''}
                  {globalNotice(locale, filteredSages.length, sages.length)}
                  <button type="button" onClick={clearFilters} className="sc-link ms-2">{t(locale, S.clearGlobal)}</button>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Cards ── */}
        {visible.length === 0 ? (
          <div className="sc-panel px-6 py-12 text-center">
            <p className="font-sans text-sm text-ink-300">{t(locale, S.none)}</p>
            <button type="button" onClick={resetLocal} className="sc-btn mt-3">{t(locale, S.reset)}</button>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {visible.map(s => (
              <SchoolCard
                key={s.key}
                school={s}
                locale={locale}
                relations={relationsByKey.get(s.key) ?? []}
                byKey={byKey}
                inFilter={inFilter}
                flash={flashKey === s.key}
                focused={group?.key === s.key}
                onSelect={selectSage}
                onJump={jumpTo}
                onShowOnGraph={() => showOnGraph(s)}
                onClearFocus={() => setGroupFocus(null)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────

function SchoolCard({
  school, locale, relations, byKey, inFilter, flash, focused,
  onSelect, onJump, onShowOnGraph, onClearFocus,
}: {
  school: ResolvedSchool
  locale: Locale
  relations: RelationLink[]
  byKey: Map<string, ResolvedSchool>
  inFilter: Set<string> | null
  flash: boolean
  focused: boolean
  onSelect: (sage: Sage) => void
  onJump: (key: string) => void
  onShowOnGraph: () => void
  onClearFocus: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const color = REGION_COLORS[school.region]
  const headingId = `school-${school.key}-name`
  const matched = inFilter ? school.people.filter(p => inFilter.has(p.id)).length : null

  // Founders always show; members fill the remaining collapsed slots.
  const room = Math.max(3, CHIPS_COLLAPSED - school.founderSages.length)
  const members = expanded ? school.memberSages : school.memberSages.slice(0, room)
  const hidden = school.memberSages.length - members.length

  // Relations grouped under their label, in a stable order.
  const relGroups = useMemo(() => {
    const groups: { label: L10n; relation: SchoolRelation; keys: string[] }[] = []
    for (const r of relations) {
      const g = groups.find(x => x.label === r.label)
      if (g) g.keys.push(r.key)
      else groups.push({ label: r.label, relation: r.relation, keys: [r.key] })
    }
    return groups
  }, [relations])

  return (
    <article
      id={`school-${school.key}`}
      tabIndex={-1}
      aria-labelledby={headingId}
      className={cn('sc-card flex flex-col', flash && 'sc-flash')}
      style={{ '--c': color } as CSSProperties}
    >
      <header className="px-5 pt-5">
        <div className="flex items-center justify-between gap-3 font-sans text-[11.5px] text-ink-400">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <span className="sc-dot flex-shrink-0" aria-hidden />
            <span className="truncate">{REGION_LABELS[school.region][locale]} · {t(locale, school.place)}</span>
          </span>
          <span className="flex-shrink-0 tabular-nums text-ink-300" dir="auto">{spanText(locale, school.span)}</span>
        </div>
        <h3 id={headingId} className="mt-1.5 font-serif text-xl font-bold leading-snug text-ink-50">
          {t(locale, school.name)}
        </h3>
      </header>

      <div className="px-5 mt-3">
        <SpanAxis span={school.span} locale={locale} />
      </div>

      <p className="px-5 mt-3 font-sans text-[13.5px] leading-relaxed text-ink-200">
        {t(locale, school.summary)}
      </p>

      <div className="px-5 mt-4 space-y-3">
        {school.founderSages.length > 0 && (
          <PeopleRow label={t(locale, S.founders)}>
            {school.founderSages.map(p => (
              <PersonChip key={p.id} sage={p} locale={locale} founder dim={!!inFilter && !inFilter.has(p.id)} onSelect={onSelect} />
            ))}
          </PeopleRow>
        )}
        {school.memberSages.length > 0 && (
          <PeopleRow label={t(locale, S.members)}>
            {members.map(p => (
              <PersonChip key={p.id} sage={p} locale={locale} dim={!!inFilter && !inFilter.has(p.id)} onSelect={onSelect} />
            ))}
            {(hidden > 0 || expanded) && school.memberSages.length > room && (
              <button type="button" className="sc-more" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>
                {expanded ? t(locale, S.less) : moreText(locale, hidden)}
              </button>
            )}
          </PeopleRow>
        )}
      </div>

      <div className="px-5 mt-4">
        <h4 className="sc-label mb-1.5">{t(locale, S.keyIdeas)}</h4>
        <ul className="space-y-1">
          {school.keyIdeas.map((idea, i) => (
            <li key={i} className="flex gap-2 font-sans text-[13px] leading-snug text-ink-200">
              <span className="sc-bullet" aria-hidden />
              <span>{t(locale, idea)}</span>
            </li>
          ))}
        </ul>
      </div>

      {relGroups.length > 0 && (
        <div className="px-5 mt-4">
          <h4 className="sc-label mb-1.5">{t(locale, S.related)}</h4>
          <ul className="space-y-1.5">
            {relGroups.map(g => (
              <li key={g.label.en} className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[12.5px]">
                <span className="inline-flex items-center gap-1.5 text-ink-400">
                  <svg width="16" height="6" aria-hidden className="flex-shrink-0">
                    <line x1="1" y1="3" x2="15" y2="3" stroke={REL_COLOR[g.relation]} strokeWidth="2"
                      strokeDasharray={g.relation === 'opposed' ? '3 2' : undefined} />
                  </svg>
                  {t(locale, g.label)}
                </span>
                {g.keys.map(k => {
                  const other = byKey.get(k)
                  if (!other) return null
                  return (
                    <button key={k} type="button" className="sc-rel"
                      style={{ '--c': REGION_COLORS[other.region] } as CSSProperties}
                      onClick={() => onJump(k)}
                      aria-label={tr(locale, `עבור אל ${other.name.he}`, `Go to ${other.name.en}`, `Перейти: ${other.name.ru}`)}>
                      <span className="sc-dot" aria-hidden />
                      {t(locale, other.short)}
                    </button>
                  )
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <footer className="mt-auto px-5 pt-4 pb-4">
        <div className="sc-rule mb-3" />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-sans text-[11.5px] text-ink-400 tabular-nums">
            {peopleText(locale, school.people.length, matched)}
          </span>
          {focused ? (
            <span className="inline-flex items-center gap-2">
              <span className="sc-focused">◈ {t(locale, S.focused)}</span>
              <button type="button" className="sc-link" onClick={onClearFocus}>{t(locale, S.clearFocus)}</button>
            </span>
          ) : (
            <button type="button" className="sc-btn sc-btn-accent" onClick={onShowOnGraph}>
              <span aria-hidden>⬡</span> {t(locale, S.showOnGraph)}
            </button>
          )}
        </div>
      </footer>
    </article>
  )
}

function PeopleRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="sc-label mb-1.5">{label}</h4>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function PersonChip({ sage, locale, founder, dim, onSelect }: {
  sage: Sage
  locale: Locale
  founder?: boolean
  dim: boolean
  onSelect: (sage: Sage) => void
}) {
  const name = displayName(sage.label)
  const years = formatYearRangeFor(locale, sage.birth_year, sage.death_year, sage.date_precision)
  const title = [sage.label, years, dim ? t(locale, S.dimmed) : ''].filter(Boolean).join(' · ')
  return (
    <button
      type="button"
      onClick={() => onSelect(sage)}
      title={title}
      aria-label={dim ? `${name} (${t(locale, S.dimmed)})` : name}
      className={cn('sc-chip', founder && 'sc-chip-founder', dim && 'sc-chip-dim')}
      style={{ '--e': ERA_COLORS[sage.period] } as CSSProperties}
    >
      <span className="sc-edot" aria-hidden />
      <span className="truncate max-w-[16rem]">{name}</span>
    </button>
  )
}

// ── Span on the shared axis ───────────────────────────────────────────────

function SpanAxis({ span, locale }: { span: [number, number | null]; locale: Locale }) {
  const [a, b] = span
  const open = b == null
  const x0 = axisX(a)
  const x1 = axisX(open ? THIS_YEAR : b)
  const pct = (v: number) => `${(v * 100).toFixed(3)}%`
  return (
    <div className="sc-axis" dir="ltr" aria-hidden>
      <div className="sc-axis-track">
        {(Object.entries(ERA_WINDOW) as [Period, [number, number]][]).map(([era, [s, e]]) => (
          <span key={era} className="sc-axis-era"
            style={{ left: pct(axisX(s)), width: pct(axisX(e) - axisX(s)), background: ERA_COLORS[era] }} />
        ))}
        {CARD_TICKS.map(y => <span key={y} className="sc-axis-tick" style={{ left: pct(axisX(y)) }} />)}
        <span className="sc-axis-break" style={{ left: pct(BREAK_AT) }} />
        <span className={cn('sc-axis-bar', open && 'sc-axis-open')}
          style={{ left: pct(x0), width: `max(6px, ${pct(x1 - x0)})` }} />
      </div>
      <div className="sc-axis-labels">
        {CARD_TICKS.map(y => (
          <span key={y} style={{ left: pct(axisX(y)) }}>{formatYear(y, locale)}</span>
        ))}
      </div>
    </div>
  )
}

// ── Family map ────────────────────────────────────────────────────────────

const MAP_MIN_W = 760
const LANE_H = 30
const NODE_H = 22
const MAP_TOP = 10
const MAP_AXIS_H = 28
const MAP_PAD = 16
const NODE_FONT = '600 11px Heebo, "Segoe UI", Arial, sans-serif'

let measureCtx: CanvasRenderingContext2D | null | undefined
function textWidth(s: string): number {
  if (measureCtx === undefined) {
    measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
  }
  if (!measureCtx) return s.length * 6.6
  measureCtx.font = NODE_FONT
  return measureCtx.measureText(s).width
}

interface MapNode { key: string; x: number; y: number; w: number; label: string; color: string; name: string }

function FamilyMap({ schools, edges, visibleKeys, locale, onJump }: {
  schools: ResolvedSchool[]
  edges: Edge[]
  visibleKeys: Set<string>
  locale: Locale
  onJump: (key: string) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<string | null>(null)
  // Marker ids go inside url(#…), so keep only plain characters.
  const uid = 'sc' + useId().replace(/[^a-zA-Z0-9_-]/g, '')

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const W = Math.max(MAP_MIN_W, width)
  const xOf = useCallback((year: number) => MAP_PAD + scaleX(year, MAP_STOPS) * (W - 2 * MAP_PAD), [W])

  // Pills sit at their start year. Each takes the free lane that keeps its
  // edges to already-placed schools short and clear of other pills.
  const { nodes, lanes } = useMemo(() => {
    const laneEnds: number[] = []
    const out: MapNode[] = []
    const placed = new Map<string, MapNode & { lane: number }>()
    const neighbours = (key: string) =>
      edges.filter(e => e.from === key || e.to === key).map(e => (e.from === key ? e.to : e.from))
    for (const s of schools) {
      const label = s.short[locale]
      const w = Math.ceil(textWidth(label)) + 30
      let x = xOf(s.span[0])
      if (x + w > W - MAP_PAD) x = W - MAP_PAD - w
      let best = 0, bestCost = Infinity
      for (let lane = 0; lane <= laneEnds.length; lane++) {
        if (lane < laneEnds.length && laneEnds[lane] + 8 > x) continue
        const cand: MapNode = { key: s.key, x, y: MAP_TOP + lane * LANE_H, w, label: '', color: '', name: '' }
        let cost = lane * 0.3 + (lane === laneEnds.length ? 1.5 : 0)
        for (const nk of neighbours(s.key)) {
          const n = placed.get(nk)
          if (!n) continue
          cost += Math.abs(lane - n.lane)
          const bz = edgeCurve(n, cand)
          cost += 6 * [...placed.values()].filter(p => p.key !== nk && curveHits(bz, p)).length
        }
        if (cost < bestCost) { bestCost = cost; best = lane }
      }
      if (best === laneEnds.length) laneEnds.push(0)
      laneEnds[best] = x + w
      const node = {
        key: s.key, x, y: MAP_TOP + best * LANE_H, w, label,
        color: REGION_COLORS[s.region], name: s.name[locale],
      }
      out.push(node)
      placed.set(s.key, { ...node, lane: best })
    }
    return { nodes: out, lanes: laneEnds.length }
  }, [schools, edges, locale, xOf, W])

  const byKey = useMemo(() => new Map(nodes.map(n => [n.key, n])), [nodes])
  const H = MAP_TOP + lanes * LANE_H + MAP_AXIS_H
  const axisY = H - MAP_AXIS_H + 8

  const connected = useMemo(() => {
    if (!hover) return null
    const set = new Set([hover])
    edges.forEach(e => { if (e.from === hover) set.add(e.to); if (e.to === hover) set.add(e.from) })
    return set
  }, [hover, edges])

  const onKey = (e: ReactKeyboardEvent, key: string) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onJump(key) }
  }

  return (
    <div ref={wrapRef} className="sc-map overflow-x-auto" dir="ltr">
      <svg width={W} height={H} className="block" role="group" aria-label={tr(locale, 'מפת המשפחות של בתי המדרש', 'Family map of the schools', 'Карта родства школ')}>
        <defs>
          {(['influenced', 'grewOutOf'] as SchoolRelation[]).map(r => (
            <marker key={r} id={`${uid}-${r}`} viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={REL_COLOR[r]} />
            </marker>
          ))}
        </defs>

        {/* Axis */}
        <line x1={MAP_PAD} x2={W - MAP_PAD} y1={axisY} y2={axisY} className="sc-map-axis" />
        {MAP_TICKS.map(y => (
          <g key={y}>
            <line x1={xOf(y)} x2={xOf(y)} y1={MAP_TOP - 4} y2={axisY + 4} className="sc-map-grid" />
            <text x={xOf(y)} y={axisY + 16} textAnchor="middle" className="sc-map-tick">{formatYear(y, locale)}</text>
          </g>
        ))}

        {/* Edges */}
        {edges.map((e, i) => {
          const a = byKey.get(e.from), b = byKey.get(e.to)
          if (!a || !b) return null
          const d = edgePath(a, b, nodes)
          const active = !connected || (connected.has(e.from) && connected.has(e.to) && (e.from === hover || e.to === hover))
          return (
            <path key={i} d={d} fill="none"
              stroke={REL_COLOR[e.relation]}
              strokeWidth={active && connected ? 2.2 : 1.6}
              strokeDasharray={e.relation === 'opposed' ? '5 4' : undefined}
              markerEnd={e.relation === 'opposed' ? undefined : `url(#${uid}-${e.relation})`}
              className="sc-map-edge"
              style={{ opacity: active ? 0.9 : 0.12 }} />
          )
        })}

        {/* Nodes */}
        {nodes.map(n => {
          const off = !visibleKeys.has(n.key)
          const faded = off || (connected && !connected.has(n.key))
          return (
            <g key={n.key}
              className="sc-map-node"
              role="button"
              tabIndex={0}
              aria-label={tr(locale, `עבור אל ${n.name}`, `Go to ${n.name}`, `Перейти: ${n.name}`)}
              transform={`translate(${n.x},${n.y})`}
              style={{ '--c': n.color, opacity: faded ? 0.35 : 1 } as CSSProperties}
              onClick={() => onJump(n.key)}
              onKeyDown={e => onKey(e, n.key)}
              onMouseEnter={() => setHover(n.key)}
              onMouseLeave={() => setHover(h => (h === n.key ? null : h))}
              onFocus={() => setHover(n.key)}
              onBlur={() => setHover(h => (h === n.key ? null : h))}
            >
              <title>{n.name}</title>
              <rect width={n.w} height={NODE_H} rx={NODE_H / 2} className="sc-map-pill" />
              <circle cx={11} cy={NODE_H / 2} r={4} fill={n.color} />
              <text x={20} y={NODE_H / 2 + 4} className="sc-map-label">{n.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

type Pt = [number, number]
type Curve = [Pt, Pt, Pt, Pt]

/** A smooth curve between two pills: sideways when they don't overlap in x, else vertical. */
function edgeCurve(a: MapNode, b: MapNode): Curve {
  const ay = a.y + NODE_H / 2, by = b.y + NODE_H / 2
  if (a.x + a.w + 6 <= b.x) {
    const x1 = a.x + a.w, x2 = b.x - 1
    const dx = Math.max(18, (x2 - x1) / 2)
    return [[x1, ay], [x1 + dx, ay], [x2 - dx, by], [x2, by]]
  }
  if (b.x + b.w + 6 <= a.x) {
    const x1 = a.x, x2 = b.x + b.w + 1
    const dx = Math.max(18, (x1 - x2) / 2)
    return [[x1, ay], [x1 - dx, ay], [x2 + dx, by], [x2, by]]
  }
  const down = b.y > a.y
  const x1 = a.x + Math.min(a.w, 40), x2 = b.x + Math.min(b.w, 40)
  const y1 = down ? a.y + NODE_H : a.y
  const y2 = down ? b.y - 1 : b.y + NODE_H + 1
  const dy = Math.max(10, Math.abs(y2 - y1) / 2) * (down ? 1 : -1)
  return [[x1, y1], [x1, y1 + dy], [x2, y2 - dy], [x2, y2]]
}

/** Does the curve pass through a pill? Sampled, with a small inset. */
function curveHits([p0, p1, p2, p3]: Curve, n: MapNode): boolean {
  for (let i = 1; i < 24; i++) {
    const t = i / 24, u = 1 - t
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0]
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
    if (x > n.x + 2 && x < n.x + n.w - 2 && y > n.y + 2 && y < n.y + NODE_H - 2) return true
  }
  return false
}

/**
 * The drawn path. Two pills in one lane with others between them are joined
 * by a shallow arc through the gap under the lane instead of through the pills.
 */
function edgePath(a: MapNode, b: MapNode, all: MapNode[]): string {
  let c = edgeCurve(a, b)
  if (a.y === b.y && all.some(n => n !== a && n !== b && curveHits(c, n))) {
    const [l, r] = a.x < b.x ? [a, b] : [b, a]
    const y = a.y + NODE_H
    const sx = l.x + l.w - 12, ex = r.x + 12
    const pts: Curve = [[sx, y], [sx + 10, y + 10], [ex - 10, y + 10], [ex, y + 1]]
    c = a === l ? pts : [[ex, y], [ex - 10, y + 10], [sx + 10, y + 10], [sx, y + 1]]
  }
  const [p0, p1, p2, p3] = c
  return `M${p0[0]},${p0[1]} C${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`
}

// ── Styles ────────────────────────────────────────────────────────────────
// Scoped to .sc-root; colours come from the theme variables, so dark and
// light both work. Per-item accents arrive as --c (region) and --e (era).

const SCHOOLS_CSS = `
.sc-root { --sc-line: rgb(var(--ink-700-rgb) / .75); --sc-surface: rgb(var(--ink-850-rgb)); }
[data-theme='light'] .sc-root { --sc-line: rgb(var(--ink-600-rgb) / .45); --sc-surface: #fffdf8; }

.sc-root .sc-panel { border: 1px solid var(--sc-line); border-radius: 18px; background: var(--sc-surface); }
.sc-root .sc-label { font-family: var(--font-heebo), Heebo, sans-serif; font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgb(var(--ink-400-rgb)); white-space: nowrap; }
.sc-root .sc-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }

.sc-root .sc-sticky { background: rgb(var(--ink-900-rgb) / .9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-bottom: 1px solid var(--sc-line); }

.sc-root .sc-chipbtn { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; white-space: nowrap; padding: 4px 11px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid var(--sc-line); color: rgb(var(--ink-200-rgb)); background: transparent; transition: background-color .18s, border-color .18s, color .18s; }
.sc-root .sc-chipbtn .sc-dot { width: 7px; height: 7px; }
.sc-root .sc-chipbtn:hover { border-color: color-mix(in srgb, var(--c, rgb(var(--gold-500-rgb))) 70%, transparent); }
.sc-root .sc-chipbtn[aria-pressed='true']:not([style]) { background: rgb(var(--gold-500-rgb) / .16); border-color: rgb(var(--gold-500-rgb) / .6); color: rgb(var(--gold-300-rgb)); }
.sc-root .sc-chipbtn.sc-on { background: color-mix(in srgb, var(--c) 22%, transparent); border-color: var(--c); color: rgb(var(--ink-50-rgb)); }
.sc-root .sc-chipbtn.sc-anchor { box-shadow: 0 0 0 2px color-mix(in srgb, var(--c) 45%, transparent); }

.sc-root .sc-notice { color: rgb(var(--gold-400-rgb)); }
.sc-root .sc-link { color: rgb(var(--gold-400-rgb)); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
.sc-root .sc-link:hover { color: rgb(var(--gold-300-rgb)); }
.sc-root .sc-btn { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; border: 1px solid var(--sc-line); color: rgb(var(--ink-200-rgb)); transition: background-color .18s, border-color .18s, color .18s; }
.sc-root .sc-btn:hover { border-color: rgb(var(--gold-500-rgb) / .6); color: rgb(var(--gold-300-rgb)); }
.sc-root .sc-btn-accent { border-color: rgb(var(--gold-500-rgb) / .5); color: rgb(var(--gold-300-rgb)); background: rgb(var(--gold-500-rgb) / .1); }
.sc-root .sc-btn-accent:hover { background: rgb(var(--gold-500-rgb) / .2); }
.sc-root .sc-focused { font-size: 12px; font-weight: 700; color: rgb(var(--gold-300-rgb)); }

.sc-root .sc-card { position: relative; border-radius: 18px; border: 1px solid var(--sc-line); background:
    linear-gradient(180deg, color-mix(in srgb, var(--c) 9%, transparent), transparent 150px), var(--sc-surface);
  scroll-margin-top: calc(var(--sc-sticky, 110px) + 14px); transition: border-color .2s, box-shadow .2s; outline: none; }
.sc-root .sc-card::before { content: ''; position: absolute; inset: 0 18px auto; height: 3px; border-radius: 0 0 3px 3px; background: var(--c); opacity: .85; }
.sc-root .sc-card:hover { border-color: color-mix(in srgb, var(--c) 40%, var(--sc-line)); }
.sc-root .sc-card:focus-visible { box-shadow: 0 0 0 2px rgb(var(--gold-500-rgb)); }
.sc-root .sc-card.sc-flash { border-color: var(--c); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 55%, transparent); animation: sc-flash 2.2s ease-out; }
@keyframes sc-flash {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 0%, transparent); transform: scale(1); }
  12%  { box-shadow: 0 0 0 6px color-mix(in srgb, var(--c) 60%, transparent), 0 0 36px color-mix(in srgb, var(--c) 40%, transparent); transform: scale(1.012); }
  40%  { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 55%, transparent); transform: scale(1); }
  100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 55%, transparent); }
}
.sc-root .sc-rule { height: 1px; background: var(--sc-line); }
.sc-root .sc-bullet { flex-shrink: 0; width: 5px; height: 5px; margin-top: 7px; border-radius: 1px; transform: rotate(45deg); background: var(--c); }

.sc-root .sc-chip { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; padding: 3px 10px; border-radius: 999px; font-size: 12px; line-height: 1.4; border: 1px solid var(--sc-line); background: rgb(var(--ink-800-rgb) / .55); color: rgb(var(--ink-100-rgb)); transition: background-color .15s, border-color .15s, opacity .2s; }
[data-theme='light'] .sc-root .sc-chip { background: rgb(var(--ink-800-rgb) / .6); }
.sc-root .sc-chip:hover { border-color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.sc-root .sc-chip-founder { border-color: rgb(var(--gold-500-rgb) / .55); font-weight: 700; }
.sc-root .sc-chip-dim { opacity: .38; }
.sc-root .sc-chip-dim:hover, .sc-root .sc-chip-dim:focus-visible { opacity: .85; }
.sc-root .sc-edot { flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; background: var(--e); }
.sc-root .sc-more { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: rgb(var(--gold-400-rgb)); border: 1px dashed rgb(var(--gold-500-rgb) / .45); }
.sc-root .sc-more:hover { background: rgb(var(--gold-500-rgb) / .1); }
.sc-root .sc-rel { display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px; border-radius: 8px; font-weight: 600; color: rgb(var(--ink-100-rgb)); border: 1px solid color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 10%, transparent); transition: background-color .15s; }
.sc-root .sc-rel .sc-dot { width: 6px; height: 6px; }
.sc-root .sc-rel:hover { background: color-mix(in srgb, var(--c) 22%, transparent); }

.sc-root .sc-axis { position: relative; }
.sc-root .sc-axis-track { position: relative; height: 12px; border-radius: 6px; background: rgb(var(--ink-700-rgb) / .35); overflow: hidden; }
.sc-root .sc-axis-era { position: absolute; top: 0; bottom: 0; opacity: .16; }
.sc-root .sc-axis-tick { position: absolute; top: 0; bottom: 0; width: 1px; background: rgb(var(--ink-500-rgb) / .35); }
.sc-root .sc-axis-break { position: absolute; top: 1px; bottom: 1px; width: 3px; margin-left: -1.5px; border-left: 1px dashed rgb(var(--ink-400-rgb) / .6); border-right: 1px dashed rgb(var(--ink-400-rgb) / .6); }
.sc-root .sc-axis-bar { position: absolute; top: 2px; bottom: 2px; border-radius: 4px; background: var(--c); box-shadow: 0 0 10px color-mix(in srgb, var(--c) 55%, transparent); }
.sc-root .sc-axis-open { background: linear-gradient(90deg, var(--c) 70%, color-mix(in srgb, var(--c) 25%, transparent)); border-radius: 4px 0 0 4px; }
.sc-root .sc-axis-labels { position: relative; height: 14px; margin-top: 2px; font-size: 9.5px; color: rgb(var(--ink-500-rgb)); font-variant-numeric: tabular-nums; }
.sc-root .sc-axis-labels span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
.sc-root .sc-axis-labels span:first-child { transform: none; }
.sc-root .sc-axis-labels span:last-child { transform: translateX(-80%); }

.sc-root .sc-map { scrollbar-width: thin; }
.sc-root .sc-map-axis { stroke: rgb(var(--ink-500-rgb) / .55); stroke-width: 1; }
.sc-root .sc-map-grid { stroke: rgb(var(--ink-600-rgb) / .22); stroke-width: 1; stroke-dasharray: 2 4; }
.sc-root .sc-map-tick { fill: rgb(var(--ink-500-rgb)); font-size: 10px; font-variant-numeric: tabular-nums; }
.sc-root .sc-map-edge { transition: opacity .2s, stroke-width .2s; }
.sc-root .sc-map-node { cursor: pointer; outline: none; transition: opacity .2s; }
.sc-root .sc-map-pill { fill: var(--sc-surface); stroke: color-mix(in srgb, var(--c) 70%, transparent); stroke-width: 1.2; transition: fill .15s; }
.sc-root .sc-map-node:hover .sc-map-pill { fill: color-mix(in srgb, var(--c) 18%, var(--sc-surface)); }
.sc-root .sc-map-node:focus-visible .sc-map-pill { stroke: rgb(var(--gold-500-rgb)); stroke-width: 2.5; }
.sc-root .sc-map-label { fill: rgb(var(--ink-100-rgb)); font: ${NODE_FONT}; }

@media (prefers-reduced-motion: reduce) {
  .sc-root .sc-card.sc-flash { animation: none; }
}
`
