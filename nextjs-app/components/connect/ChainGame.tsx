'use client'

// The sage chain (lib/chain.ts): two sages a day, the chain starts at the first, and the player names sages
// one at a time, each directly linked to the end of the chain, to reach the second in as few steps as
// possible. A sage who is not linked is a miss; five misses lose; the 2nd miss gives the era of a sage on the
// shortest route and the 4th his field. The net (names, eras, links) is in the page, so the check runs in the
// browser; the game is not a vault (the route is in the payload, as the riddle's answer is). The result is
// shared as emoji without a name. Everything the player did stays in this browser (localStorage
// `ozar-chain`, only through lib/chain.ts); a blocked storage only means no record is kept.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { track } from '@/lib/analytics'
import type { Locale } from '@/lib/types'
import {
  degreeOf, describePath, graphFromNet, linkBetween, shortestPath, stepCaption,
  type ConnectGraph, type ConnectNet,
} from '@/lib/connect'
import { flightHref } from '@/lib/connectFlight'
import { formatCountdown, nextRiddleAt } from '@/lib/riddle'
import {
  CHAIN_STORE_KEY, CHAIN_TITLE, MAX_MISSES, applyMove, chainHints, chainShareText, chainSteps, currentChainStreak,
  emptyChainState, parseChainState, startChainDay,
  type ChainDay, type ChainState, type ChainStats,
} from '@/lib/chain'
import { EraChip } from '@/components/ui/EraChip'
import { copyText, showToast } from '@/components/sages/Toast'
import { SageCombobox, type ComboSage } from './SageCombobox'
import { PathList, fill, periodOf, stepsLabel, type StationView } from './ConnectPicker'

const S = {
  intro: {
    he: 'חברו בין שני החכמים בשרשרת של חכמים קשורים, בכמה שפחות צעדים.',
    en: 'Connect the two sages through a chain of linked sages, in as few steps as you can.',
    ru: 'Соедините двух мудрецов цепочкой связанных мудрецов, сделав как можно меньше шагов.',
  },
  start: { he: 'התחלה', en: 'Start', ru: 'Старт' },
  target: { he: 'יעד', en: 'Target', ru: 'Цель' },
  yourChain: { he: 'השרשרת שלכם', en: 'Your chain', ru: 'Ваша цепочка' },
  pending: { he: 'החכם הבא בשרשרת', en: 'The next sage in the chain', ru: 'Следующий мудрец в цепочке' },
  misses: { he: 'טעויות: {i} מתוך {n}', en: 'Misses: {i} of {n}', ru: 'Ошибки: {i} из {n}' },
  streak: { he: 'רצף: {n} ימים', en: 'Streak: {n} days', ru: 'Серия: {n} дн.' },
  links: { he: 'קשרים ישירים של {name}: {n}', en: 'Direct links of {name}: {n}', ru: 'Прямых связей у «{name}»: {n}' },
  prompt: {
    he: 'שם של חכם שקשור ישירות אל {name}',
    en: 'Name a sage directly linked to {name}',
    ru: 'Назовите мудреца, напрямую связанного с «{name}»',
  },
  placeholder: { he: 'הקלידו שם של חכם…', en: 'Type a sage’s name…', ru: 'Введите имя мудреца…' },
  inputLabel: { he: 'החכם הבא בשרשרת. בחרו שם מהרשימה', en: 'The next sage in the chain. Pick a name from the list', ru: 'Следующий мудрец в цепочке. Выберите имя из списка' },
  add: { he: 'הוספה', en: 'Add', ru: 'Добавить' },
  missedLead: { he: 'אין קשר ישיר מתועד אל {name}:', en: 'No recorded direct link to {name}:', ru: 'Нет известной прямой связи с «{name}»:' },
  heardHit: { he: 'נוספה לשרשרת: {name}', en: 'Added to the chain: {name}', ru: 'Добавлено в цепочку: {name}' },
  heardMiss: {
    he: 'אין קשר ישיר מתועד בין {name} לבין {end}',
    en: 'No recorded direct link between {name} and {end}',
    ru: 'Нет известной прямой связи между «{name}» и «{end}»',
  },
  hintEra: { he: 'רמז: התקופה של אחד החכמים בדרך הקצרה', en: 'Hint: the era of a sage on the shortest route', ru: 'Подсказка: эпоха одного из мудрецов на кратчайшем пути' },
  hintField: { he: 'רמז: התחום של אותו חכם', en: 'Hint: the field of that sage', ru: 'Подсказка: область деятельности этого мудреца' },
  won: { he: 'הגעתם ליעד!', en: 'You made it!', ru: 'Вы добрались!' },
  wonIn: { he: '{steps} (הקצר ביותר: {best})', en: '{steps} (shortest: {best})', ru: '{steps} (кратчайший: {best})' },
  perfect: { he: 'זו הדרך הקצרה ביותר שיש.', en: 'That is the shortest route there is.', ru: 'Это кратчайший из возможных путей.' },
  lost: { he: 'הפעם לא הצלחתם', en: 'Not this time', ru: 'В этот раз не получилось' },
  lostSub: { he: 'נוצלו {n} טעויות', en: '{n} misses used', ru: 'Использовано ошибок: {n}' },
  shortest: { he: 'הדרך הקצרה ביותר: {steps}', en: 'The shortest route: {steps}', ru: 'Кратчайший путь: {steps}' },
  stations: { he: 'תחנות הדרך הקצרה ביותר', en: 'Stations of the shortest route', ru: 'Остановки кратчайшего пути' },
  chainStations: { he: 'תחנות השרשרת שלכם', en: 'Stations of your chain', ru: 'Остановки вашей цепочки' },
  fly: { he: 'לטוס במגדל הדורות', en: 'Fly it in the Tower of Generations', ru: 'Пролететь по Башне поколений' },
  shareHeading: { he: 'שתפו את התוצאה', en: 'Share your result', ru: 'Поделитесь результатом' },
  share: { he: 'שיתוף', en: 'Share', ru: 'Поделиться' },
  whatsapp: { he: 'שליחה בוואטסאפ', en: 'Send on WhatsApp', ru: 'Отправить в WhatsApp' },
  copied: { he: 'התוצאה הועתקה', en: 'Result copied', ru: 'Результат скопирован' },
  copyFailed: { he: 'לא ניתן להעתיק את התוצאה', en: 'Could not copy the result', ru: 'Не удалось скопировать результат' },
  shareNote: { he: 'התוצאה לא חושפת שמות של חכמים.', en: 'The result gives no sage’s name.', ru: 'Результат не называет ни одного мудреца.' },
  statsHeading: { he: 'הסטטיסטיקה שלכם', en: 'Your statistics', ru: 'Ваша статистика' },
  played: { he: 'משחקים', en: 'Played', ru: 'Игр' },
  winPct: { he: 'אחוז הצלחה', en: 'Win %', ru: '% побед' },
  current: { he: 'רצף נוכחי', en: 'Current streak', ru: 'Текущая серия' },
  best: { he: 'רצף שיא', en: 'Best streak', ru: 'Лучшая серия' },
  next: { he: 'השרשרת הבאה בעוד', en: 'Next chain in', ru: 'Следующая цепочка через' },
  newReady: { he: 'יש שרשרת חדשה!', en: 'A new chain is ready!', ru: 'Новая цепочка готова!' },
  reload: { he: 'לרענון הדף', en: 'Reload the page', ru: 'Обновить страницу' },
  stale: {
    he: 'כבר שיחקתם בשרשרת חדשה יותר מזו שבדף. רעננו את הדף כדי לראות אותה.',
    en: 'You have already played a newer chain than the one on this page. Reload to see it.',
    ru: 'Вы уже играли в более новую цепочку, чем на этой странице. Обновите страницу, чтобы увидеть её.',
  },
  howTo: { he: 'איך משחקים?', en: 'How to play', ru: 'Как играть' },
  howToLines: {
    he: [
      'בכל יום שני חכמים, אותם חכמים לכל המבקרים. מתחילים באחד, ורוצים להגיע לשני בשרשרת של חכמים שכל אחד מהם קשור ישירות לקודמו.',
      'בכל תור נותנים שם של חכם שקשור ישירות לסוף השרשרת: רבו, תלמידו, קרוב משפחה, חבר, יריב, או מי שהשפיע עליו או הושפע ממנו. אם הקשר מתועד, החכם מצטרף לשרשרת. אם לא, זו טעות.',
      'חמש טעויות מסיימות את המשחק. מהטעות השנייה מקבלים רמז על התקופה של חכם שנמצא בדרך הקצרה, ומהרביעית גם על התחום שלו.',
      'כל חכם שמצטרף לשרשרת הוא צעד: המטרה להגיע בכמה שפחות צעדים. בסוף רואים את הדרך הקצרה ביותר, ואפשר לשתף את התוצאה בלי שמות.',
    ],
    en: [
      'Every day, two sages, the same two for every visitor. You start at one and want to reach the other through a chain of sages, each directly linked to the one before.',
      'On each turn, name a sage who is directly linked to the end of your chain: a teacher, student, relative, colleague, rival, or someone who influenced or was influenced by him or her. If the link is recorded, the sage joins the chain. If not, it is a miss.',
      'Five misses end the game. From the second miss you get a hint about the era of a sage on the shortest route, and from the fourth about his or her field.',
      'Every sage who joins the chain is a step: aim to arrive in as few steps as you can. At the end you see the shortest route, and you can share your result without any names.',
    ],
    ru: [
      'Каждый день два мудреца, одни и те же для всех посетителей. Вы начинаете с одного и хотите добраться до другого цепочкой мудрецов, каждый из которых напрямую связан с предыдущим.',
      'В каждый ход назовите мудреца, напрямую связанного с концом цепочки: учителя, ученика, родственника, коллегу, оппонента или того, кто повлиял на него или на кого он повлиял. Если связь известна, мудрец присоединяется к цепочке. Если нет, это ошибка.',
      'Пять ошибок заканчивают игру. После второй ошибки вы получаете подсказку об эпохе одного из мудрецов на кратчайшем пути, после четвёртой также об области его деятельности.',
      'Каждый мудрец в цепочке это шаг: старайтесь дойти за как можно меньше шагов. В конце вы увидите кратчайший путь и сможете поделиться результатом без имён.',
    ],
  },
} satisfies Record<string, Record<Locale, string | string[]>>

const primary = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-900 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50'
const secondary = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gold-500/40 px-4 py-2 text-sm text-gold-200 transition-colors hover:bg-gold-500/10'

export function ChainGame({ locale, net, day, pageUrl }: { locale: Locale; net: ConnectNet; day: ChainDay; pageUrl: string }) {
  const graph = useMemo(() => graphFromNet(net), [net])
  const info = useMemo(
    () => new Map(net.sages.map(([id, name, period, woman]) => [id, { name, period: periodOf(period), woman: woman === 1 }])),
    [net],
  )
  const degree = useMemo(() => new Map(net.sages.map(s => [s[0], degreeOf(graph, s[0])])), [net, graph])
  const linked = useCallback((x: string, y: string) => linkBetween(graph, x, y) !== null, [graph])

  const [state, setState] = useState<ChainState>(() => startChainDay(emptyChainState(), day.day, day.a))
  // the browser holds a newer day than this (cached) page: play nothing, and leave what it holds alone
  const [stale, setStale] = useState(false)
  /** The sage chosen from the list, not yet added. */
  const [picked, setPicked] = useState<string | null>(null)
  /** What the last move did, for a screen reader. */
  const [heard, setHeard] = useState('')
  const endRef = useRef<HTMLElement>(null)

  // What this browser played before (the server has no storage to read)
  useEffect(() => {
    let raw: string | null = null
    try { raw = window.localStorage.getItem(CHAIN_STORE_KEY) } catch { /* storage blocked: no record is kept */ }
    const saved = parseChainState(raw)
    if (saved.day > day.day) { setStale(true); return }
    // a chain that names a sage the net no longer holds cannot be shown: start the day over, keep the stats
    const usable = saved.chain.every(id => info.has(id))
    setState(startChainDay(usable ? saved : { ...saved, day: 0 }, day.day, day.a))
  }, [day.day, day.a, info])

  const end = state.chain[state.chain.length - 1]
  const endName = info.get(end)?.name ?? ''

  const submit = useCallback((id: string) => {
    if (stale || state.done) return
    const { state: next, outcome } = applyMove(state, id, day, linked)
    if (outcome === 'refused') return
    if (state.moves === '') track('chain_start', { locale })
    setState(next)
    setPicked(null)
    setHeard(fill(outcome === 'hit' ? S.heardHit[locale] : S.heardMiss[locale], { name: info.get(id)?.name ?? '', end: endName }))
    try { window.localStorage.setItem(CHAIN_STORE_KEY, JSON.stringify(next)) } catch { /* storage blocked */ }
    if (next.done) {
      track('chain_complete', { locale, won: next.won, steps: chainSteps(next), best: day.best })
      const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }), 60)
    }
  }, [stale, state, day, linked, locale, info, endName])

  // Who is on the chain, each with how he is linked to the one before
  const views = useMemo<StationView[]>(() => state.chain.map((id, i) => {
    const me = info.get(id)
    const before = i > 0 ? info.get(state.chain[i - 1]) : undefined
    const via = i > 0 ? linkBetween(graph, state.chain[i - 1], id) : null
    return {
      id,
      name: me?.name ?? id,
      period: me?.period ?? periodOf(0),
      caption: via && before ? stepCaption(via, before.name, locale, me?.woman) : null,
      dotted: via?.kind === 'influence',
    }
  }), [state.chain, info, graph, locale])

  const targetInfo = info.get(day.b)
  const target = !state.won && targetInfo ? { name: targetInfo.name, period: targetInfo.period, tag: S.target[locale] } : undefined
  const options = useMemo<ComboSage[]>(
    () => net.sages
      .filter(s => !state.chain.includes(s[0]) && !state.missed.includes(s[0]))
      .map(([id, name, period]) => ({ id, name, period })),
    [net, state.chain, state.missed],
  )
  const hints = chainHints(state, day)
  const streak = currentChainStreak(state.stats, day.day)

  const ladder = (done: boolean) => (
    <PathList
      locale={locale}
      views={views}
      firstTag={S.start[locale]}
      lastMark={state.won ? '🎯' : undefined}
      pending={done ? undefined : S.pending[locale]}
      target={target}
      label={S.chainStations[locale]}
      testId="chain-list"
      className="mt-4"
    />
  )

  return (
    <section aria-labelledby="chain-title" className="mt-8">
      <h2 id="chain-title" className="font-serif text-2xl font-bold leading-tight text-ink-50">
        <span aria-hidden>🔗</span> {CHAIN_TITLE[locale]}
        {day.number >= 1 && <span className="ms-2 text-xl text-gold-400" dir="ltr">#{day.number}</span>}
      </h2>
      <p className="mt-2 leading-relaxed text-ink-300">{S.intro[locale]}</p>

      {stale && <p role="status" className="mt-5 rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-ink-100">{S.stale[locale]}</p>}

      {state.done ? (
        <>
          <EndScreen
            sectionRef={endRef}
            locale={locale}
            net={net}
            graph={graph}
            day={day}
            state={state}
            pageUrl={pageUrl}
          />
          <h3 className="mt-8 text-xs font-semibold uppercase tracking-widest text-ink-400">{S.yourChain[locale]}</h3>
          {ladder(true)}
        </>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-300">
            <span data-testid="chain-misses" className="inline-flex items-center gap-2">
              <span>{fill(S.misses[locale], { i: state.misses, n: MAX_MISSES })}</span>
              <span aria-hidden dir="ltr" className="tracking-[0.2em] text-gold-400">{'●'.repeat(state.misses)}{'○'.repeat(MAX_MISSES - state.misses)}</span>
            </span>
            {streak > 0 && <span className="rounded-full bg-gold-500/15 px-3 py-0.5 text-gold-300">🔥 {fill(S.streak[locale], { n: streak })}</span>}
          </div>

          {ladder(false)}

          <p data-testid="chain-links" className="mt-4 text-sm text-ink-400">
            {fill(S.links[locale], { name: endName, n: degree.get(end) ?? 0 })}
          </p>

          {!stale && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-ink-200">{fill(S.prompt[locale], { name: endName })}</p>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <SageCombobox
                    locale={locale}
                    sages={options}
                    degree={degree}
                    value={picked}
                    onChange={setPicked}
                    onSubmit={submit}
                    label={S.inputLabel[locale]}
                    placeholder={S.placeholder[locale]}
                    testId="chain-input"
                  />
                </div>
                <button type="button" data-testid="chain-confirm" disabled={!picked} onClick={() => picked && submit(picked)} className={cn(primary, 'px-5')}>
                  {S.add[locale]}
                </button>
              </div>
            </div>
          )}

          {state.missed.length > 0 && (
            <div data-testid="chain-missed" className="mt-3 text-sm text-ink-400">
              <p>{fill(S.missedLead[locale], { name: endName })}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {state.missed.map(id => (
                  <li key={id} dir="auto" className="rounded-full border border-ink-600/50 px-2.5 py-0.5 text-xs text-ink-300">
                    <span aria-hidden>✕ </span>{info.get(id)?.name ?? id}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hints.length > 0 && (
            <div className="mt-4 space-y-2">
              {hints.map(h => {
                const sage = info.get(h.id)
                const field = day.fields[h.id]
                if (h.kind === 'era' ? !sage : !field) return null
                return (
                  <div
                    key={h.kind}
                    data-testid="chain-hint"
                    data-hint={h.kind}
                    className="rounded-xl border border-gold-500/25 bg-gold-500/[0.05] px-4 py-3 motion-safe:animate-fade-in"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-400">{h.kind === 'era' ? S.hintEra[locale] : S.hintField[locale]}</p>
                    <p className="mt-1.5 font-serif text-lg leading-snug text-ink-50">
                      {h.kind === 'era' && sage ? <EraChip period={sage.period} locale={locale} /> : <span dir="auto">{field}</span>}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <p role="status" className="sr-only">{heard}</p>

      <details className="mt-8 rounded-xl border border-ink-700/50 bg-ink-800/30 px-4 py-3">
        <summary className="cursor-pointer text-sm text-ink-200">{S.howTo[locale]}</summary>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-300">
          {S.howToLines[locale].map(line => <li key={line}>{line}</li>)}
        </ul>
      </details>
    </section>
  )
}

/* ── The end: the shortest route, the share, the statistics, the countdown ── */

function EndScreen({ sectionRef, locale, net, graph, day, state, pageUrl }: {
  sectionRef: React.RefObject<HTMLElement | null>
  locale: Locale
  net: ConnectNet
  graph: ConnectGraph
  day: ChainDay
  state: ChainState
  pageUrl: string
}) {
  const steps = chainSteps(state)
  const optimal = useMemo(() => {
    const path = shortestPath(graph, day.a, day.b)
    return path ? describePath(net, path, locale) : []
  }, [graph, net, day.a, day.b, locale])
  const text = useMemo(
    () => chainShareText({ locale, number: day.number, url: pageUrl, moves: state.moves, won: state.won, best: day.best }),
    [locale, day.number, day.best, pageUrl, state.moves, state.won],
  )

  async function share() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean }
    const data: ShareData = { text }
    if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare(data))) {
      try {
        await nav.share(data)
        track('chain_share', { locale, method: 'share' })
        return
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return // the sheet was closed
      }
    }
    const ok = await copyText(text)
    showToast(ok ? S.copied[locale] : S.copyFailed[locale])
    if (ok) track('chain_share', { locale, method: 'copy' })
  }

  return (
    <section
      ref={sectionRef}
      id="chain-end-section"
      data-testid="chain-end"
      data-won={state.won ? 'true' : 'false'}
      aria-labelledby="chain-end"
      className={cn(
        'mt-6 scroll-mt-20 rounded-2xl border p-5 sm:p-7',
        state.won ? 'border-emerald-400/40 bg-emerald-500/[0.07]' : 'border-gold-500/30 bg-gold-500/[0.06]',
      )}
    >
      <p className="text-sm font-semibold text-gold-300">
        <span aria-hidden>{state.won ? '🎯' : '🔗'}</span>{' '}
        <span id="chain-end">{state.won ? S.won[locale] : S.lost[locale]}</span>
        <span className="text-ink-300"> · {state.won
          ? fill(S.wonIn[locale], { steps: stepsLabel(steps, locale), best: day.best })
          : fill(S.lostSub[locale], { n: state.misses })}</span>
      </p>
      {state.won && steps === day.best && <p className="mt-1.5 text-sm text-emerald-300 [[data-theme=light]_&]:text-emerald-800">{S.perfect[locale]}</p>}

      {optimal.length > 1 && (
        <div className="mt-6">
          <h3 data-testid="chain-best" className="font-serif text-xl font-bold leading-snug text-ink-50">
            {fill(S.shortest[locale], { steps: stepsLabel(day.best, locale) })}
          </h3>
          <PathList locale={locale} views={optimal} firstTag={S.start[locale]} lastMark="🎯" label={S.stations[locale]} testId="chain-optimal" className="mt-4" />
          <a
            data-testid="chain-fly"
            href={`${flightHref(locale, day.a, day.b)}?via=game`}
            className={cn(primary, 'mt-5 px-6')}
          >
            <span aria-hidden>🌌</span>{S.fly[locale]}
          </a>
        </div>
      )}

      <div className="mt-7 border-t border-ink-700/50 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-400">{S.shareHeading[locale]}</h3>
        <pre
          dir="ltr"
          data-testid="chain-share-text"
          className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-ink-700/50 bg-ink-800/50 px-4 py-3 font-sans text-sm leading-relaxed text-ink-100"
        >{text}</pre>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" data-testid="chain-share" onClick={share} className={primary}><span aria-hidden>📤</span>{S.share[locale]}</button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('chain_share', { locale, method: 'whatsapp' })}
            className={cn(secondary, 'border-ink-600/50 text-ink-200 hover:border-gold-500/40 hover:bg-transparent hover:text-ink-50')}
          >
            <span aria-hidden>💬</span>{S.whatsapp[locale]}
          </a>
        </div>
        <p className="mt-2 text-xs text-ink-500">{S.shareNote[locale]}</p>
      </div>

      <Stats locale={locale} stats={state.stats} day={day.day} />
      <Countdown locale={locale} />
    </section>
  )
}

function Stats({ locale, stats, day }: { locale: Locale; stats: ChainStats; day: number }) {
  const pct = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0
  const cells: Array<[string, string | number]> = [
    [S.played[locale], stats.played], [S.winPct[locale], `${pct}%`],
    [S.current[locale], currentChainStreak(stats, day)], [S.best[locale], stats.maxStreak],
  ]
  return (
    <div className="mt-7 border-t border-ink-700/50 pt-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-400">{S.statsHeading[locale]}</h3>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {cells.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-ink-700/50 bg-ink-800/40 px-1 py-2.5">
            <dd className="font-serif text-2xl font-bold tabular-nums text-ink-50" dir="ltr">{value}</dd>
            <dt className="mt-0.5 text-[11px] leading-tight text-ink-400">{label}</dt>
          </div>
        ))}
      </dl>
    </div>
  )
}

/** The time to the next chain (it turns with the riddle, at midnight in Israel), ticking; at zero the page offers a reload (it is rebuilt every half hour). */
function Countdown({ locale }: { locale: Locale }) {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    const target = nextRiddleAt(new Date())
    const tick = () => setLeft(Math.max(0, target - Date.now()))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])
  if (left === null) return null
  return (
    <div className="mt-7 border-t border-ink-700/50 pt-5 text-center">
      {left > 0 ? (
        <>
          <p className="text-xs uppercase tracking-widest text-ink-400">{S.next[locale]}</p>
          <p dir="ltr" className="mt-1 font-serif text-3xl font-bold tabular-nums text-gold-300">{formatCountdown(left)}</p>
        </>
      ) : (
        <>
          <p className="font-semibold text-gold-300">{S.newReady[locale]}</p>
          <button type="button" onClick={() => window.location.reload()} className={cn(primary, 'mt-3')}>{S.reload[locale]}</button>
        </>
      )}
    </div>
  )
}
