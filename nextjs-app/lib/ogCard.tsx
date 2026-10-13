// Shared by the images next/og draws: the share card of a sage page (app/[locale]/sage/[id]/opengraph-image.tsx)
// and the status image of the Today page (app/[locale]/today/story/route.tsx). Fonts and the medallion are
// read from assets/og with fs (traced in next.config.ts); Hebrew goes through lib/ogText.
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { Locale } from './types'
import { isRtlText, rtlWords } from './ogText'

export const OG = {
  ink: '#0b0907',
  parchment: '#f3ead8',
  gold: '#c9973a',
  goldSoft: '#e2c27d',
  muted: '#a89a82',
}

async function asset(path: string): Promise<Buffer> {
  return readFile(join(process.cwd(), path))
}

/** The fonts for an image in this language, the faces to name in styles, and the medallion as a data URL. */
export async function ogAssets(loc: Locale) {
  const [frank, heebo, ptSerif, ptSans, medallion] = await Promise.all([
    asset('assets/og/FrankRuhlLibre-Bold.ttf'),
    asset('assets/og/Heebo-Medium.ttf'),
    asset('assets/og/PTSerif-Bold.ttf'),
    asset('assets/og/PTSans-Regular.ttf'),
    asset('assets/og/medallion-400.png'),
  ])
  return {
    fonts: [
      { name: 'Frank Ruhl Libre', data: frank, weight: 700 as const, style: 'normal' as const },
      { name: 'Heebo', data: heebo, weight: 500 as const, style: 'normal' as const },
      { name: 'PT Serif', data: ptSerif, weight: 700 as const, style: 'normal' as const },
      { name: 'PT Sans', data: ptSans, weight: 400 as const, style: 'normal' as const },
    ],
    // Russian has no glyphs in the Hebrew faces: its own serif and sans come first there.
    serif: loc === 'ru' ? 'PT Serif' : 'Frank Ruhl Libre',
    sans: loc === 'ru' ? 'PT Sans' : 'Heebo',
    medallion: `data:image/png;base64,${medallion.toString('base64')}`,
  }
}

/** A line of text that may be Hebrew: right to left as word boxes, otherwise plain text. */
export function OgLine({ text, size, color, font, weight, align }: {
  text: string; size: number; color: string; font: string; weight: number; align: 'start' | 'end' | 'center'
}) {
  const common = { fontSize: size, color, fontFamily: font, fontWeight: weight, lineHeight: 1.18 }
  if (!isRtlText(text)) {
    const textAlign = align === 'center' ? 'center' : align === 'end' ? 'right' : 'left'
    return <div style={{ display: 'flex', ...common, textAlign, justifyContent: align === 'center' ? 'center' : undefined }}>{text}</div>
  }
  return (
    <div style={{
      display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', ...common,
      justifyContent: align === 'center' ? 'center' : 'flex-start',
    }}>
      {rtlWords(text).map((w, i, all) => (
        // row-reverse: the gap to the next word is on a word's left, so a wrapped line starts flush right
        <span key={i} style={{ marginLeft: i === all.length - 1 ? 0 : size * 0.26 }}>{w}</span>
      ))}
    </div>
  )
}
