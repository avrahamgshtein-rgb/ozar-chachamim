// The share images of a path between two sages ("שישה צעדים"): the link preview of the path page
// (app/[locale]/tower/path/[from]/[to]/opengraph-image.tsx, 1200 x 630) and the status image the share sheet
// sends (.../story/route.tsx, 1080 x 1920). This file holds what both need and keeps no drawing: the title
// the page and the images share, the wording of the step count, which stations are shown when the path is
// too long for the picture (the first ones, a "+k" disc, the last ones), the sizes the layouts work to
// (pure, so a test can assert that the longest path still fits), and the path itself read from the corpus.
// Server only: the portraits come from lib/ogPortrait.ts as JPEG data URLs (Satori cannot read WebP), and the
// captions under them from the portrait's own kind, never picked here.
import { connectGraph, connectNet } from './connectServer'
import { describePath, shortestPath } from './connect'
import { getSageById } from './serverData'
import { ogPortrait } from './ogPortrait'
import { portraitOf, type PortraitKind } from './portraits'
import { ruPlural } from '@/components/viz/SinaiPathText'
import { ERA_COLORS, ERA_LABELS, type Locale, type Period } from './types'
import { formatYearRangeFor } from './utils'

/** "Rashi ← the Rambam" in Hebrew (the arrow points the way the line reads), "Rashi → the Rambam" elsewhere. */
export const titleOf = (a: string, b: string, loc: Locale): string => `${a} ${loc === 'he' ? '←' : '→'} ${b}`

/**
 * Hebrew typography for what the images draw: the roster writes an acronym with an ASCII quote (רמב"ם), and a straight
 * quote between two letters is not a gershayim. Turns `"` between Hebrew letters into ״ and a `'` after a Hebrew letter into ׳.
 */
export const gershayim = (text: string): string => text.replace(/(?<=[א-ת])"(?=[א-ת])/g, '״').replace(/(?<=[א-ת])'/g, '׳')

/** "5 steps": the links between the sages, one less than the stations (the wording of the path page and its panel). */
export function stepsLabel(n: number, loc: Locale): string {
  if (loc === 'he') return n === 1 ? 'צעד אחד' : `${n} צעדים`
  if (loc === 'en') return n === 1 ? '1 step' : `${n} steps`
  return `${n} ${ruPlural(n, 'шаг', 'шага', 'шагов')}`
}

/** The name of the game, on top of the story image. */
export const SIX_STEPS: Record<Locale, string> = { he: 'שישה צעדים', en: 'Six Steps', ru: 'Шесть шагов' }

/** "4 more sages": what the "+k" disc stands for. */
export function hiddenLabel(k: number, loc: Locale): string {
  if (loc === 'he') return k === 1 ? 'עוד חכם אחד' : `עוד ${k} חכמים`
  if (loc === 'en') return k === 1 ? '1 more sage' : `${k} more sages`
  return `ещё ${k} ${ruPlural(k, 'мудрец', 'мудреца', 'мудрецов')}`
}

/** The alt of the card, which says what it shows: "Rashi → the Rambam · 2 steps". */
export const cardAlt = (a: string, b: string, steps: number, loc: Locale): string => `${titleOf(a, b, loc)} · ${stepsLabel(steps, loc)}`

/** The path page's card and story, by address (no query: a card is the same whoever opens it). */
export const cardPath = (loc: Locale, from: string, to: string): string =>
  `/${loc}/tower/path/${encodeURIComponent(from)}/${encodeURIComponent(to)}/opengraph-image`
export const storyPath = (loc: Locale, from: string, to: string): string =>
  `/${loc}/tower/path/${encodeURIComponent(from)}/${encodeURIComponent(to)}/story`

/* ── Which stations are drawn ─────────────────────────────────────────── */

/** A station by its index in the path, or the run of `hidden` stations a "+k" disc stands for. */
export type Shown = number | { hidden: number }

/**
 * The stations to draw when at most `maxFull` fit: all of them, or, past that, the first ones, one "+k" disc and the
 * last ones, as many on each side as leave room for the disc (`elide(10, 7)` is [0, 1, 2, {hidden: 4}, 7, 8, 9]).
 * Never more than `maxFull` items, and never a "+1": the disc stands for at least two stations.
 */
export function elide(count: number, maxFull: number): Shown[] {
  const all = Array.from({ length: Math.max(0, count) }, (_, i) => i)
  if (count <= maxFull) return all
  const keep = Math.max(1, Math.floor((maxFull - 1) / 2))
  return [...all.slice(0, keep), { hidden: count - 2 * keep }, ...all.slice(count - keep)]
}

export const isHidden = (s: Shown): s is { hidden: number } => typeof s !== 'number'

/* ── The sizes the layouts work to (pure) ─────────────────────────────── */

export const CARD_SIZE = { width: 1200, height: 630 } as const
export const STORY_SIZE = { width: 1080, height: 1920 } as const

/** The card shows up to this many items (faces and the "+k" disc) in a row. */
export const CARD_MAX_ITEMS = 7
/** The width of the row of faces on the card (the card's width less 56 px of margin on each side). */
export const CARD_ROW_WIDTH = 1088
/** The largest face on the card, however few the stations. */
export const CARD_FACE_MAX = 208
/**
 * A painted face is what makes the card's PNG large (about 2.8 bytes a pixel for a photograph), and a link preview over
 * ~300 KB is dropped by WhatsApp: the faces together never cover more than this many square pixels (as circles), so the more
 * faces, the smaller each one. tests/pathShare.test.ts renders the paths with the heaviest portraits and fails above 270 KB.
 */
export const CARD_FACE_AREA = 72_000

export interface CardLayout {
  items: Shown[]
  /** The diameter of a face (and of the "+k" disc). */
  face: number
  /** The width of the column of one item: the face and its name under it. */
  pitch: number
  nameSize: number
}

export function cardLayout(count: number): CardLayout {
  const items = elide(count, CARD_MAX_ITEMS)
  const pitch = Math.floor(CARD_ROW_WIDTH / Math.max(1, items.length))
  const faces = items.filter(i => !isHidden(i)).length
  const byArea = Math.sqrt((4 * CARD_FACE_AREA) / (Math.PI * Math.max(1, faces)))
  const face = Math.min(CARD_FACE_MAX, Math.floor(Math.min(pitch * 0.74, byArea) / 2) * 2)
  const nameSize = items.length <= 4 ? 28 : items.length <= 6 ? 25 : 22
  return { items, face, pitch, nameSize }
}

/**
 * The story is a column: header, title and step count; then the stations, a face each with the caption of the link
 * between two of them; then the address, the credit and the site. These are the heights of the three blocks (with
 * the 18 px frame at top and bottom they add up to the image's 1,920) and of the pieces of the middle one.
 */
export const STORY = {
  top: 316,
  zone: 1378,
  /** air kept between the column's last line and the credit below it */
  pad: 24,
  bottom: 190,
  /** between two stations: the line and the caption of the link, at least this tall (a short path spreads them out, up to `connectorMax`) */
  connector: 50,
  connectorMax: 150,
  /** between a station and a "+k" disc: the line alone */
  plain: 28,
  /** the row of the "+k" disc */
  hiddenRow: 88,
  /** the disc itself */
  hiddenDisc: 76,
  faceMax: 220,
  /** the story shows up to this many stations in full; past it, the first three, a disc and the last three */
  maxFull: 7,
} as const

export interface StoryLayout {
  items: Shown[]
  face: number
  /** The height of the gap between two stations (the line and its caption). */
  connector: number
  /** The height the column takes (at most STORY.zone). */
  height: number
}

export function storyLayout(count: number): StoryLayout {
  const items = elide(count, STORY.maxFull)
  const faces = items.filter(i => !isHidden(i)).length
  let fixed = 0 // the "+k" rows and the plain lines
  let captioned = 0 // the gaps that carry a caption
  items.forEach((it, k) => {
    if (isHidden(it)) fixed += STORY.hiddenRow
    if (k === 0) return
    if (isHidden(it) || isHidden(items[k - 1])) fixed += STORY.plain
    else captioned++
  })
  const face = Math.min(STORY.faceMax, Math.floor((STORY.zone - STORY.pad - fixed - captioned * STORY.connector) / Math.max(1, faces) / 10) * 10)
  // what the faces leave over is shared out between the captioned gaps, so a short path is not a few faces at the top of a black page
  const spare = STORY.zone - STORY.pad - fixed - faces * face
  const connector = captioned ? Math.max(STORY.connector, Math.min(STORY.connectorMax, Math.floor(spare / captioned))) : STORY.connector
  return { items, face, connector, height: faces * face + fixed + captioned * connector }
}

/* ── The path, read from the corpus ───────────────────────────────────── */

/** One station as the images draw him. */
export interface ShareStation {
  id: string
  /** The short name in the page's language: what the page's title calls him. */
  name: string
  period: Period
  /** His era in the page's language. */
  era: string
  years: string
  /** The colour of his era. */
  color: string
  /** How he is linked to the station before him; null on the first. */
  caption: string | null
  /** The link into him is influence, not a person-to-person tie: the line to him is dotted. */
  dotted: boolean
  /** The kind of his portrait, or null when he has none (the portrait's file may still be missing: see `facesOf`). */
  portraitKind: PortraitKind | null
}

export interface PathShare {
  loc: Locale
  from: string
  to: string
  stations: ShareStation[]
  /** The links between the stations: one less than the stations. */
  steps: number
  title: string
}

/** The path from one sage to another as the images tell it, or null: an unknown sage, the same sage twice, or two sages with no path between them (the page's 404s). */
export function pathShare(loc: Locale, from: string, to: string): PathShare | null {
  if (from === to) return null
  const path = shortestPath(connectGraph(), from, to)
  if (!path) return null
  const views = describePath(connectNet(loc), path, loc)
  const stations: ShareStation[] = []
  for (const v of views) {
    const sage = getSageById(v.id)
    if (!sage) return null
    stations.push({
      id: v.id,
      name: gershayim(v.name),
      period: v.period,
      era: ERA_LABELS[v.period]?.[loc] ?? '',
      years: formatYearRangeFor(loc, sage.birth_year, sage.death_year, sage.date_precision),
      color: ERA_COLORS[v.period] ?? '#c9973a',
      caption: v.caption === null ? null : gershayim(v.caption),
      dotted: v.dotted,
      portraitKind: portraitOf(v.id)?.kind ?? null,
    })
  }
  return { loc, from, to, stations, steps: stations.length - 1, title: titleOf(stations[0].name, stations[stations.length - 1].name, loc) }
}

/** A face the image draws: the sage's JPEG as a data URL and the caption of its kind. */
export interface Face { src: string; caption: string; kind: PortraitKind }

/**
 * The faces of the stations in `shown` (by index in the path). A station with no portrait, or whose file is missing, has
 * none: the image draws a disc in his era's colour with the medallion for him, so there is never a gap or a broken image.
 */
export async function facesOf(share: PathShare, shown: readonly Shown[]): Promise<Map<number, Face>> {
  const out = new Map<number, Face>()
  await Promise.all(shown.map(async it => {
    if (isHidden(it)) return
    const st = share.stations[it]
    if (!st.portraitKind) return
    const art = await ogPortrait(st.id, share.loc)
    if (art) out.set(it, { src: art.src, caption: art.caption, kind: st.portraitKind })
  }))
  return out
}

/** A credit line under the image: the caption of a kind of portrait that is drawn. */
export interface Credit { kind: PortraitKind; text: string }

/**
 * The credit lines under the image: one for each kind of portrait actually drawn, in the order the kinds first appear. Each
 * text is the portrait's own caption. When both kinds are drawn the image marks the photographs (`mixed`), so each line
 * tells which faces it is for.
 */
export function creditLines(faces: ReadonlyMap<number, Face>): { lines: Credit[]; mixed: boolean } {
  const seen = new Set<PortraitKind>()
  const lines: Credit[] = []
  for (const k of [...faces.keys()].sort((a, b) => a - b)) {
    const f = faces.get(k)!
    if (seen.has(f.kind)) continue
    seen.add(f.kind)
    lines.push({ kind: f.kind, text: f.caption })
  }
  return { lines, mixed: lines.length > 1 }
}
