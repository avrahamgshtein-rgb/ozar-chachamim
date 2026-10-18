// The pieces the two share images of a path have in common (the card, app/[locale]/tower/path/[from]/[to]/opengraph-image.tsx,
// and the story, .../story/route.tsx): a sage's face, the disc that stands for the stations left out, a dotted or
// solid line with an arrowhead, and the title with its arrow. Drawn with Satori (next/og): flex boxes and inline SVG only,
// no emoji (it would fetch them over the network), and no style key set to undefined (Satori calls .trim() on every
// value). Hebrew goes through lib/ogCard's OgLine / lib/ogText, since Satori has no right-to-left layout.
import { OG } from './ogCard'
import { clipWords, rtlWords, isRtlText } from './ogText'
import { FLIGHT_COLOR } from './connectFlight'
import { titleOf } from './pathShare'
import type { Locale } from './types'

export const TEAL = FLIGHT_COLOR

/** A small camera: the mark on the faces that are photographs, when a path shows both photographs and illustrations (the credit under the image says which is which). */
export function PhotoMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8a2 2 0 0 1 2-2h2.2l1.3-2h7l1.3 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill={OG.parchment} />
      <circle cx="12" cy="13" r="3.6" fill={OG.ink} />
    </svg>
  )
}

/**
 * A sage's face: his JPEG in a round frame ringed with his era's colour; with none, a disc in that colour holding the
 * medallion. `photo` puts the camera mark on its corner (see PhotoMark).
 */
export function FaceDisc({ size, ring, color, src, medallion, photo = false, rtl = false }: {
  size: number; ring: number; color: string; src: string | null; medallion: string; photo?: boolean; rtl?: boolean
}) {
  const inner = size - 2 * ring
  const mark = Math.round(inner * 0.64)
  const badge = Math.max(26, Math.round(size * 0.26))
  return (
    <div style={{ display: 'flex', position: 'relative', width: size, height: size }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: size / 2,
        border: `${ring}px solid ${color}`, overflow: 'hidden', background: src ? OG.ink : `${color}33`,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} width={inner} height={inner} alt="" /> : <img src={medallion} width={mark} height={mark} alt="" style={{ opacity: 0.92 }} />}
      </div>
      {photo && (
        <div style={{
          display: 'flex', position: 'absolute', bottom: 0, ...(rtl ? { left: 0 } : { right: 0 }), alignItems: 'center', justifyContent: 'center',
          width: badge, height: badge, borderRadius: badge / 2, background: color, border: `2px solid ${OG.ink}`,
        }}>
          <PhotoMark size={Math.round(badge * 0.66)} />
        </div>
      )}
    </div>
  )
}

/** The disc for the stations left out: a dashed ring with "+k" in it. */
export function MoreDisc({ size, k, font }: { size: number; k: number; font: string }) {
  const r = size / 2 - 2
  return (
    <div style={{ display: 'flex', position: 'relative', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', left: 0, top: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TEAL} strokeWidth={3} strokeDasharray="9 8" strokeLinecap="round" />
      </svg>
      <div style={{ display: 'flex', fontFamily: font, fontWeight: 700, fontSize: Math.round(size * 0.4), color: TEAL }}>{`+${k}`}</div>
    </div>
  )
}

/**
 * A line between two stations with an arrowhead at its end (the way the path reads): `len` long, horizontal or vertical,
 * solid, or dotted where the way in is only influence. `toward` is the end the arrow points to: 'right' / 'down' draw it
 * from the start edge, 'left' draws it mirrored (Hebrew reads from the right).
 */
export function PathLine({ len, thickness, dotted, toward }: { len: number; thickness: number; dotted: boolean; toward: 'right' | 'left' | 'down' }) {
  const head = Math.round(thickness * 3.2)
  const span = Math.round(head * 1.4)
  const vertical = toward === 'down'
  const w = vertical ? span : len
  const h = vertical ? len : span
  const mid = span / 2
  // the stem runs from the tail to the arrowhead's base
  const stem = Math.max(0, len - head)
  const common = { stroke: TEAL, strokeWidth: dotted ? thickness * 1.5 : thickness, strokeLinecap: 'round' as const }
  const dash = dotted ? { strokeDasharray: `0 ${Math.round(thickness * 3.6)}` } : {}
  let stemEl, headEl
  if (toward === 'right') {
    stemEl = <line x1={thickness} y1={mid} x2={stem} y2={mid} {...common} {...dash} />
    headEl = <polygon points={`${len - head},${mid - head * 0.62} ${len},${mid} ${len - head},${mid + head * 0.62}`} fill={TEAL} />
  } else if (toward === 'left') {
    stemEl = <line x1={len - thickness} y1={mid} x2={len - stem} y2={mid} {...common} {...dash} />
    headEl = <polygon points={`${head},${mid - head * 0.62} 0,${mid} ${head},${mid + head * 0.62}`} fill={TEAL} />
  } else {
    stemEl = <line x1={mid} y1={thickness} x2={mid} y2={stem} {...common} {...dash} />
    headEl = <polygon points={`${mid - head * 0.62},${len - head} ${mid},${len} ${mid + head * 0.62},${len - head}`} fill={TEAL} />
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
      {stemEl}
      {headEl}
    </svg>
  )
}

/**
 * The title "A → B" (Hebrew "A ← B"), wrapping at word boundaries, centred, the arrow in the path's teal. Hebrew words
 * are drawn one box each, in visual order, in a row-reverse row: the same way as OgLine.
 */
export function TitleLine({ text, size, font, color }: { text: string; size: number; font: string; color: string }) {
  const rtl = isRtlText(text)
  const words = text.split(/\s+/).filter(Boolean)
  const visual = rtl ? rtlWords(text) : words
  const arrow = (w: string) => w === '←' || w === '→'
  return (
    <div style={{
      display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%',
      fontSize: size, fontFamily: font, fontWeight: 700, lineHeight: 1.18,
    }}>
      {visual.map((w, i) => (
        <span key={i} style={{ color: arrow(words[i]) ? TEAL : color, marginLeft: size * 0.26 / 2, marginRight: size * 0.26 / 2 }}>{w}</span>
      ))}
    </div>
  )
}

/** The average width of a character in the bold serif each language draws with, in ems: Satori cannot measure text, so lines are estimated. */
const EM: Record<Locale, number> = { he: 0.5, en: 0.55, ru: 0.6 }

/** How many lines the text takes in a box `width` px wide when set at `size` px: a greedy wrap by words, on the estimated widths. */
export function linesOf(text: string, size: number, width: number, loc: Locale): number {
  const perChar = size * EM[loc]
  let lines = 1
  let used = 0
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const w = word.length * perChar
    const need = used === 0 ? w : used + perChar + w
    if (need <= width || used === 0) { used = need; continue }
    lines++
    used = w
  }
  return lines
}

/** The largest of `sizes` (descending) at which the text fits `maxLines` lines and `maxHeight` px of a `width` px box; the smallest when none does. */
export function fitSize(text: string, width: number, maxHeight: number, sizes: readonly number[], loc: Locale, maxLines = 2): number {
  for (const s of sizes) {
    const lines = linesOf(text, s, width, loc)
    if (lines <= maxLines && lines * s * 1.18 <= maxHeight) return s
  }
  return sizes[sizes.length - 1]
}

/** The width of a run of `chars` characters at `size` px, estimated. */
const widthOf = (chars: number, size: number, loc: Locale) => chars * size * EM[loc]

/** The largest size from `max` down to `min` at which the longest word of every text fits a box `width` px wide (Satori does not break a word). */
export function wordFit(texts: readonly string[], width: number, loc: Locale, max: number, min: number): number {
  const longest = Math.max(1, ...texts.flatMap(t => t.split(/\s+/).map(w => w.length)))
  return Math.max(min, Math.min(max, Math.floor(width / (longest * EM[loc]))))
}

/**
 * The text cut at a word, with an ellipsis, so that it takes at most `maxLines` lines in a box `width` px wide when set at
 * `size` px; a single word wider than the box is cut inside the word.
 */
export function clipToLines(text: string, size: number, width: number, loc: Locale, maxLines: number): string {
  const words = text.split(/\s+/).filter(Boolean).map(w => (widthOf(w.length, size, loc) > width ? `${w.slice(0, Math.max(2, Math.floor(width / (size * EM[loc])) - 1))}…` : w))
  const fitted = words.join(' ')
  let out = fitted
  for (let max = fitted.length - 1; linesOf(out, size, width, loc) > maxLines && max > 4; max -= 2) out = clipWords(fitted, max)
  return out
}

/** "A → B" with each name cut at a word, as little as it takes, so that the title fits two lines of `width` px at `size` px. */
export function clipTitle(a: string, b: string, loc: Locale, width: number, size: number): string {
  let title = titleOf(a, b, loc)
  for (let max = Math.max(a.length, b.length) - 2; linesOf(title, size, width, loc) > 2 && max > 8; max -= 2) title = titleOf(clipWords(a, max), clipWords(b, max), loc)
  return title
}
