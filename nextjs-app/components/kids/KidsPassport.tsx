'use client'

// "דרכון המסע שלי": a stamp for every station finished, and Shira's bag with what she collected. Kept in
// this browser only; nothing is sent anywhere.
import { cn } from '@/lib/utils'
import { KIDS_ROUTES, stationAnchor } from '@/lib/kidsJourney'
import { useJourneyProgress } from '@/lib/kidsJourneyProgress'

export function KidsPassport() {
  const progress = useJourneyProgress()
  const shira = KIDS_ROUTES.find(r => r.key === 'shira')
  const bag = (shira?.stations ?? []).filter(s => progress.shira.includes(s.n) && s.object)
  const total = KIDS_ROUTES.reduce((n, r) => n + r.stations.length, 0)
  const stamped = progress.saltiel.length + progress.shira.length

  return (
    <section aria-labelledby="passport-title" className="rounded-2xl border border-gold-500/30 bg-gold-500/[0.05] p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="passport-title" className="font-serif text-2xl font-bold text-gold-300">דרכון המסע שלי</h2>
        <p className="text-sm text-ink-300">{stamped} מתוך {total} תחנות חתומות</p>
      </div>
      <p className="mt-1 text-sm text-ink-400">בסוף כל תחנה לחצו ״סיימתי את התחנה״, ותקבלו חותמת. הדרכון נשמר בדפדפן הזה בלבד.</p>

      {KIDS_ROUTES.map(route => (
        <div key={route.key} className="mt-5">
          <h3 className="text-sm font-semibold text-ink-200">{route.title}</h3>
          <ol className="mt-2 flex flex-wrap gap-2">
            {route.stations.map(s => {
              const done = progress[route.key].includes(s.n)
              return (
                <li key={s.n}>
                  <a
                    href={`#${stationAnchor(route.key, s.n)}`}
                    title={`${s.n}. ${s.title}`}
                    aria-label={`תחנה ${s.n}: ${s.title}${done ? ' (חתומה)' : ''}`}
                    className={cn(
                      'grid h-12 w-12 place-items-center rounded-full border-2 font-serif text-lg font-bold transition-colors',
                      done
                        ? 'rotate-[-8deg] border-gold-400 bg-gold-500/25 text-gold-200'
                        : 'border-dashed border-ink-600 text-ink-500 hover:border-gold-500/60 hover:text-gold-300',
                    )}
                  >
                    {done ? (s.object?.icon ?? '✓') : s.n}
                  </a>
                </li>
              )
            })}
          </ol>
        </div>
      ))}

      {bag.length > 0 && (
        <p className="mt-5 text-sm text-ink-200">
          <span className="font-semibold">בתיק של שירה: </span>
          {bag.map(s => `${s.object!.icon} ${s.object!.name}`).join(' · ')}
        </p>
      )}
      {stamped === total && (
        <p role="status" className="mt-4 rounded-xl bg-gold-500/15 px-4 py-3 font-serif text-lg text-gold-200">
          כל הכבוד! עברתם את כל התחנות של שני המסעות. החכמה מתגוררת עכשיו גם אצלכם.
        </p>
      )}
    </section>
  )
}
