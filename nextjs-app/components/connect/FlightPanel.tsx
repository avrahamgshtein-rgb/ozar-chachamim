'use client'

// The card of a path flown in the tower ("שישה צעדים"): which station of the path the camera is at,
// the sage there (his page, years, era), how he is linked to the sage before him, the way on, and at
// the end the whole path in one line with the ways to fly it again, share it or pick another pair.
// The scene (components/tower/TowerScene.tsx) flies; this only tells. The captions arrive written
// (lib/connect.ts), so nothing here knows a link's kind or direction.
import type { Locale } from '@/lib/types'
import type { ConnectFlight } from '@/lib/connectFlight'
import { shortName } from '@/lib/tower'
import { ruPlural } from '@/components/viz/SinaiPathText'
import { EraChip } from '@/components/ui/EraChip'
import { portraitOf, portraitCredit } from '@/lib/portraits'

interface Props {
  flight: ConnectFlight
  locale: Locale
  /** The station the camera is at (0-based). */
  at: number
  playing: boolean
  copied: boolean
  onGo: (i: number) => void
  onPlay: () => void
  onOverview: () => void
  onShare: () => void
}

const S = {
  title: { he: 'המסלול במגדל', en: 'The path in the tower', ru: 'Путь в башне' },
  back: { he: 'חזרה לבחירת הצמד', en: 'Back to the pair', ru: 'Назад к выбору пары' },
  list: { he: 'תחנות המסלול', en: 'Stations of the path', ru: 'Остановки пути' },
  start: { he: 'כאן המסלול מתחיל', en: 'The path starts here', ru: 'Здесь путь начинается' },
  prev: { he: 'התחנה הקודמת', en: 'Previous station', ru: 'Предыдущая остановка' },
  next: { he: 'התחנה הבאה', en: 'Next station', ru: 'Следующая остановка' },
  play: { he: 'טיסה אוטומטית', en: 'Fly on its own', ru: 'Лететь самому' },
  pause: { he: 'עצירה', en: 'Pause', ru: 'Пауза' },
  toNext: { he: 'לתחנה הבאה', en: 'Next station', ru: 'Дальше' },
  overview: { he: 'מבט על כל המסלול', en: 'See the whole path', ru: 'Весь путь сверху' },
  again: { he: 'שוב מההתחלה', en: 'Fly it again', ru: 'Ещё раз' },
  share: { he: 'שיתוף', en: 'Share', ru: 'Поделиться' },
  copied: { he: 'הקישור הועתק', en: 'Link copied', ru: 'Ссылка скопирована' },
  other: { he: 'לבחור צמד אחר', en: 'Pick another pair', ru: 'Выбрать другую пару' },
} satisfies Record<string, Record<Locale, string>>

/** "Station 3 of 6" */
const stationOf = (i: number, n: number, l: Locale) =>
  l === 'he' ? `תחנה ${i} מתוך ${n}` : l === 'en' ? `Station ${i} of ${n}` : `Остановка ${i} из ${n}`

/** "5 steps": the links between the sages, one less than the stations. */
const stepsLabel = (n: number, l: Locale) =>
  l === 'he' ? (n === 1 ? 'צעד אחד' : `${n} צעדים`)
    : l === 'en' ? (n === 1 ? '1 step' : `${n} steps`)
      : `${n} ${ruPlural(n, 'шаг', 'шага', 'шагов')}`

/** "5 steps between Rashi and the Rambam" */
const summary = (n: number, a: string, b: string, l: Locale) =>
  l === 'he' ? `${stepsLabel(n, l)} בין ${a} לבין ${b}`
    : l === 'en' ? `${stepsLabel(n, l)} between ${a} and ${b}`
      : `${stepsLabel(n, l)} между «${a}» и «${b}»`

const chevron = (d: string) => (
  <svg aria-hidden className="h-5 w-5 rtl:-scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)

export function FlightPanel({ flight, locale, at, playing, copied, onGo, onPlay, onOverview, onShare }: Props) {
  const stations = flight.stations
  const st = stations[Math.max(0, Math.min(at, stations.length - 1))]
  const last = stations.length - 1
  const end = at === last
  // the sage at this station, if he has a portrait: a thumbnail beside his name; with none the card is as it was
  const portrait = portraitOf(st.id)
  const dir = locale === 'he' ? 'rtl' : 'ltr'
  const btn = 'grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/5 text-ink-50 hover:border-white/60 disabled:opacity-30'
  const pill = 'inline-flex min-h-[44px] items-center rounded-lg border border-white/15 px-3 py-2 text-sm text-ink-100 hover:border-white/50'

  return (
    <aside
      dir={dir}
      lang={locale}
      aria-label={S.title[locale]}
      className="absolute inset-x-3 bottom-3 z-20 max-h-[58%] overflow-y-auto rounded-2xl border bg-ink-900/92 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:end-4 sm:top-4 sm:bottom-auto sm:max-h-[calc(100%-2rem)] sm:w-[22rem]"
      style={{ borderColor: `${flight.color}66` }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold" style={{ color: flight.color }}>🌌 {S.title[locale]}</p>
        <a href={flight.connectHref} aria-label={S.back[locale]} className="-m-2 grid h-11 w-11 place-items-center text-ink-400 hover:text-ink-100">✕</a>
      </div>

      {/* the stations, a dot each: where we have been, where we are */}
      <ol className="-mb-1 mt-1 flex flex-wrap" aria-label={S.list[locale]}>
        {stations.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onGo(i)}
              aria-current={i === at ? 'step' : undefined}
              aria-label={`${i + 1}: ${shortName(s.name)}`}
              className="grid h-11 w-8 place-items-center"
            >
              {/* the dot is 28px, the target around it 44 by 32 */}
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold tabular-nums transition-colors ${i === at ? 'text-ink-900 shadow-[0_0_12px_rgba(95,212,208,0.6)]' : i < at ? 'bg-white/15 text-ink-50' : 'border border-white/20 text-ink-400'}`}
                style={i === at ? { background: flight.color } : undefined}
              >
                {i + 1}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div aria-live="polite">
        <p className="mt-3 text-xs tabular-nums text-ink-400">{stationOf(at + 1, stations.length, locale)}</p>
        {/* 56 px, the small file; floated to the start so the name and the era chip run beside it. The episode credit is its title (a visible caption is for portraits of 96 px and more); it is decorative (alt=""), so this aria-live region does not read it at every station */}
        {portrait && (
          <img data-portrait={st.id}
            data-portrait-kind={portrait.kind}
            src={portrait.srcSm}
            alt=""
            title={portraitCredit(portrait, locale)}
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
            className="float-start me-3 h-14 w-14 rounded-xl border bg-ink-800 object-cover"
            style={{ borderColor: `${st.color}99` }}
          />
        )}
        <h2 className="mt-0.5 font-serif text-xl font-bold leading-snug text-ink-50">
          <a href={`/${locale}/sage/${st.id}`} target="_blank" rel="noopener" className="hover:underline">
            <span aria-hidden className="me-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: st.color }} />
            {st.name}
          </a>
        </h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <EraChip period={st.period} locale={locale} size="sm" />
          {st.years && <span className="text-xs text-ink-300" dir="auto">{st.years}</span>}
        </div>
        <p className="mt-3 text-base font-semibold leading-snug" style={{ color: st.caption ? flight.color : undefined }}>
          {st.caption ?? <span className="text-ink-300">{S.start[locale]}</span>}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" className={btn} aria-label={S.prev[locale]} disabled={at === 0} onClick={() => onGo(at - 1)}>{chevron('M15 18l-6-6 6-6')}</button>
        <button type="button" className={btn} aria-label={playing ? S.pause[locale] : S.play[locale]} onClick={onPlay}><span aria-hidden className="text-sm">{playing ? '❚❚' : '▶'}</span></button>
        <button type="button" className={btn} aria-label={S.next[locale]} disabled={end} onClick={() => onGo(at + 1)}>{chevron('M9 18l6-6-6-6')}</button>
        {!end && <span className="ms-1 text-xs text-ink-400">{S.toNext[locale]}</span>}
      </div>

      {end && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="font-serif text-lg font-bold text-ink-50">{summary(last, shortName(stations[0].name), shortName(st.name), locale)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={onOverview} className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm font-semibold text-ink-900 hover:brightness-110" style={{ background: flight.color }}>{S.overview[locale]}</button>
            <button type="button" onClick={onPlay} className={pill}>{S.again[locale]}</button>
            <button type="button" onClick={onShare} className={pill}><span aria-hidden className="me-1.5">↗</span>{S.share[locale]}</button>
            <a href={flight.connectHref} className={pill}>{S.other[locale]}</a>
            {copied && <span role="status" className="text-xs" style={{ color: flight.color }}>{S.copied[locale]}</span>}
          </div>
        </div>
      )}
    </aside>
  )
}
