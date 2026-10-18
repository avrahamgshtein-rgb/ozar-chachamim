// A sage's portrait for the images next/og draws (the share card and the Today status image). Server only.
// Satori, which draws those images, rejects every WebP in this Next version and reads PNG and JPEG, so the
// portraits get a third generated file apart from the two the pages use: assets/og/portraits/<id>.jpg (320 x 320),
// written by scripts/build_portraits.py with the other two and read here with fs, like the fonts in lib/ogCard.tsx
// (it sits inside the ./assets/og/** that next.config.ts traces into the two routes). Never hand-edit it.
import { readFile } from 'fs/promises'
import { join } from 'path'
import { portraitCredit, portraitOf, type Portrait } from './portraits'
import type { Locale } from './types'

// The portrait's side on the share card (1200 x 630), in the right column. The card has to stay under WhatsApp's ~300 KB
// preview limit and a painted portrait is what makes its PNG large: tests/portraitsShare.test.ts renders the card at this
// size for the largest portraits in all three languages and fails above 270 KB. The status image (1080 x 1920) is a file
// for the share sheet, not a link preview, so it has no such limit.
export const CARD_PORTRAIT_PX = 280

/**
 * The side of the portrait on the status image (1080 x 1920), large, between the date and the sage's name: as large as the
 * text of the day leaves room for. The name (up to ~45 characters at 70 to 120 px) and the core idea (up to 150 characters
 * at 40 px) wrap to one to four lines each, and Satori cannot measure text, so the lines are estimated from the average
 * width of a character in each script. What is left of the 1,654 px between the frame's padding, after the medallion, date,
 * badge, era and footer (and 80 px of air), goes to the picture: never under 260 px nor over 440.
 */
export function storyPortraitPx(name: string, nameSize: number, line: string, loc: Locale): number {
  const inner = 920 // the text column's width
  const nameLines = Math.max(1, Math.ceil((name.length * nameSize * (loc === 'he' ? 0.45 : 0.6)) / inner))
  const lineLines = line ? Math.max(1, Math.ceil((line.length * 40 * 0.5) / inner)) : 0
  const room = 756 - nameLines * nameSize * 1.18 - lineLines * 47 + (line ? 0 : 44)
  return Math.min(440, Math.max(260, Math.floor(room / 10) * 10))
}

/** The sage's portrait as a data URL for an `<img>` Satori draws, or null: no portrait, or its file is missing. */
export async function portraitImage(id: string): Promise<string | null> {
  if (!portraitOf(id)) return null
  try {
    const jpg = await readFile(join(process.cwd(), 'assets/og/portraits', `${id}.jpg`))
    return `data:image/jpeg;base64,${jpg.toString('base64')}`
  } catch {
    return null
  }
}

/** The caption drawn under the portrait: the same wording the pages show, by the portrait's kind (illustration or photo). */
export function ogCaption(portrait: Pick<Portrait, 'kind'>, loc: Locale): string {
  return portraitCredit(portrait, loc)
}

/** The picture and its caption for one sage, or null when the card or story is to stay as it was. */
export async function ogPortrait(id: string, loc: Locale): Promise<{ src: string; caption: string } | null> {
  const portrait = portraitOf(id)
  if (!portrait) return null
  const src = await portraitImage(id)
  return src ? { src, caption: ogCaption(portrait, loc) } : null
}
