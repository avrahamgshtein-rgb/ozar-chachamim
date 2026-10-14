'use client'

// The card of the kids' journey in the tower ("מכונת הזמן"): the station's travel card as the kids'
// page shows it (never the story), how far the time machine jumped to get there, Shira's bag filling
// up, and the way on. Hebrew only, like the books.
import type { KidsTour } from '@/lib/kidsTour'
import { jumpLabel, kidsTourPath } from '@/lib/kidsTour'
import { KIDS_PATH } from '@/lib/kidsJourney'

interface Props {
  tour: KidsTour
  at: number
  playing: boolean
  onGo: (i: number) => void
  onPlay: () => void
  onOverview: () => void
}

const chevron = (d: string) => (
  <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)

export function KidsTourPanel({ tour, at, playing, onGo, onPlay, onOverview }: Props) {
  const st = tour.stations[at]
  const last = tour.stations.length - 1
  const end = at === last
  const bag = tour.stations.slice(0, at + 1).filter(s => s.object)
  const btn = 'grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-white/5 text-ink-50 hover:border-gold-500/70 disabled:opacity-30'

  return (
    <aside lang="he" dir="rtl" className="absolute inset-x-3 bottom-3 z-20 max-h-[60%] overflow-y-auto rounded-2xl border border-gold-500/40 bg-ink-900/92 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:end-4 sm:top-4 sm:bottom-auto sm:max-h-[calc(100%-2rem)] sm:w-[22rem]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-gold-400">🚀 מכונת הזמן · {tour.title}</p>
        <a href={`${KIDS_PATH}#${tour.route}`} aria-label="יציאה מהמסע" className="text-ink-400 hover:text-ink-100">✕</a>
      </div>

      {/* the stations, a dot each: where we have been, where we are */}
      <ol className="mt-2 flex flex-wrap gap-1.5" aria-label="תחנות המסע">
        {tour.stations.map((s, i) => (
          <li key={s.n}>
            <button
              type="button"
              onClick={() => onGo(i)}
              aria-current={i === at ? 'step' : undefined}
              aria-label={`תחנה ${s.n}: ${s.title}`}
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold tabular-nums transition-colors ${i === at ? 'bg-gold-400 text-ink-900 shadow-[0_0_12px_rgba(233,196,106,0.6)]' : i < at ? 'bg-gold-500/30 text-gold-100' : 'border border-white/20 text-ink-400'}`}
            >
              {s.n}
            </button>
          </li>
        ))}
      </ol>

      <div aria-live="polite">
        {st.jump != null && st.jump !== 0 && (
          <p className={`mt-3 text-sm font-semibold ${st.jump < 0 ? 'text-sky-300' : 'text-emerald-300'}`}>{jumpLabel(st.jump)}</p>
        )}
        {st.image && (
          <img src={st.image.src} width={st.image.width} height={st.image.height} alt={`${tour.traveller} ו${tour.guide} בתחנה ${st.n}: ${st.title}`}
            className="mt-3 aspect-[16/10] w-full rounded-xl object-cover" />
        )}
        <p className="mt-3 text-xs text-ink-400">תחנה {st.n} מתוך {tour.stations.length}</p>
        <h2 className="mt-0.5 font-serif text-xl font-bold leading-snug text-ink-50">{st.title}</h2>
        <dl className="mt-2 space-y-1 text-sm text-ink-200">
          <div className="flex gap-2"><dt aria-label="איפה">📍</dt><dd>{st.place}</dd></div>
          <div className="flex gap-2"><dt aria-label="מתי">🕰️</dt><dd>{st.when}</dd></div>
        </dl>
        <p className="mt-2 text-xs font-semibold text-gold-400">פוגשים את</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {st.who.map(p => p.id ? (
            <a key={p.name} href={`/he/sage/${p.id}`} target="_blank" rel="noopener" className="rounded-full border border-gold-500/40 bg-gold-500/10 px-2.5 py-0.5 text-sm text-gold-200 hover:bg-gold-500/20">{p.name}</a>
          ) : (
            <span key={p.name} className="rounded-full border border-white/15 px-2.5 py-0.5 text-sm text-ink-200">{p.name}</span>
          ))}
        </div>
        {st.object && (
          <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
            🎒 לתיק של {tour.traveller}: <span className="font-semibold">{st.object.icon} {st.object.name}</span>
          </p>
        )}
        {bag.length > 1 && (
          <p className="mt-2 text-lg tracking-widest" aria-label={`בתיק: ${bag.map(b => b.object!.name).join(', ')}`}>
            {bag.map(b => <span key={b.n} title={b.object!.name}>{b.object!.icon}</span>)}
          </p>
        )}
        <a href={st.href} className="mt-3 inline-block text-sm font-semibold text-gold-300 underline-offset-4 hover:underline">למשחק, למשימה ולחידון של התחנה ←</a>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" className={btn} aria-label="התחנה הקודמת" disabled={at === 0} onClick={() => onGo(at - 1)}>{chevron('M9 18l6-6-6-6')}</button>
        <button type="button" className={btn} aria-label={playing ? 'עצירה' : 'טיסה אוטומטית'} onClick={onPlay}><span aria-hidden className="text-sm">{playing ? '❚❚' : '▶'}</span></button>
        <button type="button" className={`${btn} ${end ? '' : 'border-gold-500/70 bg-gold-500/20'}`} aria-label="התחנה הבאה" disabled={end} onClick={() => onGo(at + 1)}>{chevron('M15 18l-6-6 6-6')}</button>
        {!end && <span className="ms-1 text-xs text-ink-400">לתחנה הבאה</span>}
      </div>

      {end && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="font-serif text-lg font-bold text-gold-300">🎉 סיימתם את {tour.title}!</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onOverview} className="rounded-lg bg-gold-500 px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-gold-400">מבט על כל המסע</button>
            <a href={`${KIDS_PATH}#${tour.route}`} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-ink-100 hover:border-gold-500/50">לדרכון ולחידונים</a>
            <a href={kidsTourPath(tour.other.route)} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-ink-100 hover:border-gold-500/50">{tour.other.title} ←</a>
          </div>
        </div>
      )}
    </aside>
  )
}
