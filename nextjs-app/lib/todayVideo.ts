// The Today page's video for a WhatsApp status or a story: the same card as its image (app/[locale]/today/
// story/route.tsx), 1080×1920, coming alive in twelve seconds: the medallion, the Hebrew date, the sage,
// one line about him, and the address. Made in the visitor's browser (components/today/TodayVideo.tsx):
// drawn frame by frame on a canvas and encoded to MP4 with WebCodecs, so nothing runs on the server and
// the phone gets a file WhatsApp takes. This module holds the timing and layout, with no DOM.

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
  /** "ozar-chachamim.vercel.app/he/today" */
  host: string
  appTitle: string
  /** His era's colour. */
  accent: string
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
