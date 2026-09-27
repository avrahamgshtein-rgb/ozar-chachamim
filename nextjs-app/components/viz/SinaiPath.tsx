'use client'

import { useMemo, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ALL_PERIODS, ERA_COLORS, ERA_LABELS } from '@/lib/types'
import type { Locale, Sage } from '@/lib/types'
import { cn, formatYearRangeFor } from '@/lib/utils'
import { displayName } from '@/lib/displayName'
import { tr } from '@/lib/i18n'
import { regionsOf } from '@/lib/regions'
import { beforeSinai, leapCenturies, sinaiPath, sinaiTrail } from '@/lib/sinaiPath'
import type { ResolvedStation, SinaiIndex, SinaiStepKind } from '@/lib/sinaiPath'
import { chronoYear } from './lineage'
import type { LineageIndex, LineageKind } from './lineage'
import {
  LEGEND, SINAI_LINE_CSS, SP, genLabel, generationsLabel, inspirationsLabel, leapLabel, linksLabel, receivedFrom, shortName,
} from './SinaiPathText'

/*
 * הדרך לסיני — a vertical "river of transmission" from Moses at Sinai down to
 * one sage. The upper reach is the Rambam's forty generations (a channel with
 * two banks); below the station where the sage's route joins it, each step is
 * a link recorded in the archive, drawn as the lineage tab draws it: solid for
 * teacher and student, dashed for inspiration. The route itself is chosen in
 * lib/sinaiPath.ts; this component only lays it out and reveals it from Sinai
 * downward. When no route exists it says so, shows how far back the record
 * does go, and still shows the chain on its own.
 *
 * Plain DOM in a scrolling column rather than SVG: 40-odd rows read as an
 * ordered list, wrap long names, and scroll naturally on a phone.
 */

interface SinaiPathProps {
  locale: Locale
  /** The sage whose road is shown; null shows the chain alone. */
  sageId: string | null
  si: SinaiIndex
  idx: LineageIndex
  sages: Sage[]
  sageMap: Map<string, Sage>
  /** Open a sage's card. */
  onOpen: (id: string) => void
  /** Show another sage's road (the suggestions in the no-path state). */
  onPick: (id: string) => void
  /** A sage picker for the no-path state. */
  picker?: ReactNode
}

type Row =
  | { t: 'summit' }
  | { t: 'station'; st: ResolvedStation; entry: string | null }
  | { t: 'band' }
  | { t: 'sage'; id: string; above: string | null; kind: LineageKind; reoriented?: boolean; focus: boolean }

interface Placed { row: Row; in: SinaiStepKind | null; out: SinaiStepKind | null }

export function SinaiPath({ locale, sageId, si, idx, sages, sageMap, onOpen, onPick, picker }: SinaiPathProps) {
  const rtl = locale === 'he'
  const sage = sageId ? sageMap.get(sageId) : undefined
  const path = useMemo(() => (sageId ? sinaiPath(si, sageId) : null), [si, sageId])
  const listRef = useRef<HTMLOListElement>(null)

  const name = (id: string | null | undefined) => (id ? displayName(sageMap.get(id)?.label) : '')
  const yearsOf = (s: Sage | undefined) => (s ? formatYearRangeFor(locale, s.birth_year, s.death_year, s.date_precision) : '')

  // The river: Sinai, the chain down to the entry, then the archive's links.
  const placed = useMemo<Placed[]>(() => {
    const rows: { row: Row; kind: SinaiStepKind | null }[] = [{ row: { t: 'summit' }, kind: null }]
    const steps = path?.steps
    if (path && steps) {
      steps.forEach((s, i) => {
        if (s.gen) {
          const st = si.chain[s.gen - 1]
          rows.push({ row: { t: 'station', st, entry: s.gen === path.entry.gen ? path.entry.id : null }, kind: s.kind })
          if (s.gen === path.entry.gen && path.hops > 0) rows.push({ row: { t: 'band' }, kind: steps[i + 1].kind })
        } else {
          rows.push({
            row: { t: 'sage', id: s.id!, above: steps[i - 1].id, kind: s.kind as LineageKind, reoriented: s.reoriented, focus: i === steps.length - 1 },
            kind: s.kind,
          })
        }
      })
    } else {
      for (const st of si.chain) rows.push({ row: { t: 'station', st, entry: null }, kind: st.gen === 1 ? 'sinai' : 'chain' })
    }
    return rows.map((r, i) => ({ row: r.row, in: r.kind, out: rows[i + 1]?.kind ?? null }))
  }, [path, si])

  const usedKinds = useMemo(() => {
    const k = new Set<SinaiStepKind>(['chain'])
    if (path) for (const s of path.steps) if (s.kind !== 'sinai') k.add(s.kind)
    // The legend always explains the three main line styles.
    k.add('teacher'); k.add('influence')
    return LEGEND.filter(l => k.has(l.kind))
  }, [path])

  // Reveal pace: the whole river flows in within about two seconds.
  const step = Math.min(70, 1900 / Math.max(1, placed.length))

  const jumpToEnd = () => {
    const last = listRef.current?.querySelector<HTMLElement>('li:last-child')
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    last?.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' })
    last?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
  }

  const rowProps = { locale, sageMap, name, yearsOf, onOpen }

  return (
    <div className="sp-root sp-lines absolute inset-0 overflow-y-auto" dir={rtl ? 'rtl' : 'ltr'}>
      <style>{SINAI_LINE_CSS + SINAI_CSS}</style>
      <div className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-5 md:pt-8 pb-44 md:pb-32">
        {path && sage ? (
          <PathHeader locale={locale} sage={sage} path={path} name={name} onJump={placed.length > 10 ? jumpToEnd : undefined} />
        ) : (
          <NoPath
            locale={locale} sage={sage} si={si} idx={idx} sages={sages} sageMap={sageMap}
            name={name} yearsOf={yearsOf} onOpen={onOpen} onPick={onPick} picker={picker}
          />
        )}

        <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11.5px] font-sans text-ink-300" aria-label={tr(locale, 'מקרא', 'Legend', 'Легенда')}>
          {usedKinds.map(l => (
            <li key={l.kind} className="flex items-center gap-1.5">
              <span aria-hidden className={`sp-sw k-${l.kind}`} />
              {l.label[locale]}
            </li>
          ))}
        </ul>

        {!path && <h3 className="mt-7 text-center font-serif text-lg text-ink-100">{SP.chainHeading[locale]}</h3>}

        <ol
          ref={listRef}
          key={sageId ?? 'chain'}
          className="sp-river-list sp-anim mt-5"
          aria-label={path && sage
            ? tr(locale, `הדרך מסיני עד ${name(sage.id)}`, `The road from Sinai to ${name(sage.id)}`, `Путь от Синая до ${name(sage.id)}`)
            : SP.chainHeading[locale]}
        >
          {placed.map((p, i) => (
            <RowView key={i} p={p} delay={i * step} dur={step * 1.5} {...rowProps} />
          ))}
        </ol>

        <p className="mt-8 mx-auto max-w-xl text-center text-[11.5px] leading-relaxed font-sans text-ink-400">
          {SP.honesty[locale]}
        </p>
      </div>
    </div>
  )
}

/* ── Header ───────────────────────────────────────────────────────────── */

function PathHeader({ locale, sage, path, name, onJump }: {
  locale: Locale
  sage: Sage
  path: NonNullable<ReturnType<typeof sinaiPath>>
  name: (id: string | null | undefined) => string
  onJump?: () => void
}) {
  const n = name(sage.id)
  const isMoses = path.steps.length === 1
  let summary: string
  if (isMoses) summary = SP.avot[locale]
  else if (path.hops === 0) {
    summary = tr(locale,
      `${n} נמנה בעצמו בשלשלת הרמב״ם, ב${genLabel(path.entry.gen, locale)}.`,
      `${n} is on the Rambam’s list himself: ${genLabel(path.entry.gen, locale).toLowerCase()}.`,
      `${n} сам входит в список Рамбама: ${genLabel(path.entry.gen, locale)}.`)
  } else {
    summary = tr(locale,
      `${generationsLabel(path.entry.gen, locale)} בשלשלת הרמב״ם, ועוד ${linksLabel(path.hops, locale)} עד ${n}.`,
      `${generationsLabel(path.entry.gen, locale)} on the Rambam’s chain, then ${linksLabel(path.hops, locale)} down to ${n}.`,
      `${generationsLabel(path.entry.gen, locale)} по цепи Рамбама, затем ${linksLabel(path.hops, locale)} до ${n}.`)
  }
  const badge = path.direct
    ? { text: SP.direct[locale], strong: true }
    : path.byKind.influence > 0
      ? { text: inspirationsLabel(path.byKind.influence, locale), strong: false }
      : { text: tr(locale, 'כולל קשרי משפחה והנהגה', 'includes family and succession links', 'включая семью и преемство'), strong: false }
  return (
    <header className="text-center">
      <p className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-gold-400">{SP.title[locale]}</p>
      <h2 className="mt-1.5 font-serif text-2xl md:text-3xl font-bold text-ink-50 leading-tight [overflow-wrap:anywhere]">
        {isMoses ? tr(locale, 'משה רבנו בסיני', 'Moses at Sinai', 'Моше у Синая') : tr(locale, `מסיני עד ${n}`, `From Sinai to ${n}`, `От Синая до ${n}`)}
      </h2>
      <p className="mt-2 text-sm font-sans text-ink-300 leading-relaxed">{summary}</p>
      {!isMoses && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-sans font-semibold border',
            badge.strong ? 'border-gold-500/60 bg-gold-500/15 text-gold-300' : 'border-ink-600/60 bg-ink-800/60 text-ink-200',
          )}>
            {badge.strong && <span aria-hidden>✓</span>}
            {badge.text}
          </span>
          {onJump && (
            <button onClick={onJump} className="h-7 px-3 rounded-full text-xs font-sans text-ink-300 border border-ink-700 hover:text-gold-300 hover:border-gold-500/40 transition-colors">
              {tr(locale, `אל ${n}`, `Jump to ${n}`, `К: ${n}`)} <span aria-hidden>↓</span>
            </button>
          )}
        </div>
      )}
    </header>
  )
}

/* ── No route ─────────────────────────────────────────────────────────── */

function NoPath({ locale, sage, si, idx, sages, sageMap, name, yearsOf, onOpen, onPick, picker }: {
  locale: Locale
  sage: Sage | undefined
  si: SinaiIndex
  idx: LineageIndex
  sages: Sage[]
  sageMap: Map<string, Sage>
  name: (id: string | null | undefined) => string
  yearsOf: (s: Sage | undefined) => string
  onOpen: (id: string) => void
  onPick: (id: string) => void
  picker?: ReactNode
}) {
  const trail = useMemo(() => (sage && !beforeSinai(sage) ? sinaiTrail(si, idx, sage.id) : []), [si, idx, sage])
  const nearby = useMemo(() => nearbyReaching(sage, sages, si, idx), [sage, sages, si, idx])
  const n = sage ? name(sage.id) : ''
  const top = trail.length > 1 ? sageMap.get(trail[0].id!) : undefined

  let message: string
  if (!sage) {
    message = tr(locale,
      'בחרו חכם כדי לראות את דרכו אל סיני. בינתיים, הנה שלשלת הדורות כפי שמנה אותה הרמב״ם.',
      'Choose a sage to see their road to Sinai. Meanwhile, here are the generations as the Rambam counts them.',
      'Выберите мудреца, чтобы увидеть его путь к Синаю. А пока — поколения по счёту Рамбама.')
  } else if (beforeSinai(sage)) {
    message = tr(locale,
      `${n} שייך לתקופת האבות, שקדמה למתן תורה בסיני. שלשלת הקבלה מתחילה במשה רבנו:`,
      `${n} belongs to the age of the patriarchs, before the Torah was given at Sinai. The chain of transmission begins with Moses:`,
      `${n} относится к эпохе праотцов, до дарования Торы на Синае. Цепь передачи начинается с Моисея:`)
  } else if (top) {
    message = tr(locale,
      `המאגר עדיין לא מתעד דרך רצופה מ${n} אל שלשלת הקבלה. העקבות מגיעים עד ${name(top.id)}, ומשם רבותיו עדיין לא תועדו.`,
      `The archive doesn’t yet record an unbroken route from ${n} to the chain. The trail reaches back to ${name(top.id)}, whose own teachers aren’t recorded yet.`,
      `В архиве пока нет непрерывного пути от «${n}» к цепи. След ведёт до «${name(top.id)}», чьи учителя ещё не записаны.`)
  } else {
    message = tr(locale,
      `המאגר עדיין לא מתעד את רבותיו של ${n} או את מי שהשפיע עליו, ולכן עוד אי אפשר לשרטט את דרכו אל סיני.`,
      `The archive doesn’t yet record ${n}’s teachers or influences, so their road to Sinai can’t be drawn yet.`,
      `В архиве пока нет учителей и влияний «${n}», поэтому путь к Синаю ещё не построить.`)
  }

  return (
    <section className="glass rounded-2xl shadow-glass p-5 md:p-6 text-center animate-fade-in">
      <p className="text-[11px] font-sans font-semibold tracking-[0.2em] uppercase text-gold-400">{SP.title[locale]}</p>
      {sage && (
        <>
          <h2 className="mt-1.5 font-serif text-2xl font-bold text-ink-50 [overflow-wrap:anywhere]">{n}</h2>
          <p className="mt-1 text-xs font-sans text-ink-400">{[ERA_LABELS[sage.period]?.[locale], yearsOf(sage)].filter(Boolean).join(' · ')}</p>
        </>
      )}
      <p className="mt-3 text-sm font-sans text-ink-200 leading-relaxed">{message}</p>

      {trail.length > 1 && (
        <div className="mt-4 text-start">
          <ol className="sp-river-list sp-trail" aria-label={tr(locale, 'העקבות במאגר', 'The trail in the archive', 'След в архиве')}>
            <li className="sp-row sp-gap" style={{ '--ny': '14px' } as CSSProperties}>
              <div className="sp-river" aria-hidden><span className="sp-seg sp-gapline" style={{ top: 0, bottom: 0 }} /></div>
              <div className="sp-main"><span className="text-[11.5px] font-sans italic text-ink-400">{tr(locale, 'כאן נעצרים העקבות במאגר', 'Here the archive’s trail stops', 'Здесь след в архиве обрывается')}</span></div>
            </li>
            {trail.map((s, i) => (
              <RowView
                key={s.id}
                p={{
                  row: { t: 'sage', id: s.id!, above: i ? trail[i - 1].id : null, kind: s.kind as LineageKind, reoriented: s.reoriented, focus: i === trail.length - 1 },
                  in: i ? s.kind : null,
                  out: trail[i + 1]?.kind ?? null,
                }}
                delay={0} dur={0}
                locale={locale} sageMap={sageMap} name={name} yearsOf={yearsOf} onOpen={onOpen}
              />
            ))}
          </ol>
        </div>
      )}

      {nearby.length > 0 && (
        <>
          <p className="mt-5 text-xs font-sans text-ink-400">
            {tr(locale, 'חכמים סמוכים שדרכם לסיני מתועדת:', 'Nearby sages whose road to Sinai is recorded:', 'Близкие мудрецы с записанным путём к Синаю:')}
          </p>
          <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
            {nearby.map(s => (
              <li key={s.id}>
                <button
                  onClick={() => onPick(s.id)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-sans border border-ink-700 text-ink-200 hover:border-gold-500/50 hover:text-gold-300 transition-colors"
                >
                  <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: ERA_COLORS[s.period] }} />
                  {displayName(s.label)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {picker && <div className="mt-4 mx-auto max-w-sm text-start">{picker}</div>}
      {sage && (
        <button onClick={() => onOpen(sage.id)} className="mt-4 text-xs font-sans text-ink-400 hover:text-gold-300 underline underline-offset-4">
          {tr(locale, `פתח את הכרטיס של ${n}`, `Open ${n}’s card`, `Открыть карточку: ${n}`)}
        </button>
      )}
    </section>
  )
}

/** Sages close in time and place whose road does reach the chain. */
function nearbyReaching(focus: Sage | undefined, sages: Sage[], si: SinaiIndex, idx: LineageIndex, limit = 6): Sage[] {
  const pool = sages.filter(s => s.id !== focus?.id && si.best.has(s.id) && !si.onChain.has(s.id))
  const deg = (id: string) => Math.min(idx.degree.get(id) ?? 0, 10)
  if (!focus) return pool.sort((a, b) => deg(b.id) - deg(a.id)).slice(0, limit)
  const fy = chronoYear(focus)
  const fr = new Set(regionsOf(focus.location))
  if (focus.region) fr.add(focus.region)
  const era = (s: Sage) => ALL_PERIODS.indexOf(s.period)
  return pool
    .map(s => {
      const y = chronoYear(s)
      const eraGap = Math.abs(era(s) - era(focus))
      const years = fy != null && y != null ? Math.abs(fy - y) : 150 + eraGap * 200
      const sameRegion = regionsOf(s.location).some(r => fr.has(r)) || (!!s.region && fr.has(s.region))
      return { s, score: eraGap * 400 + years - (sameRegion ? 120 : 0) - deg(s.id) * 4 }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(x => x.s)
}

/* ── One row of the river ─────────────────────────────────────────────── */

function RowView({ p, delay, dur, locale, sageMap, name, yearsOf, onOpen }: {
  p: Placed
  delay: number
  dur: number
  locale: Locale
  sageMap: Map<string, Sage>
  name: (id: string | null | undefined) => string
  yearsOf: (s: Sage | undefined) => string
  onOpen: (id: string) => void
}) {
  const { row } = p
  const style = { '--d': `${Math.round(delay)}ms`, '--dur': `${Math.round(dur)}ms` } as Record<string, string>
  const segs = (
    <>
      {p.in && <span className={`sp-seg k-${p.in}`} style={{ top: 0, height: 'var(--ny)' }} />}
      {p.out && <span className={`sp-seg k-${p.out}`} style={{ top: 'var(--ny)', bottom: 0 }} />}
    </>
  )

  if (row.t === 'summit') {
    return (
      <li className="sp-row sp-summit" style={style}>
        <div className="sp-river" aria-hidden>
          {segs}
          <svg className="sp-mount" viewBox="0 0 40 32" width="40" height="32">
            <path d="M20 3v4M11 6l2 3M29 6l-2 3" strokeWidth="1.6" strokeLinecap="round" className="sp-rays" />
            <path d="M2 30 L15 11 L20 17 L25 12 L38 30 Z" className="sp-peak" />
            <path d="M15 11 L18 15.5 L20 17 M25 12 L22.5 15.5" className="sp-snow" />
          </svg>
        </div>
        <div className="sp-main">
          <p className="font-serif text-lg font-bold text-gold-300 leading-tight">{SP.mountain[locale]}</p>
          <p className="text-[11px] font-sans text-ink-400">{SP.givingTorah[locale]}</p>
        </div>
        <div className="sp-meta">
          <p className="font-serif text-[13px] italic leading-snug text-ink-300">{SP.avot[locale]}</p>
        </div>
      </li>
    )
  }

  if (row.t === 'band') {
    return (
      <li className="sp-row sp-band" style={style}>
        <div className="sp-river" aria-hidden>{p.out && <span className={`sp-seg k-${p.out}`} style={{ top: 0, bottom: 0 }} />}</div>
        <div className="sp-main sp-band-text">
          <span className="text-[10.5px] font-sans font-semibold tracking-[0.14em] uppercase text-ink-400">{SP.fromArchive[locale]}</span>
        </div>
      </li>
    )
  }

  if (row.t === 'station') {
    const { st, entry } = row
    const main = st.ids[0] ? sageMap.get(st.ids[0]) : undefined
    // One named person, present in the corpus: the station's name opens them.
    const single = st.station.match.length === 1 && st.ids.length === 1
    const compact = !st.ids.length && !st.alongside.some(a => a.ids.length)
    const years = main ? yearsOf(main) || ERA_LABELS[main.period]?.[locale] : ''
    const cls = cn('sp-row sp-station', compact && 'sp-compact', entry && 'sp-entry')
    return (
      <li className={cls} style={{ ...style, '--c': main ? ERA_COLORS[main.period] : undefined } as CSSProperties}>
        <div className="sp-river" aria-hidden>
          {segs}
          <span className={cn('sp-node', !main && 'sp-hollow', entry && 'sp-node-entry')} />
        </div>
        <div className="sp-main">
          {single ? (
            <button onClick={() => onOpen(st.ids[0])} className={cn('sp-name', entry === st.ids[0] && 'sp-hit')}>
              {st.station.name[locale]}
            </button>
          ) : (
            <span className={cn(compact ? 'sp-name-quiet' : 'sp-name-text')}>{st.station.name[locale]}</span>
          )}
          {!single && st.ids.length > 0 && (
            <span className="sp-chips">
              {st.ids.map(id => (
                <button key={id} onClick={() => onOpen(id)} className={cn('sp-chip', entry === id && 'sp-hit')}>{shortName(sageMap.get(id)?.label)}</button>
              ))}
            </span>
          )}
        </div>
        <div className="sp-meta">
          <span className="sp-gen">{genLabel(st.gen, locale)}</span>
          {years && <span className="sp-years">{years}</span>}
          {st.alongside.map((a, i) => {
            const all = a.ids.length === st.station.alongside![i].match.length
            return (
              <span key={i} className="sp-aside">
                <span className="text-ink-500">{SP.alongside[locale]} </span>
                {!all && <span>{a.name[locale]} </span>}
                {a.ids.map(id => (
                  <button key={id} onClick={() => onOpen(id)} className={cn('sp-chip sp-chip-sm', entry === id && 'sp-hit')}>{shortName(sageMap.get(id)?.label)}</button>
                ))}
              </span>
            )
          })}
          {entry && (
            <span className="sp-join">
              <span aria-hidden>↓ </span>{SP.joinsHere[locale]}
              {!(single && entry === st.ids[0]) && <> · {shortName(sageMap.get(entry)?.label)}</>}
            </span>
          )}
        </div>
      </li>
    )
  }

  // An archive step.
  const s = sageMap.get(row.id)
  const above = row.above ? sageMap.get(row.above) : undefined
  const leap = row.above && row.kind !== 'teacher' ? leapCenturies(above, s) : null
  const fem = !!s?.tags?.includes('נשים')
  return (
    <li
      className={cn('sp-row sp-sage', row.focus && 'sp-focus')}
      style={{ ...style, '--c': s ? ERA_COLORS[s.period] : undefined } as CSSProperties}
      aria-current={row.focus ? 'true' : undefined}
    >
      <div className="sp-river" aria-hidden>
        {segs}
        <span className={cn('sp-node', row.focus && 'sp-node-focus')} />
      </div>
      <div className="sp-main">
        <button onClick={() => onOpen(row.id)} className={cn('sp-name', row.focus && 'sp-name-focus')}>{name(row.id)}</button>
      </div>
      <div className="sp-meta">
        <span className="sp-years">{yearsOf(s) || (s && ERA_LABELS[s.period]?.[locale])}</span>
        {row.above && (
          <span className={cn('sp-rel', `sp-rel-${row.kind}`)}>
            {receivedFrom(row.kind, name(row.above), locale, fem)}
            {leap && <span className="text-ink-500"> · {leapLabel(leap, locale)}</span>}
          </span>
        )}
      </div>
    </li>
  )
}

/* Layout: on phones the river runs down the start edge with the text beside
   it; from 768px it runs down the middle, names on one bank and dates and
   side notes on the other. --ny is where the node sits (the first line of the
   name), --d/--dur time the reveal from Sinai downward. */
const SINAI_CSS = `
.sp-root { scroll-behavior: smooth; }
.sp-root .sp-river-list { list-style: none; margin-inline: 0; padding: 0; }
.sp-root .sp-row { --ny: 19px; position: relative; display: grid; grid-template-columns: 2.75rem minmax(0, 1fr);
  grid-template-areas: "river main" "river meta"; column-gap: .5rem; padding-block: 8px 12px; }
.sp-root .sp-river { grid-area: river; position: relative; align-self: stretch; margin-block: -8px -12px; }
.sp-root .sp-main { grid-area: main; min-width: 0; }
.sp-root .sp-meta { grid-area: meta; min-width: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; margin-top: 2px; }
.sp-root .sp-compact { --ny: 13px; padding-block: 4px 6px; }
.sp-root .sp-compact .sp-river { margin-block: -4px -6px; }
.sp-root .sp-summit { --ny: 18px; padding-block: 0 14px; }
.sp-root .sp-summit .sp-river { margin-block: 0 -14px; }
.sp-root .sp-band { --ny: 0px; padding-block: 6px 10px; }
.sp-root .sp-band .sp-river { margin-block: -6px -10px; }
.sp-root .sp-gap { padding-block: 2px 6px; }
.sp-root .sp-gap .sp-river { margin-block: -2px -6px; }
.sp-root .sp-focus { --ny: 22px; padding-block: 10px 14px; }
.sp-root .sp-focus .sp-river { margin-block: -10px -14px; }

.sp-root .sp-mount { position: absolute; left: 50%; top: 0; transform: translateX(-50%); overflow: visible; filter: drop-shadow(0 0 10px rgb(var(--gold-400-rgb) / .45)); }
.sp-root .sp-peak { fill: rgb(var(--gold-500-rgb) / .22); stroke: var(--gold-400); stroke-width: 1.6; stroke-linejoin: round; }
.sp-root .sp-snow { fill: none; stroke: var(--gold-300); stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round; }
.sp-root .sp-rays { stroke: var(--gold-300); fill: none; }

.sp-root .sp-node { position: absolute; left: 50%; top: var(--ny); width: 13px; height: 13px; border-radius: 50%; transform: translate(-50%, -50%);
  background: var(--c, var(--gold-400)); border: 2.5px solid var(--ink-900); box-shadow: 0 0 0 1.5px var(--c, var(--gold-400)); }
.sp-root .sp-compact .sp-node, .sp-root .sp-hollow { width: 9px; height: 9px; background: var(--ink-900); border: 1.5px solid rgb(var(--gold-500-rgb) / .7); box-shadow: none; }
.sp-root .sp-node-entry { box-shadow: 0 0 0 1.5px var(--c, var(--gold-400)), 0 0 0 6px rgb(var(--gold-500-rgb) / .22); }
.sp-root .sp-node-focus { width: 19px; height: 19px; border-width: 3px; box-shadow: 0 0 0 2px var(--gold-400), 0 0 18px rgb(var(--gold-400-rgb) / .55); }
.sp-root .sp-gapline { width: 2px; background: repeating-linear-gradient(to bottom, rgb(var(--ink-500-rgb) / .7) 0 2px, transparent 2px 6px);
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000); mask-image: linear-gradient(to bottom, transparent, #000); }

.sp-root .sp-name, .sp-root .sp-name-text { font-family: "Frank Ruhl Libre", Georgia, serif; font-size: 16.5px; font-weight: 700; line-height: 1.3; color: var(--ink-50); text-align: start; }
.sp-root .sp-name { border-radius: 6px; padding: 0 2px; margin: 0 -2px; text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 4px; transition: color .15s, text-decoration-color .15s; }
.sp-root .sp-name:hover { color: var(--gold-300); text-decoration-color: rgb(var(--gold-500-rgb) / .6); }
.sp-root .sp-name-focus { font-size: 20px; color: var(--gold-300); }
.sp-root .sp-name-quiet { font-family: "Frank Ruhl Libre", Georgia, serif; font-size: 14px; font-weight: 600; color: var(--ink-200); }
.sp-root .sp-hit { color: var(--gold-300); }
.sp-root .sp-chips { display: inline-flex; flex-wrap: wrap; gap: 4px; margin-inline-start: 8px; vertical-align: 2px; }
.sp-root .sp-chip { font-family: inherit; font-size: 12px; line-height: 1; padding: 5px 8px; border-radius: 999px; border: 1px solid rgb(var(--ink-600-rgb) / .7);
  color: var(--ink-200); background: rgb(var(--ink-800-rgb) / .6); transition: color .15s, border-color .15s; }
.sp-root .sp-chip:hover { color: var(--gold-300); border-color: rgb(var(--gold-500-rgb) / .5); }
.sp-root .sp-chip.sp-hit { color: var(--gold-300); border-color: rgb(var(--gold-500-rgb) / .8); background: rgb(var(--gold-500-rgb) / .14); }
.sp-root .sp-chip-sm { font-size: 11px; padding: 4px 7px; margin-inline-end: 3px; margin-block: 1px; }
.sp-root .sp-gen { font-size: 10.5px; font-weight: 600; letter-spacing: .02em; color: rgb(var(--gold-500-rgb) / .95); font-variant-numeric: tabular-nums; }
.sp-root .sp-compact .sp-gen { color: var(--ink-500); }
.sp-root .sp-years { font-size: 11.5px; color: var(--ink-400); font-variant-numeric: tabular-nums; }
.sp-root .sp-rel { flex-basis: 100%; font-size: 12px; color: var(--ink-300); }
.sp-root .sp-rel-teacher { color: var(--gold-300); }
.sp-root .sp-aside { flex-basis: 100%; font-size: 11.5px; color: var(--ink-300); line-height: 1.9; }
.sp-root .sp-join { flex-basis: 100%; font-size: 11.5px; font-weight: 600; color: var(--gold-300); }
.sp-root .sp-focus .sp-main, .sp-root .sp-focus .sp-meta { position: relative; }
.sp-root .sp-focus::before { content: ''; position: absolute; inset: 2px -8px; border-radius: 14px; background: rgb(var(--gold-500-rgb) / .07);
  border: 1px solid rgb(var(--gold-500-rgb) / .25); pointer-events: none; }
.sp-root button:focus-visible { outline: 2px solid var(--gold-400); outline-offset: 2px; }
.sp-root .sp-trail .sp-row:first-child .sp-river { margin-top: 0; }

@media (min-width: 768px) {
  .sp-root .sp-river-list:not(.sp-trail) .sp-row { grid-template-columns: minmax(0, 1fr) 4rem minmax(0, 1fr); grid-template-areas: "main river meta"; column-gap: .75rem; }
  .sp-root .sp-river-list:not(.sp-trail) .sp-main { text-align: end; }
  .sp-root .sp-river-list:not(.sp-trail) .sp-name, .sp-root .sp-river-list:not(.sp-trail) .sp-name-text { text-align: end; }
  .sp-root .sp-river-list:not(.sp-trail) .sp-meta { margin-top: 0; padding-top: 3px; }
  .sp-root .sp-river-list:not(.sp-trail) .sp-chips { margin-inline: 0 8px; }
  .sp-root .sp-river-list:not(.sp-trail) .sp-main:has(.sp-chips) { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: baseline; gap: 4px 0; }
  .sp-root .sp-river-list:not(.sp-trail) .sp-band-text { grid-column: 1 / -1; grid-row: 1; text-align: center; background: none; }
  .sp-root .sp-river-list:not(.sp-trail) .sp-band .sp-main { padding-block: 2px; }
  .sp-root .sp-river-list:not(.sp-trail) .sp-band-text > span { display: inline-block; padding: 2px 10px; border-radius: 999px; background: var(--ink-900); position: relative; }
  .sp-root .sp-river-list:not(.sp-trail) .sp-focus::before { inset: 2px -12px; }
}

.sp-root .sp-anim .sp-river { animation: sp-draw var(--dur) cubic-bezier(.35, .6, .35, 1) var(--d) both; }
.sp-root .sp-anim .sp-main, .sp-root .sp-anim .sp-meta { animation: sp-rise .45s ease-out calc(var(--d) + 90ms) both; }
.sp-root .sp-anim .sp-node-focus { animation: sp-pulse 1.8s ease-out calc(var(--d) + 350ms) 2; }
@keyframes sp-draw { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 -2px 0); } }
@keyframes sp-rise { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: none; } }
@keyframes sp-pulse {
  0% { box-shadow: 0 0 0 2px var(--gold-400), 0 0 0 0 rgb(var(--gold-400-rgb) / .55); }
  100% { box-shadow: 0 0 0 2px var(--gold-400), 0 0 0 16px rgb(var(--gold-400-rgb) / 0); }
}
@media (prefers-reduced-motion: reduce) {
  .sp-root { scroll-behavior: auto; }
  .sp-root .sp-anim .sp-river, .sp-root .sp-anim .sp-main, .sp-root .sp-anim .sp-meta, .sp-root .sp-anim .sp-node-focus { animation: none; }
}
`
