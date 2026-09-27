// The sage page's "הדרך לסיני" card: the road from Sinai to this sage,
// condensed to Moses → … → where it joins the Rambam's chain → … → the sage,
// with a link to the full river in the lineage tab. A server component: the
// path is computed from the bundled corpus (lib/serverData.ts) at render, so
// the card ships as plain HTML with no script.

import Link from 'next/link'
import { getAllConnections, getAllSages } from '@/lib/serverData'
import { localizeSage } from '@/lib/serverDataTranslator'
import { formatYearRangeFor } from '@/lib/utils'
import { ERA_COLORS, ERA_LABELS } from '@/lib/types'
import type { Locale, Sage } from '@/lib/types'
import { beforeSinai, buildSinaiIndex, sinaiPath, sinaiTrail } from '@/lib/sinaiPath'
import type { SinaiIndex, SinaiStep, SinaiStepKind } from '@/lib/sinaiPath'
import { buildLineageIndex } from './lineage'
import type { LineageIndex } from './lineage'
import { SINAI_LINE_CSS, SP, genLabel, inspirationsLabel, ruPlural, shortName } from './SinaiPathText'

const S = {
  stations: (n: number, l: Locale) =>
    l === 'he' ? `${n} תחנות בדרך` : l === 'en' ? `${n} stations on the road` : `${n} ${ruPlural(n, 'остановка', 'остановки', 'остановок')} в пути`,
  moreGens: (n: number, l: Locale) =>
    l === 'he' ? (n === 1 ? 'ועוד דור אחד' : `ועוד ${n} דורות`) : l === 'en' ? `${n} more generation${n === 1 ? '' : 's'}` : `ещё ${n} ${ruPlural(n, 'поколение', 'поколения', 'поколений')}`,
  moreSages: (n: number, l: Locale) =>
    l === 'he' ? (n === 1 ? 'ועוד חכם אחד' : `ועוד ${n} חכמים`) : l === 'en' ? `${n} more sage${n === 1 ? '' : 's'}` : `ещё ${n} ${ruPlural(n, 'мудрец', 'мудреца', 'мудрецов')}`,
  note: {
    he: 'שלשלת הדורות לפי הקדמת הרמב״ם למשנה תורה. קו מקווקו הוא השראה ולא קבלה ישירה.',
    en: 'The generations follow the Rambam’s introduction to the Mishneh Torah. A dashed line is inspiration, not direct transmission.',
    ru: 'Поколения даны по предисловию Рамбама к «Мишне Тора». Пунктир — вдохновение, а не прямая передача.',
  } as Record<Locale, string>,
  seeChain: { he: 'לשלשלת הדורות מסיני', en: 'See the generations from Sinai', ru: 'Поколения от Синая' } as Record<Locale, string>,
}

let cache: { si: SinaiIndex; idx: LineageIndex; sages: Map<string, Sage> } | null = null
function corpus() {
  if (cache) return cache
  const all = getAllSages()
  const sages = new Map(all.map(s => [s.id, s]))
  const idx = buildLineageIndex(sages, getAllConnections())
  cache = { si: buildSinaiIndex(all, idx), idx, sages }
  return cache
}

interface Node { id: string | null; name: string; sub: string; period?: Sage['period']; self?: boolean }
type Piece = { t: 'node'; n: Node } | { t: 'link'; kind: SinaiStepKind; label?: string }

export function SinaiPathCard({ sageId, locale }: { sageId: string; locale: Locale }) {
  const { si, idx, sages } = corpus()
  const sage = sages.get(sageId)
  if (!sage) return null
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const href = `/${locale}?tab=genealogy&sage=${encodeURIComponent(sageId)}&view=sinai`
  const nameOf = (id: string) => shortName(localizeSage(sages.get(id)!, locale).label)
  const yearsOf = (id: string) => {
    const s = sages.get(id)!
    return formatYearRangeFor(locale, s.birth_year, s.death_year, s.date_precision) || ERA_LABELS[s.period]?.[locale] || ''
  }
  const path = sinaiPath(si, sageId)
  const selfName = shortName(localizeSage(sage, locale).label)

  const head = (count?: string) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <svg aria-hidden className="h-5 w-5 flex-shrink-0 text-gold-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round">
        <path d="M2.5 20 10 8.5l3.2 4.8 2.3-3L21.5 20z" /><path d="M12 3.5v2.2M7.4 5.3l1.1 1.6M16.6 5.3l-1.1 1.6" />
      </svg>
      <h2 id="sinai-title" className="font-serif text-lg font-bold text-ink-50">{SP.title[locale]}</h2>
      {count && <span className="rounded-full bg-ink-700/60 px-2 py-0.5 text-[11px] tabular-nums text-ink-300">{count}</span>}
    </div>
  )
  const more = (label: string) => (
    <Link href={href} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 text-sm font-semibold text-gold-300 transition-colors hover:bg-gold-500/20">
      {label}
      <svg aria-hidden className="h-3.5 w-3.5 rtl:-scale-x-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )

  // ── No recorded road ────────────────────────────────────────────────────
  if (!path) {
    const trail = beforeSinai(sage) ? [] : sinaiTrail(si, idx, sageId)
    const top = trail.length > 1 ? trail[0].id! : null
    const text = beforeSinai(sage)
      ? ({
          he: `${selfName} שייך לתקופת האבות, שקדמה למתן תורה בסיני, שבו מתחילה שלשלת הקבלה.`,
          en: `${selfName} belongs to the age of the patriarchs, before the Torah was given at Sinai, where the chain of transmission begins.`,
          ru: `${selfName} относится к эпохе праотцов, до дарования Торы на Синае, с которого начинается цепь передачи.`,
        })[locale]
      : top
        ? ({
            he: `המאגר עדיין לא מתעד דרך רצופה מ${selfName} אל שלשלת הקבלה: העקבות מגיעים עד ${nameOf(top)}, ושם נעצרים.`,
            en: `The archive doesn’t yet record an unbroken road from ${selfName} to the chain of transmission: the trail reaches back to ${nameOf(top)} and stops there.`,
            ru: `В архиве пока нет непрерывного пути от «${selfName}» к цепи передачи: след ведёт до «${nameOf(top)}» и обрывается.`,
          })[locale]
        : ({
            he: `המאגר עדיין לא מתעד את רבותיו של ${selfName}, ולכן עוד אי אפשר לשרטט את דרכו אל סיני.`,
            en: `The archive doesn’t yet record ${selfName}’s teachers, so the road to Sinai can’t be drawn yet.`,
            ru: `В архиве пока нет учителей «${selfName}», поэтому путь к Синаю ещё не построить.`,
          })[locale]
    return (
      <section aria-labelledby="sinai-title" dir={dir} className="no-print mt-10 rounded-2xl border border-ink-700/40 bg-ink-800/25 p-4 md:p-5">
        {head()}
        <p className="mt-2 text-sm leading-relaxed text-ink-300">{text}</p>
        <div className="mt-3">{more(S.seeChain[locale])}</div>
      </section>
    )
  }

  // ── Condensed road: Moses → … → entry → … → the one above → the sage ────
  const steps = path.steps
  const pieces: Piece[] = []
  const stationNode = (st: SinaiStep): Node => {
    const station = si.chain[st.gen! - 1]
    // A station the path passes through by one named person shows that person.
    const personal = st.id && (st.id === path.entry.id ? (path.entry.alongside || station.ids.length > 1) : false)
    return {
      id: st.id,
      name: personal ? nameOf(st.id!) : station.station.name[locale],
      sub: genLabel(st.gen!, locale),
      period: st.id ? sages.get(st.id)!.period : undefined,
      self: st.id === sageId,
    }
  }
  const dataNode = (st: SinaiStep): Node => ({
    id: st.id, name: nameOf(st.id!), sub: yearsOf(st.id!), period: sages.get(st.id!)!.period, self: st.id === sageId,
  })
  const entryAt = path.entry.gen - 1          // index of the entry station in steps
  pieces.push({ t: 'node', n: stationNode(steps[0]) })
  if (entryAt > 0) {
    const hidden = entryAt - 1
    pieces.push({ t: 'link', kind: 'chain', label: hidden ? S.moreGens(hidden, locale) : undefined })
    pieces.push({ t: 'node', n: stationNode(steps[entryAt]) })
  }
  if (path.hops > 0) {
    const data = steps.slice(entryAt + 1)      // the archive steps, the sage last
    const shownFrom = Math.max(0, data.length - 2)
    if (shownFrom > 0) {
      // Folded links draw as the weakest among them: one inspiration makes the stretch dashed.
      const folded = data.slice(0, shownFrom + 1)
      const kind = folded.some(s => s.kind === 'influence') ? 'influence'
        : folded.some(s => s.kind === 'family') ? 'family'
          : folded.some(s => s.kind === 'predecessor') ? 'predecessor' : 'teacher'
      pieces.push({ t: 'link', kind, label: S.moreSages(shownFrom, locale) })
    } else pieces.push({ t: 'link', kind: data[0].kind })
    data.slice(shownFrom).forEach((st, i) => {
      if (i > 0) pieces.push({ t: 'link', kind: st.kind })
      pieces.push({ t: 'node', n: dataNode(st) })
    })
  }

  const badge = path.direct ? SP.direct[locale] : path.byKind.influence ? inspirationsLabel(path.byKind.influence, locale) : null

  return (
    <section aria-labelledby="sinai-title" dir={dir} className="sp-lines spc no-print mt-10 rounded-2xl border border-gold-500/20 p-4 md:p-6"
      style={{ background: `radial-gradient(120% 160% at ${dir === 'rtl' ? '100%' : '0%'} 0%, rgb(var(--gold-500-rgb) / .08) 0%, transparent 60%)` }}>
      <style>{SINAI_LINE_CSS + CARD_CSS}</style>
      {head(S.stations(steps.length, locale))}
      {steps.length === 1 ? (
        <p className="mt-3 font-serif text-base italic text-ink-200">{SP.avot[locale]}</p>
      ) : (
        <ol className="spc-road mt-5" aria-label={SP.title[locale]}>
          {pieces.map((p, i) => p.t === 'node' ? (
            <li key={i} className={`spc-node${p.n.self ? ' spc-self' : ''}`}>
              <span aria-hidden className="spc-dot" style={{ background: p.n.period ? ERA_COLORS[p.n.period] : undefined }} />
              <span className="spc-text">
                {p.n.id && !p.n.self
                  ? <Link href={`/${locale}/sage/${p.n.id}`} className="spc-name">{p.n.name}</Link>
                  : <span className="spc-name">{p.n.name}</span>}
                <span className="spc-sub">{p.n.sub}</span>
              </span>
            </li>
          ) : (
            <li key={i} className="spc-link" aria-hidden={!p.label}>
              <span aria-hidden className={`spc-line k-${p.kind}`} />
              {p.label && <span className="spc-more">{p.label}</span>}
            </li>
          ))}
        </ol>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[11.5px] leading-relaxed text-ink-400">
          {badge && <span className={`me-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${path.direct ? 'border-gold-500/50 text-gold-300' : 'border-ink-600/60 text-ink-300'}`}>{badge}</span>}
          {S.note[locale]}
        </p>
        {more(SP.fullView[locale])}
      </div>
    </section>
  )
}

/* The road runs down on phones and across (in reading direction) from 768px.
   Line styles come from SINAI_LINE_CSS; here only their orientation. */
const CARD_CSS = `
.spc .spc-road { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.spc .spc-node { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.spc .spc-dot { flex-shrink: 0; width: 12px; height: 12px; margin-top: 4px; border-radius: 50%; background: var(--gold-400);
  box-shadow: 0 0 0 2px var(--ink-900), 0 0 0 3.5px rgb(var(--gold-500-rgb) / .5); }
.spc .spc-self .spc-dot { width: 16px; height: 16px; margin-top: 3px; box-shadow: 0 0 0 2.5px var(--ink-900), 0 0 0 4.5px var(--gold-400), 0 0 14px rgb(var(--gold-400-rgb) / .5); }
.spc .spc-text { display: flex; flex-direction: column; min-width: 0; }
.spc .spc-name { font-family: "Frank Ruhl Libre", Georgia, serif; font-weight: 700; font-size: 15px; line-height: 1.3; color: var(--ink-100); }
.spc a.spc-name { text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 4px; transition: color .15s, text-decoration-color .15s; }
.spc a.spc-name:hover { color: var(--gold-300); text-decoration-color: rgb(var(--gold-500-rgb) / .6); }
.spc a.spc-name:focus-visible { outline: 2px solid var(--gold-400); outline-offset: 2px; border-radius: 4px; }
.spc .spc-self .spc-name { color: var(--gold-300); font-size: 17px; }
.spc .spc-sub { font-size: 11px; color: var(--ink-400); font-variant-numeric: tabular-nums; }
.spc .spc-link { position: relative; min-height: 26px; padding-inline-start: 26px; display: flex; align-items: center; }
.spc .spc-link:has(.spc-more) { min-height: 34px; }
.spc .spc-line { position: absolute; top: 2px; bottom: 2px; inset-inline-start: 6px; transform: translateX(-50%); }
[dir='rtl'].spc .spc-line { transform: translateX(50%); }
.spc .spc-line.k-chain, .spc .spc-line.k-sinai { width: 8px; border-inline: 1.5px solid var(--sp-chain); background: var(--sp-chain-fill); }
.spc .spc-line.k-teacher { width: 3px; border-radius: 2px; background: var(--sp-gold); }
.spc .spc-line.k-influence { width: 2px; background: repeating-linear-gradient(to bottom, var(--sp-infl) 0 5px, transparent 5px 9px); }
.spc .spc-line.k-predecessor { width: 2px; background: repeating-linear-gradient(to bottom, var(--sp-pred) 0 8px, transparent 8px 11px, var(--sp-pred) 11px 13px, transparent 13px 16px); }
.spc .spc-line.k-family { width: 3px; background: radial-gradient(circle, var(--sp-family) 1.3px, transparent 1.6px) center top / 3px 6px repeat-y; }
.spc .spc-more { font-size: 11.5px; font-style: italic; color: var(--ink-400); }
@media (min-width: 768px) {
  .spc .spc-road { flex-direction: row; align-items: flex-start; }
  .spc .spc-node { flex-direction: column; align-items: center; text-align: center; gap: 6px; flex: 0 1 auto; max-width: 11rem; }
  .spc .spc-text { align-items: center; }
  .spc .spc-link { flex: 1 1 3rem; min-width: 2.5rem; min-height: 0; height: 12px; margin-top: 4px; padding: 0 4px; justify-content: center; }
  .spc .spc-link:has(.spc-more) { min-height: 0; }
  .spc .spc-line { top: 50%; bottom: auto; inset-inline: 4px; height: 2px; width: auto !important; transform: translateY(-50%) !important; }
  .spc .spc-line.k-chain, .spc .spc-line.k-sinai { height: 8px; border-inline: 0; border-block: 1.5px solid var(--sp-chain); }
  .spc .spc-line.k-teacher { height: 3px; }
  .spc .spc-line.k-influence { background: repeating-linear-gradient(to right, var(--sp-infl) 0 5px, transparent 5px 9px); }
  .spc .spc-line.k-predecessor { background: repeating-linear-gradient(to right, var(--sp-pred) 0 8px, transparent 8px 11px, var(--sp-pred) 11px 13px, transparent 13px 16px); }
  .spc .spc-line.k-family { height: 3px; background: radial-gradient(circle, var(--sp-family) 1.3px, transparent 1.6px) left center / 6px 3px repeat-x; }
  .spc .spc-more { position: absolute; top: 14px; inset-inline: 0; text-align: center; white-space: nowrap; font-size: 11px; }
}
`
