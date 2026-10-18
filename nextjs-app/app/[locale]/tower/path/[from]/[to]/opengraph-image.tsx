// The link preview of a path page (1200 x 630): the image WhatsApp, Telegram, Facebook and X show when "from Rashi to the
// Rambam in 2 steps" is shared: the title, the number of steps, and the stations as a row of round faces joined by a
// line in the path's teal (dotted where the way in is only influence), the short name under each. A sage with no
// portrait is a disc in his era's colour with the medallion; a long path shows its first three, a "+k" disc and its
// last three. Drawn on request by next/og, in the page's language. Hebrew goes through lib/ogCard (Satori has no
// right-to-left layout), portraits through lib/ogPortrait as JPEG (Satori rejects WebP), and the PNG stays under
// WhatsApp's ~300 KB preview limit (tests/pathShare.test.ts renders the worst cases and fails above 270 KB).
// A pair with no path, an unknown sage or the same sage twice is a plain 404, as the page is.
import { ImageResponse } from 'next/og'
import { isValidLocale, UI } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { SITE_URL } from '@/lib/siteUrl'
import { OG, OgLine, ogAssets } from '@/lib/ogCard'
import { CARD_ROW_WIDTH, CARD_SIZE, cardLayout, creditLines, facesOf, hiddenLabel, isHidden, pathShare, stepsLabel } from '@/lib/pathShare'
import { FaceDisc, MoreDisc, PathLine, PhotoMark, TEAL, TitleLine, clipTitle, clipToLines, fitSize, wordFit } from '@/lib/pathShareArt'

export const alt = 'אוצר חכמים · Ozar Chachamim'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const { ink: INK, parchment: PARCHMENT, gold: GOLD, muted: MUTED } = OG

export default async function Image({ params }: { params: Promise<{ locale: string; from: string; to: string }> }) {
  const { locale, from, to } = await Promise.resolve(params)
  if (!isValidLocale(locale)) return new Response('Not found', { status: 404 })
  const loc = locale as Locale
  const share = pathShare(loc, from, to)
  if (!share) return new Response('Not found', { status: 404 })

  const { fonts, serif, sans, medallion } = await ogAssets(loc)
  const rtl = loc === 'he'
  const layout = cardLayout(share.stations.length)
  const faces = await facesOf(share, layout.items)
  const credits = creditLines(faces)
  const host = SITE_URL.replace(/^https?:\/\//, '')
  const { face, pitch, items } = layout
  const ring = face >= 140 ? 6 : 5
  const rowOffset = (CARD_ROW_WIDTH - pitch * items.length) / 2
  const centreY = face / 2
  // a name is set in up to three lines when the columns are narrow (seven faces), two otherwise
  const nameLines = items.length <= 4 ? 2 : 3
  // one size for every name, small enough for the longest word to fit its column (Satori does not break a word)
  const shown = items.filter((i): i is number => !isHidden(i)).map(i => share.stations[i].name)
  const nameSize = wordFit(shown, pitch - 10, loc, layout.nameSize, 18)
  const nameH = Math.ceil(nameSize * 1.18 * nameLines)
  const [first, last] = [share.stations[0].name, share.stations[share.stations.length - 1].name]
  const titleFont = fitSize(share.title, CARD_ROW_WIDTH, 128, [64, 58, 52, 48, 44, 40], loc)
  const title = clipTitle(first, last, loc, CARD_ROW_WIDTH, titleFont)
  const lineGap = 8
  const lineLen = pitch - face - 2 * lineGap

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: INK, fontFamily: sans }}>
        {/* the path's teal, as a band along the top (the sage card's band is its era's colour along the reading edge) */}
        <div style={{ width: '100%', height: 12, background: TEAL, display: 'flex' }} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '30px 56px 28px' }}>
          <div style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <OgLine text={UI[loc].appTitle} size={30} color={GOLD} font={serif} weight={700} align={rtl ? 'end' : 'start'} />
            <div style={{ display: 'flex', padding: '6px 22px', borderRadius: 999, border: `2px solid ${TEAL}`, background: 'rgba(95,212,208,0.08)' }}>
              <OgLine text={stepsLabel(share.steps, loc)} size={28} color={PARCHMENT} font={sans} weight={500} align="center" />
            </div>
          </div>

          <div style={{ display: 'flex', height: 128, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
            <TitleLine text={title} size={titleFont} font={serif} color={PARCHMENT} />
          </div>

          {/* the row of faces, with the line between them drawn first so the faces sit on top of it */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', position: 'relative', width: CARD_ROW_WIDTH, height: face + 14 + nameH }}>
              {lineLen > 14 && items.slice(1).map((it, k) => {
                const next = share.stations[isHidden(it) ? -1 : it]
                // the line into this item is dotted when the way in is influence; the line into the "+k" disc stays dotted
                const dotted = isHidden(it) || isHidden(items[k]) || Boolean(next?.dotted)
                const start = rowOffset + (k + 0.5) * pitch + face / 2 + lineGap
                return (
                  <div key={k} style={{ display: 'flex', position: 'absolute', top: centreY - 12, ...(rtl ? { right: start } : { left: start }), width: lineLen, height: 24 }}>
                    <PathLine len={lineLen} thickness={4} dotted={dotted} toward={rtl ? 'left' : 'right'} />
                  </div>
                )
              })}
              <div style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', width: CARD_ROW_WIDTH, justifyContent: 'center' }}>
                {items.map((it, k) => {
                  if (isHidden(it)) {
                    return (
                      <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: pitch }}>
                        <MoreDisc size={face} k={it.hidden} font={serif} />
                        <div style={{ display: 'flex', width: pitch - 10, marginTop: 14, justifyContent: 'center' }}>
                          <OgLine text={hiddenLabel(it.hidden, loc)} size={nameSize} color={MUTED} font={sans} weight={500} align="center" />
                        </div>
                      </div>
                    )
                  }
                  const st = share.stations[it]
                  return (
                    <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: pitch }}>
                      <FaceDisc size={face} ring={ring} color={st.color} src={faces.get(it)?.src ?? null} medallion={medallion} photo={credits.mixed && faces.get(it)?.kind === 'photo'} rtl={rtl} />
                      <div style={{ display: 'flex', width: pitch - 10, marginTop: 14, justifyContent: 'center' }}>
                        <OgLine text={clipToLines(st.name, nameSize, pitch - 10, loc, nameLines)} size={nameSize} color={PARCHMENT} font={serif} weight={700} align="center" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 22, color: MUTED, fontFamily: 'PT Sans' }}>{host}</div>
            <div style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 22 }}>
              {credits.lines.map((c, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                  {credits.mixed && c.kind === 'photo' && <PhotoMark size={22} />}
                  <OgLine text={c.text} size={20} color={MUTED} font={sans} weight={500} align={rtl ? 'end' : 'start'} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...CARD_SIZE, fonts, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  )
}
