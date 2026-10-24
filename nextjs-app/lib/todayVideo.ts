// The Today page's video for a WhatsApp status or a story: the same card as its image (app/[locale]/today/
// story/route.tsx), 1080×1920, coming alive in twelve seconds: the medallion, the Hebrew date, the sage,
// one line about him, and the address. Made in the visitor's browser (components/today/TodayVideo.tsx):
// drawn frame by frame on a canvas and encoded to MP4 with WebCodecs, so nothing runs on the server and
// the phone gets a file WhatsApp takes. This module holds the timing and layout, with no DOM; the frame
// itself is drawn by components/today/drawTodayFrame.ts from the layout `videoLayout` returns.

export const VIDEO = { width: 1080, height: 1920, fps: 30, seconds: 12 } as const

/** What the video says: the page passes these, already in the page's language. */
export interface TodayCard {
  dir: 'rtl' | 'ltr'
  /** "היום באוצר חכמים" */
  heading: string
  /** "כ״ג בתשרי ה׳תשפ״ז" */
  date: string
  /** "חכם היום" / "יום ההילולא של" */
  kind: string
  name: string
  /** "ראשונים · 1138–1204" */
  sub: string
  /** One line about him, his core concept (empty when it has no translation in this language). */
  line: string
  /** "מחקר מלא · האזנה · סרטון · חידון" */
  more: string
  /** the site address without the scheme, from SITE_URL: "example.org/he/today" */
  host: string
  appTitle: string
  /** His era's colour. */
  accent: string
  /**
   * His portrait, when he has one: the page passes the 384 px file's address (same origin, so the canvas stays clean) and
   * the caption for its kind (a photograph never carries the illustration's); nothing here looks a portrait up itself.
   */
  portrait?: { src: string; caption: string }
}

/** 0 before `start`, 1 after `start + dur`, eased in between. */
export function phase(t: number, start: number, dur: number): number {
  const k = Math.min(1, Math.max(0, (t - start) / dur))
  return 1 - Math.pow(1 - k, 3)
}

/** Words into lines no wider than `max`, by a measure the canvas supplies. */
export function wrapWords(text: string, max: number, measure: (s: string) => number, maxLines = 6): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (cur && measure(next) > max) { lines.push(cur); cur = w } else cur = next
  }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[\s,;:.–-]*$/, '') + '…'
    return kept
  }
  return lines
}

/** The name's size by its length, as the image does. */
export function nameSize(name: string): number {
  return name.length <= 14 ? 120 : name.length <= 26 ? 100 : name.length <= 40 ? 84 : 70
}

/**
 * Encoder settings to try, best first: H.264 at full size (High, then Main, then Baseline), then 720×1280
 * for a device that cannot encode 1080p. Every phone's WhatsApp plays H.264 MP4.
 */
export const ENCODER_CANDIDATES = [
  { codec: 'avc1.640028', width: 1080, height: 1920 },
  { codec: 'avc1.4d0028', width: 1080, height: 1920 },
  { codec: 'avc1.42002a', width: 1080, height: 1920 },
  { codec: 'avc1.42001f', width: 720, height: 1280 },
] as const

// ---------------------------------------------------------------------------------------------------------------
// Layout and cues. Computed once per video (not per frame) from the card and a text measure the canvas supplies.
// Without a portrait every number is exactly what the video had before the portrait existed (tests/todayVideoPortrait.test.ts
// pins it against the old formulas); with one, the medallion shrinks and the picture sits between the date and the pill.
// ---------------------------------------------------------------------------------------------------------------

/** The picture's smallest and largest outer side (ring included), in the card's 1080×1920 units. */
export const PORTRAIT_VIDEO_MIN = 240
export const PORTRAIT_VIDEO_MAX = 368
/** The ring around the picture is this thick; the picture is drawn inside it. */
export const PORTRAIT_RING = 6
/** The corner radius of the picture's outer edge, as the status image's. */
export const PORTRAIT_RADIUS = 60
/** The very slow push-in over the rest of the video: at most this much larger at the end. */
export const PORTRAIT_PUSH = 0.04
/** The portrait files are 384 px (public/portraits/<id>.webp); a picture drawn larger than this would be blurred. */
export const PORTRAIT_FILE_PX = 384

/** The whole card drifts toward the viewer over the video (drawTodayFrame); the portrait rides on it. */
export const CARD_DRIFT = 0.025
export const cardZoom = (t: number): number => 1 + CARD_DRIFT * (t / VIDEO.seconds)

/** Width of `text` in px at this font role (the serif or sans of the page), weight and size. */
export type VideoMeasure = (text: string, role: 'serif' | 'sans', weight: number, px: number) => number

export interface VideoLine { text: string; y: number }

/** Where everything stands, in the card's own units (baselines for text, tops for boxes). */
export interface VideoLayout {
  medallion: { cy: number; size: number }
  /** The soft gold glow behind the medallion. */
  glow: { cy: number; r: number }
  headingY: number
  dateY: number
  /** Only with a portrait: the outer square (ring included), its x, y and radius, and the baseline of its caption. */
  portrait?: { x: number; y: number; size: number; radius: number; captionY: number }
  pill: { y: number; h: number }
  nameSize: number
  nameLines: VideoLine[]
  /** The era and years line; null when the card has none. */
  subY: number | null
  coreLines: VideoLine[]
  footer: { moreY: number; hostY: number; appY: number }
  /** The y just after the last block of the middle (the footer starts at 1690). */
  bottom: number
}

/** With a portrait: the picture starts no higher than this, and the middle ends (the y after the last line) no lower than that. */
const PORTRAIT_TOP = 516
const PORTRAIT_STACK_END = 1610
/** From the picture's bottom edge to the caption's baseline, and to the pill's top. */
const CAPTION_GAP = 46
const PILL_GAP = 84
/** A short text leaves room: the stack moves down by half of it, at most this far. */
const MAX_CENTRE_SHIFT = 120

const FOOTER = { moreY: 1690, hostY: 1745, appY: 1800 } as const

/**
 * The pill, the name, the era line and the core idea, one under the other from `y0`, by the same arithmetic as the
 * video always had (so the numbers are bit for bit the same without a portrait).
 */
function textStack(y0: number, nSize: number, nameLines: string[], hasSub: boolean, coreLines: string[]) {
  let y = y0
  const pill = { y, h: 70 }
  y += 70 + 44
  const names: VideoLine[] = []
  for (const text of nameLines) {
    y += nSize
    names.push({ text, y })
    y += nSize * 0.12
  }
  let subY: number | null = null
  if (hasSub) { y += 30 + 40; subY = y; y += 4 }
  const core: VideoLine[] = []
  if (coreLines.length) {
    y += 46
    for (const text of coreLines) { y += 52; core.push({ text, y }); y += 6 }
  }
  return { pill, names, subY, core, bottom: y }
}

export function videoLayout(card: TodayCard, measure: VideoMeasure): VideoLayout {
  const nSize = nameSize(card.name)
  const nameLines = wrapWords(card.name, 940, s => measure(s, 'serif', 700, nSize), 3)
  const wrapCore = (max: number) => (card.line ? wrapWords(card.line, 900, s => measure(s, 'sans', 500, 40), max) : [])
  const total = (core: string[]) =>
    70 + 44 + nameLines.length * nSize * 1.12 + (card.sub ? 30 + 44 : 0) + (core.length ? 46 + core.length * 58 : 0)

  if (!card.portrait) {
    // the middle is centred between y 860 and 1580
    const core = wrapCore(5)
    const stack = textStack(Math.max(860, 860 + (720 - total(core)) / 2), nSize, nameLines, Boolean(card.sub), core)
    return {
      medallion: { cy: 400, size: 300 }, glow: { cy: 400, r: 520 }, headingY: 640, dateY: 728,
      pill: stack.pill, nameSize: nSize, nameLines: stack.names, subY: stack.subY, coreLines: stack.core,
      footer: FOOTER, bottom: stack.bottom,
    }
  }

  // With a portrait the picture takes as much as the text leaves, between 240 and 368 px: a long text shrinks it toward 240,
  // and only when it is 240 and the text still does not fit is the core idea cut (4 lines, 3, 2, 1, none): the most that fit.
  // The caption always stays.
  const roomFor = (core: string[]) => PORTRAIT_STACK_END - PORTRAIT_TOP - PILL_GAP - total(core)
  let core = wrapCore(5)
  let size = Math.min(PORTRAIT_VIDEO_MAX, Math.floor(roomFor(core) / 2) * 2)
  if (size < PORTRAIT_VIDEO_MIN) {
    size = PORTRAIT_VIDEO_MIN
    core = []
    for (let max = 4; max >= 1; max--) {
      const lines = wrapCore(max)
      if (roomFor(lines) >= PORTRAIT_VIDEO_MIN) { core = lines; break }
    }
  }
  const slack = PORTRAIT_STACK_END - PORTRAIT_TOP - PILL_GAP - total(core) - size
  const top = PORTRAIT_TOP + Math.min(MAX_CENTRE_SHIFT, Math.max(0, Math.floor(slack / 4) * 2))
  const stack = textStack(top + size + PILL_GAP, nSize, nameLines, Boolean(card.sub), core)
  return {
    medallion: { cy: 205, size: 170 }, glow: { cy: 205, r: 420 }, headingY: 370, dateY: 458,
    portrait: { x: VIDEO.width / 2 - size / 2, y: top, size, radius: PORTRAIT_RADIUS, captionY: top + size + CAPTION_GAP },
    pill: stack.pill, nameSize: nSize, nameLines: stack.names, subY: stack.subY, coreLines: stack.core,
    footer: FOOTER, bottom: stack.bottom,
  }
}

/** When each part comes in, in seconds. */
export interface VideoCues {
  /** The portrait starts to fade in; the ring starts to draw; the caption comes in. Meaningful only with a portrait. */
  portrait: number
  ring: number
  caption: number
  pill: number
  name: number
  sub: number
  /** The first core-idea line, and the delay between the lines. */
  line: number
  lineStep: number
  more: number
  host: number
  app: number
}

/** The portrait comes alive after the date and pushes the later cues back by this much (the footer stays at 8.6 s). */
const PORTRAIT_CUE_SHIFT = 0.5

export function videoCues(withPortrait: boolean): VideoCues {
  const k = withPortrait ? PORTRAIT_CUE_SHIFT : 0
  return {
    portrait: 1.4, ring: 1.6, caption: 2.0,
    pill: 2.0 + k, name: 2.5 + k, sub: 3.3 + k, line: 4.3 + k, lineStep: 0.55,
    more: 8.6, host: 8.8, app: 9.0,
  }
}

/** How large the portrait is at time `t`, against its layout size: 0.9 → 1 as it fades in, then the slow push-in. */
export function portraitScale(t: number, cues: VideoCues): number {
  const intro = 0.9 + 0.1 * phase(t, cues.portrait, 0.9)
  const push = Math.min(1, Math.max(0, (t - cues.portrait) / (VIDEO.seconds - cues.portrait)))
  return intro * (1 + PORTRAIT_PUSH * push)
}

/** The side, in canvas units, at which the portrait's file is drawn at time `t`: never above `PORTRAIT_FILE_PX`. */
export function portraitDrawPx(size: number, t: number, cues: VideoCues): number {
  return (size - 2 * PORTRAIT_RING) * portraitScale(t, cues) * cardZoom(t)
}
