import { portraitAlt, portraitCredit, portraitOf, type Portrait } from '@/lib/portraits'
import type { Locale } from '@/lib/types'

// the size on a desktop; the 384 px file is more than a 2x screen needs, and a phone shows it at 96 px (w-24)
const HERO_PX = 160

interface Props {
  id: string
  /** The name shown in the page's language: it goes into the alt text. */
  name: string
  locale: Locale
  /** The era colour of the sage's page: the ring around the picture. */
  accent?: string
  className?: string
}

/**
 * The sage's portrait in the hero of his page (160 px, 96 px on a phone) with its caption, a link to the episode section
 * of the same page. Renders nothing for a sage with no portrait: no wrapper, no gap.
 */
export function SagePortrait({ id, ...rest }: Props) {
  const portrait = portraitOf(id)
  return portrait ? <SagePortraitFigure id={id} portrait={portrait} {...rest} /> : null
}

/**
 * The figure itself, for a portrait already in hand (the tests give it either kind without touching the data).
 * The only portrait that loads eagerly: the hero is above the fold. The alt text and the caption come from the portrait's
 * kind, so a photograph is never captioned as an illustration (lib/portraits.ts). A plain <img>, not next/image.
 */
export function SagePortraitFigure({ id, name, locale, portrait, accent, className }: Props & { portrait: Portrait }) {
  return (
    <figure data-sage-portrait={id} className={`w-24 flex-shrink-0 md:w-40${className ? ` ${className}` : ''}`}>
      <img
        src={portrait.src}
        alt={portraitAlt(name, locale, portrait)}
        width={HERO_PX}
        height={HERO_PX}
        loading="eager"
        decoding="async"
        data-portrait={id}
        data-portrait-kind={portrait.kind}
        className="aspect-square w-full rounded-2xl border-2 border-ink-700/40 object-cover"
        style={accent ? { borderColor: `${accent}99` } : undefined}
      />
      <figcaption className="mt-2 text-center text-[11px] leading-snug md:text-xs">
        <a
          href="#listen"
          data-portrait-credit
          className="text-ink-400 underline-offset-2 transition-colors hover:text-gold-300 hover:underline"
        >
          {portraitCredit(portrait, locale)}
        </a>
      </figcaption>
    </figure>
  )
}
