import type { Locale } from '@/lib/types'
import type { SageIndexGroup } from '@/lib/sageIndex'
import { SAGE_INDEX_TEXT } from '@/lib/sageIndexText'

/**
 * The plain index of every sage: a heading, a jump list of the eras and, per
 * era, the names as ordinary links to the sage pages. No script, no state: its
 * point is that a crawler (or a reader without JavaScript) finds every page
 * from here.
 */
export function SageIndex({ locale, groups }: { locale: Locale; groups: SageIndexGroup[] }) {
  const t = SAGE_INDEX_TEXT[locale]
  const total = groups.reduce((n, g) => n + g.entries.length, 0)
  return (
    <article className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-8 md:pt-14" data-sage-index={total}>
      <header>
        <h1 className="font-serif text-3xl font-bold leading-tight text-gold-300 sm:text-4xl md:text-5xl">{t.heading}</h1>
        <p className="mt-4 max-w-3xl font-sans text-base leading-relaxed text-ink-200">{t.lede(total)}</p>
        <p className="mt-2 font-sans text-sm text-ink-400">
          <a href={`/${locale}`} className="link-gold">{t.openApp}</a>
        </p>
      </header>

      <nav aria-label={t.erasNav} className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {groups.map(g => (
            <li key={g.period}>
              <a
                href={`#${g.period}`}
                className="inline-flex items-center gap-2 rounded-full border border-ink-700/50 bg-ink-800/40 px-3 py-1.5 font-sans text-sm text-ink-200 transition-colors hover:border-gold-500/40 hover:text-gold-300"
              >
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: g.color }} />
                {g.label}
                <span className="text-xs tabular-nums text-ink-400">{g.entries.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {groups.map(g => (
        <section key={g.period} id={g.period} aria-labelledby={`era-${g.period}`} className="mt-12 scroll-mt-20">
          <h2
            id={`era-${g.period}`}
            className="flex items-center gap-3 border-b pb-2 font-serif text-2xl font-bold text-ink-50"
            style={{ borderColor: `${g.color}55` }}
          >
            <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: g.color }} />
            {g.label}
            <span className="font-sans text-sm font-normal tabular-nums text-ink-400">{g.entries.length}</span>
          </h2>
          {/* styled from the list, so the 500 items carry no classes of their own: the page stays light */}
          <ul className="mt-4 gap-x-8 sm:columns-2 lg:columns-3 [&>li]:break-inside-avoid [&>li]:py-1 [&>li]:font-sans [&>li]:text-sm [&>li]:leading-snug [&_a]:text-ink-100 [&_a:hover]:text-gold-300 [&_a:hover]:underline [&_a]:underline-offset-4 [&_small]:ms-1 [&_small]:text-xs [&_small]:text-ink-400">
            {g.entries.map(e => (
              <li key={e.id}>
                <a href={`/${locale}/sage/${e.id}`}>{e.name}</a>
                {e.years && <>{' '}<small>{e.years}</small></>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  )
}
