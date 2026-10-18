// The featured sage's picture on the Today card: his head and shoulders from his own podcast episode's cover, with the
// caption (illustration or photo wording by the portrait's kind) linking to the episode section of his page. A server
// component, so lib/portraits.ts and its data never reach the browser. A sage without a portrait gets nothing at all:
// no wrapper, no gap, the card reads as it did before.
import type { ReactNode } from 'react'
import Link from 'next/link'
import { portraitAlt, portraitCredit, portraitEpisodeHref, portraitOf } from '@/lib/portraits'
import type { Locale } from '@/lib/types'

interface PortraitProps {
  id: string
  /** The name as the page shows it (for the alt text). */
  name: string
  locale: Locale
  /** The era colour, as the ring. */
  accent: string
}

export function TodayPortrait({ id, name, locale, accent }: PortraitProps) {
  const portrait = portraitOf(id)
  if (!portrait) return null
  return (
    <figure className="m-0 flex w-28 flex-shrink-0 flex-col items-center gap-1.5 sm:w-32" data-today-portrait>
      <img
        src={portrait.src}
        alt={portraitAlt(name, locale, portrait)}
        width={120}
        height={120}
        loading="lazy"
        decoding="async"
        data-portrait={id}
        data-portrait-kind={portrait.kind}
        className="h-24 w-24 rounded-2xl border-2 object-cover sm:h-[120px] sm:w-[120px]"
        style={{ borderColor: accent }}
      />
      <figcaption className="text-center text-[11px] leading-snug">
        <Link href={portraitEpisodeHref(id, locale)} data-portrait-credit className="text-gold-300 hover:underline">
          {portraitCredit(portrait, locale)}
        </Link>
      </figcaption>
    </figure>
  )
}

/**
 * The top of the featured card (the pill, the name, the years): with a portrait, the picture sits beside it at the
 * end of the line; without one this is exactly its children, as the card was before.
 */
export function TodayFeaturedHead({ children, ...portrait }: PortraitProps & { children: ReactNode }) {
  if (!portraitOf(portrait.id)) return <>{children}</>
  return (
    <div className="flex items-start gap-4 sm:gap-5">
      <div className="min-w-0 flex-1">{children}</div>
      <TodayPortrait {...portrait} />
    </div>
  )
}
