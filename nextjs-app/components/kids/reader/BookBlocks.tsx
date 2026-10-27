// The text of one part of a children's book, block by block (content/kids-books/<book>.json, shape in
// lib/kidsBookTypes.ts). Presentation only: every string on screen is the book's own text, shown through
// `bookMarks` (the book writes ASCII quotes, the site writes ״ and ׳) and never rewritten; an unfilled field
// of the book (`placeholder`) is not drawn at all. Server-rendered: no hooks, no client code.
//
// Sizes are in `em`, so the A−/A+ buttons (one CSS variable on the article) scale the whole page: the
// travel card, the key, the game box and the map all follow the text. `data-speak` marks the pieces the
// read-aloud player lights up, with the values lib/kidsBookSpeech.ts gives its items: the block's index
// in `part.blocks` (placeholders counted, since the index is the block's place in the JSON), `<n>.<i>`
// for a card row, an activity item and a glossary entry.
import type { ReactNode } from 'react'
import Link from 'next/link'
import { bookMarks, segmentsOf, type Block, type Part, type PStyle, type Run } from '@/lib/kidsBookTypes'
import { readPartHref } from '@/lib/kidsBookLinks'

const STRONG = 'font-bold text-ink-50'

/**
 * A run with its emphasis. The whole text goes through `bookMarks` first and is cut at the marks after
 * (`segmentsOf(run, { display: true })`), so a quote that opens before a mark and closes after it is read as one
 * (the conversion is one character for one character, the offsets hold).
 */
export function Runs({ run, strong = STRONG }: { run: Run; strong?: string }) {
  const segments = segmentsOf(run, { display: true })
  return (
    <>
      {segments.map((s, i) => {
        if (s.mark === 'b') return <strong key={i} className={strong}>{s.text}</strong>
        // the book's quoted sayings: Hebrew has no italic, so a quiet gold weight carries the emphasis
        if (s.mark === 'em') return <em key={i} className="font-semibold not-italic text-gold-200">{s.text}</em>
        if (s.mark === 'small') return <small key={i} className="text-[0.85em]">{s.text}</small>
        return s.text
      })}
    </>
  )
}

const P_CLASS: Record<PStyle | 'plain', string> = {
  plain: 'mb-[0.9em] text-pretty',
  kv: 'mb-[0.7em] rounded-xl border-s-2 border-gold-500/50 bg-ink-800/40 px-[0.9em] py-[0.6em] text-[0.95em]',
  mem: 'my-[0.8em] rounded-e-xl border-s-4 border-gold-500/60 bg-gold-500/10 py-[0.5em] pe-[0.9em] ps-[0.9em] font-sans text-[0.95em] font-bold text-gold-200',
  verse: 'my-[1.4em] border-y border-gold-500/25 py-[0.9em] text-center font-bold leading-[2] text-gold-200',
  center: 'mb-[0.9em] text-center',
  'center-strong': 'mb-[0.9em] text-center font-bold text-ink-50',
  small: 'mb-[0.7em] text-[0.8em] leading-relaxed text-ink-300',
  note: 'my-[1.2em] rounded-xl bg-gold-500/10 px-[0.9em] py-[0.7em] text-[0.9em] text-ink-200',
}

/** A short saying set in a row with its neighbours (the four mems of the prologue) is a chip, not a bar. */
const CHIP_MAX = 16

const isMem = (b: Block): b is Extract<Block, { t: 'p' }> => b.t === 'p' && b.style === 'mem' && !b.placeholder
const isChip = (b: Block) => isMem(b) && b.text.length <= CHIP_MAX

interface Item { b: Block; bi: number }

/** Blocks to draw, in order: placeholders out, and no separator at either end or twice in a row. */
function visibleItems(blocks: Block[]): Item[] {
  const shown: Item[] = []
  blocks.forEach((b, bi) => {
    if (b.t === 'p' && b.placeholder) return
    if (b.t === 'sep' && (shown.length === 0 || shown[shown.length - 1].b.t === 'sep')) return
    shown.push({ b, bi })
  })
  while (shown.length && shown[shown.length - 1].b.t === 'sep') shown.pop()
  return shown
}

export function BookBlocks({ book, part }: { book: string; part: Part }) {
  const items = visibleItems(part.blocks)
  // the picture at the top of a meeting is the hero: it loads at once, every other one when it nears
  const first = part.blocks.findIndex(b => b.t === 'img')
  const heroIndex = first >= 0 && first <= 1 ? first : -1

  const out: ReactNode[] = []
  for (let i = 0; i < items.length; i++) {
    const { b, bi } = items[i]
    if (isChip(b)) {
      const row: Item[] = [items[i]]
      while (i + 1 < items.length && isChip(items[i + 1].b)) row.push(items[++i])
      if (row.length > 1) {
        out.push(
          <div key={`chips-${bi}`} className="my-[1.4em] flex flex-wrap justify-center gap-[0.6em] font-sans">
            {row.map(r => (
              <p key={r.bi} data-speak={r.bi} className="rounded-2xl border border-gold-500/40 bg-gold-500/10 px-[1.1em] py-[0.35em] text-[1.2em] font-bold text-gold-200">
                <Runs run={r.b as Extract<Block, { t: 'p' }>} strong="font-bold" />
              </p>
            ))}
          </div>,
        )
        continue
      }
    }
    out.push(renderBlock(b, bi, book, bi === heroIndex))
  }
  return <>{out}</>
}

function renderBlock(b: Block, bi: number, book: string, hero: boolean): ReactNode {
  const key = `${b.t}-${bi}`
  switch (b.t) {
    case 'h':
      return b.level === 2 ? (
        <h2 key={key} data-speak={bi} className="mb-[0.6em] mt-[1.8em] border-b border-gold-500/25 pb-[0.25em] font-sans text-[1.3em] font-bold leading-snug text-ink-50">
          <Runs run={b} />
        </h2>
      ) : (
        <h3 key={key} data-speak={bi} className="mb-[0.3em] mt-[1.4em] font-sans text-[1.1em] font-bold leading-snug text-gold-300">
          <Runs run={b} />
        </h3>
      )

    case 'p': {
      const style = b.style ?? 'plain'
      return (
        <p key={key} data-speak={bi} className={P_CLASS[style]}>
          <Runs run={b} strong={style === 'kv' ? 'font-bold text-gold-300' : STRONG} />
        </p>
      )
    }

    case 'sep':
      return (
        <div key={key} role="separator" className="my-[2em] flex items-center justify-center gap-3 text-gold-500/40">
          <span className="h-px w-16 bg-gradient-to-l from-gold-500/40 to-transparent" />
          <span aria-hidden className="text-[0.7em]">✦</span>
          <span className="h-px w-16 bg-gradient-to-r from-gold-500/40 to-transparent" />
        </div>
      )

    case 'img':
      return (
        <figure key={key} className={b.variant === 'son' ? 'mx-auto my-[1.8em] max-w-[17em] text-center' : 'my-[1.6em]'}>
          <img
            src={b.src} width={b.w} height={b.h} alt={bookMarks(b.alt)}
            loading={hero ? 'eager' : 'lazy'} decoding="async" {...(hero ? { fetchPriority: 'high' as const } : {})}
            className={b.variant === 'son'
              ? 'block h-auto w-full -rotate-1 rounded-xl border-[6px] border-[#fffdf7] shadow-[0_6px_24px_rgba(0,0,0,0.3)]'
              : 'block h-auto w-full rounded-2xl border border-ink-700/40 shadow-[0_8px_30px_rgba(0,0,0,0.25)]'}
          />
          {b.caption && <figcaption className="mt-[0.6em] font-sans text-[0.8em] leading-snug text-ink-300">{bookMarks(b.caption)}</figcaption>}
        </figure>
      )

    case 'quote':
      return (
        <blockquote key={key} data-speak={bi} className="my-[2em] border-y border-gold-500/30 py-[1.1em] text-center">
          <p className="text-[1.3em] font-bold leading-[1.7] text-gold-200">{bookMarks(b.text)}</p>
          <footer className="mt-[0.4em] font-sans text-[0.85em] text-gold-400"><cite className="not-italic">{bookMarks(b.source)}</cite></footer>
        </blockquote>
      )

    case 'card':
      return (
        <div key={key} role="group" aria-label={bookMarks(b.title)} className="my-[1.6em] overflow-hidden rounded-2xl border border-gold-500/40 bg-ink-800/50 font-sans text-[0.85em] leading-relaxed">
          <p className="bg-gold-500/15 px-[1em] py-[0.5em] text-center font-bold text-gold-200"><span aria-hidden>🎫 </span>{bookMarks(b.title)}</p>
          <dl>
            {b.rows.map((r, ri) => (
              <div key={ri} data-speak={`${bi}.${ri}`} className="flex gap-[0.8em] border-t border-ink-700/40 px-[1em] py-[0.55em]">
                <dt className="w-[6.5em] flex-none font-bold text-gold-300">{bookMarks(r.label)}</dt>
                <dd className="min-w-0 flex-1 text-ink-100">{bookMarks(r.text)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )

    case 'key':
      return (
        <div key={key} role="group" data-speak={bi} aria-label={bookMarks(b.title)}
          className="my-[2.2em] rounded-3xl border border-gold-500/50 bg-gradient-to-b from-gold-500/15 to-gold-500/5 px-[1.2em] py-[1.1em] text-center shadow-[0_0_30px_rgba(201,151,58,0.12)]">
          <p aria-hidden className="text-[2.2em] leading-none">🔑</p>
          <h2 className="mt-[0.3em] font-sans text-[1.15em] font-extrabold text-gold-300">{bookMarks(b.title)}</h2>
          <p className="mt-[0.5em]">{bookMarks(b.text)}</p>
          <p className="mt-[0.8em] text-[1.1em] font-bold leading-[1.7] text-gold-200">{bookMarks(b.verse)}</p>
          <p className="mt-[0.2em] font-sans text-[0.85em] text-gold-400">{bookMarks(b.source)}</p>
        </div>
      )

    case 'activity':
      return (
        <div key={key} role="group" aria-label={bookMarks(b.title)}
          className="my-[2.2em] rounded-2xl border border-gold-500/40 bg-gold-500/10 px-[1.1em] py-[1em] text-[0.95em]">
          <div data-speak={bi}>
            <h2 className="text-center font-sans text-[1.15em] font-extrabold text-gold-200"><span aria-hidden>🎲 </span>{bookMarks(b.title)}</h2>
            {b.intro && <p className="mt-[0.6em]"><Runs run={b.intro} /></p>}
          </div>
          <ol className="mt-[0.8em] list-decimal space-y-[0.6em] ps-[1.6em] marker:font-bold marker:text-gold-300">
            {b.items.map((it, ii) => (
              <li key={ii} data-speak={`${bi}.${ii}`} className="ps-[0.2em]"><Runs run={it} strong="font-bold text-gold-200" /></li>
            ))}
          </ol>
        </div>
      )

    case 'links':
      return (
        <ul key={key} className="my-[1.4em] flex flex-wrap justify-center gap-[0.5em] font-sans text-[0.9em]">
          {b.items.map(it => (
            <li key={it.part}>
              <Link href={readPartHref(book, it.part)} prefetch={false}
                className="inline-flex min-h-[44px] items-center rounded-full border border-gold-500/40 bg-gold-500/10 px-[1em] text-gold-200 transition-colors hover:bg-gold-500/20">
                {bookMarks(it.text)}
              </Link>
            </li>
          ))}
        </ul>
      )

    case 'journey':
      return (
        <ol key={key} className="my-[1.4em] space-y-[0.7em] font-sans">
          {b.items.map(it => (
            <li key={it.n}>
              <Link href={readPartHref(book, it.part)} prefetch={false}
                className="flex items-center gap-[0.9em] rounded-2xl border border-ink-700/50 bg-ink-800/40 p-[0.6em] transition-colors hover:border-gold-500/60 hover:bg-ink-800/70">
                <span aria-hidden className="w-[1.3em] flex-none text-center font-serif text-[1.8em] font-extrabold text-gold-400">{it.n}</span>
                <img src={it.thumb.src} width={it.thumb.w} height={it.thumb.h} alt="" loading="lazy" decoding="async"
                  className="h-[3.6em] w-[3.6em] flex-none rounded-xl object-cover" />
                <span className="flex min-w-0 flex-col gap-[0.15em] leading-snug">
                  <span className="text-[0.85em] font-bold text-ink-50">{bookMarks(it.title)}</span>
                  <span className="text-[0.7em] text-ink-300">{bookMarks(it.where)}</span>
                  <span className="text-[0.7em] text-gold-300">{bookMarks(it.who)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )

    case 'timeline':
      return (
        <ol key={key} className="relative my-[1.4em] font-sans before:absolute before:inset-y-[1em] before:start-[1.3em] before:w-[3px] before:rounded before:bg-gold-500/40 before:content-['']">
          {b.items.map(it => (
            <li key={it.n} className="relative pb-[1.2em] ps-[4em]">
              <span aria-hidden className={`absolute start-0 top-0 grid h-[2.7em] w-[2.7em] place-items-center rounded-full border-[3px] border-ink-900 text-[1.1em] font-extrabold ${it.first ? 'bg-gold-500 text-ink-900' : 'bg-ink-700 text-gold-200'}`}>
                {it.n}
              </span>
              <Link href={readPartHref(book, it.part)} prefetch={false} className="block rounded-lg transition-colors hover:text-gold-200">
                <span className="block font-serif text-[1.15em] font-bold text-ink-50">
                  {bookMarks(it.hebrew)} <small className="text-[0.75em] font-normal text-ink-300">· {bookMarks(it.civil)}</small>
                </span>
                <span className="block text-[0.9em] text-ink-200">
                  {bookMarks(it.place)} <span className="text-ink-400">· {bookMarks(it.region)}</span>
                </span>
                {it.first && <span className="sr-only"> (תחנת הפתיחה של המסע)</span>}
              </Link>
            </li>
          ))}
        </ol>
      )

    case 'glossary':
      return (
        <dl key={key} className="my-[1.2em] space-y-[0.9em]">
          {b.items.map((it, ii) => (
            <div key={ii} data-speak={`${bi}.${ii}`} className="rounded-2xl border border-ink-700/50 bg-ink-800/40 px-[1em] py-[0.8em]">
              <dt className="font-sans text-[1.1em] font-extrabold text-gold-300">{bookMarks(it.term)}</dt>
              <dd className="mt-[0.2em]">{bookMarks(it.text)}</dd>
              <dd className="mt-[0.4em] font-sans text-[0.8em] text-gold-400">{bookMarks(it.idea)}</dd>
            </div>
          ))}
        </dl>
      )

    case 'stamps':
      return (
        <ul key={key} className="my-[1.4em] grid grid-cols-2 gap-[0.7em] font-sans">
          {b.items.map((line, i) => (
            <li key={i} className="flex flex-col items-center gap-[0.6em] rounded-xl border-2 border-gold-500/40 p-[0.7em] text-center text-gold-200">
              <span className="grid h-[4.5em] w-[5.5em] place-items-center border-2 border-dashed border-gold-500/40 text-[0.8em] text-ink-400">{bookMarks(b.box)}</span>
              <span className="h-px w-4/5 border-b border-dotted border-ink-500" aria-hidden />
              <span className="text-[0.9em]">{bookMarks(line)}</span>
            </li>
          ))}
        </ul>
      )
  }
}
