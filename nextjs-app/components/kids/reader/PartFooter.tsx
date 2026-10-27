// The foot of a part's page: where the meeting sits on the kids' page (its card, game and task, and quiz,
// and the time machine), and the way on: previous part, the book's contents, next part. Server-rendered,
// plain props (the page reads the book; nothing here imports lib/kidsBooks).
import Link from 'next/link'
import { bookMarks } from '@/lib/kidsBookTypes'
import { readBookHref, readPartHref } from '@/lib/kidsBookLinks'

export interface NeighbourLink { slug: string; label: string }

export interface StationFoot {
  stationTitle: string
  /** The station's card on the kids' page: its game and task and its quiz are all there. */
  card: string
  tourHref: string
  routeTitle: string
}

function Step({ href, kind, label }: { href: string; kind: 'prev' | 'next'; label: string }) {
  return (
    <Link href={href} rel={kind}
      className={`group flex min-h-[3.5rem] flex-1 items-center gap-3 rounded-2xl border border-ink-700/60 bg-ink-800/40 px-4 py-3 transition-colors hover:border-gold-500/60 hover:bg-ink-800/70 ${kind === 'next' ? 'flex-row-reverse text-start' : ''}`}>
      <span aria-hidden className="text-xl text-gold-400">{kind === 'prev' ? '→' : '←'}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-gold-400">{kind === 'prev' ? 'החלק הקודם' : 'החלק הבא'}</span>
        <span className="block line-clamp-2 font-serif text-base font-bold leading-snug text-ink-50">{bookMarks(label)}</span>
      </span>
    </Link>
  )
}

export function PartFooter({ book, prev, next, station, position }: {
  book: string
  prev: NeighbourLink | null
  next: NeighbourLink | null
  station: StationFoot | null
  /** Place in the reading order, 1-based; null for a page outside it (the copyright page). */
  position: { at: number; of: number } | null
}) {
  return (
    <footer className="mt-14">
      {station && (
        <section aria-label="המשך המסע באתר" className="mb-8 rounded-2xl border border-gold-500/30 bg-gold-500/5 p-4">
          <h2 className="font-serif text-lg font-bold text-gold-200">עוד מהמפגש הזה באתר</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              {/* plain links: neither the kids' page nor the tower is prefetched from the reader */}
              <a href={station.card} className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-gold-300 underline-offset-4 hover:underline">
                <span aria-hidden>🎲</span>
                <span>כרטיס המסע, משחק ומשימה וחידון: {bookMarks(station.stationTitle)}</span>
              </a>
            </li>
            <li>
              <a href={station.tourHref} className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-gold-300 underline-offset-4 hover:underline">
                <span aria-hidden>🚀</span>
                <span>מכונת הזמן: {bookMarks(station.routeTitle)} בתלת־ממד</span>
              </a>
            </li>
          </ul>
        </section>
      )}

      <nav aria-label="מעבר בין חלקי הספר" className="flex flex-col gap-3 sm:flex-row">
        {prev && <Step href={readPartHref(book, prev.slug)} kind="prev" label={prev.label} />}
        {next && <Step href={readPartHref(book, next.slug)} kind="next" label={next.label} />}
      </nav>

      <p className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-300">
        <Link href={readBookHref(book)} className="inline-flex min-h-[44px] items-center font-semibold text-gold-300 underline-offset-4 hover:underline">
          תוכן הספר
        </Link>
        {position && <span>חלק {position.at} מתוך {position.of}</span>}
      </p>
    </footer>
  )
}
