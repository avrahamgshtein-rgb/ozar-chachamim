// The status image of a path (1080 x 1920): the file the share sheet sends to a WhatsApp status or a story, and what
// "Image to share" on the path page and on the picker saves. "Six Steps", the title, the number of steps, then the
// stations down the image (a face, his name, his era and years) with the caption of every link between two of them
// ("Student of Rashi"), as the flight panel tells it, and at the foot the path's address and the site. A long path
// shows its first three stations, a "+k" disc and its last three. A file for the share sheet is not a link preview,
// so it has no size limit (the card next to it keeps under 300 KB). A pair with no path, an unknown sage or the same
// sage twice is a plain 404, as the page is.
import { ImageResponse } from 'next/og'
import type { ReactNode } from 'react'
import { isValidLocale, UI } from '@/lib/i18n'
import type { Locale } from '@/lib/types'
import { SITE_URL } from '@/lib/siteUrl'
import { OG, OgLine, ogAssets } from '@/lib/ogCard'
import { flightHref } from '@/lib/connectFlight'
import { SIX_STEPS, STORY, creditLines, facesOf, hiddenLabel, isHidden, pathShare, stepsLabel, storyLayout, type Shown } from '@/lib/pathShare'
import { FaceDisc, MoreDisc, PathLine, PhotoMark, TEAL, TitleLine, clipTitle, clipToLines, fitSize } from '@/lib/pathShareArt'

const { ink: INK, parchment: PARCHMENT, gold: GOLD, muted: MUTED } = OG

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string; from: string; to: string }> }) {
  const { locale, from, to } = await params
  if (!isValidLocale(locale)) return new Response('Not found', { status: 404 })
  const loc = locale as Locale
  const share = pathShare(loc, from, to)
  if (!share) return new Response('Not found', { status: 404 })

  const { fonts, serif, sans, medallion } = await ogAssets(loc)
  const rtl = loc === 'he'
  const { items, face, connector } = storyLayout(share.stations.length)
  const faces = await facesOf(share, items)
  const credits = creditLines(faces)
  const address = `${SITE_URL.replace(/^https?:\/\//, '')}${flightHref(loc, from, to)}`

  const WIDTH = 936 // the column of stations: the image's width less 72 px of margin on each side
  const textW = WIDTH - face - 60
  const rowDir = rtl ? 'row-reverse' : 'row'
  const side = rtl ? 'flex-end' : 'flex-start'
  const align = rtl ? 'end' : 'start'
  const titleFont = fitSize(share.title, 936, 150, [76, 68, 60, 54, 48, 44, 40, 36], loc)
  const title = clipTitle(share.stations[0].name, share.stations[share.stations.length - 1].name, loc, 936, titleFont)

  // the stations and what lies between them, top to bottom
  const rows: ReactNode[] = []
  items.forEach((it: Shown, k) => {
    const prev = k > 0 ? items[k - 1] : null
    if (prev !== null) {
      // between two stations: the line, dotted when the way in is influence, and the caption of the link
      const plain = isHidden(it) || isHidden(prev)
      const into = isHidden(it) ? null : share.stations[it]
      rows.push(
        <div key={`c${k}`} style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', width: WIDTH, height: plain ? STORY.plain : connector }}>
          <div style={{ display: 'flex', width: face, justifyContent: 'center' }}>
            <PathLine len={plain ? STORY.plain : connector} thickness={5} dotted={plain || Boolean(into?.dotted)} toward="down" />
          </div>
          {!plain && into?.caption && (
            <div style={{ display: 'flex', flex: 1, padding: '0 30px', alignItems: 'center', justifyContent: side }}>
              <OgLine text={clipToLines(into.caption, 30, textW, loc, 1)} size={30} color={TEAL} font={sans} weight={500} align={align} />
            </div>
          )}
        </div>,
      )
    }
    if (isHidden(it)) {
      rows.push(
        <div key={`h${k}`} style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', width: WIDTH, height: STORY.hiddenRow }}>
          <div style={{ display: 'flex', width: face, justifyContent: 'center' }}>
            <MoreDisc size={STORY.hiddenDisc} k={it.hidden} font={serif} />
          </div>
          <div style={{ display: 'flex', flex: 1, padding: '0 30px', justifyContent: side }}>
            <OgLine text={hiddenLabel(it.hidden, loc)} size={34} color={MUTED} font={sans} weight={500} align={align} />
          </div>
        </div>,
      )
      return
    }
    const st = share.stations[it]
    // as large as fits beside the face in at most two lines, with the era and years under it
    const nameSize = fitSize(st.name, textW, face - 60, [62, 56, 50, 46, 42, 38], loc)
    rows.push(
      <div key={`s${k}`} style={{ display: 'flex', flexDirection: rowDir, alignItems: 'center', width: WIDTH, height: face }}>
        <FaceDisc size={face} ring={face >= 160 ? 7 : 6} color={st.color} src={faces.get(it)?.src ?? null} medallion={medallion} photo={credits.mixed && faces.get(it)?.kind === 'photo'} rtl={rtl} />
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '0 30px', alignItems: side, justifyContent: 'center' }}>
          <OgLine text={clipToLines(st.name, nameSize, textW, loc, 2)} size={nameSize} color={PARCHMENT} font={serif} weight={700} align={align} />
          {(st.era || st.years) && (
            <div style={{ display: 'flex', marginTop: 6 }}>
              <OgLine text={[st.era, st.years].filter(Boolean).join('  ·  ')} size={30} color={MUTED} font={sans} weight={500} align={align} />
            </div>
          )}
        </div>
      </div>,
    )
  })

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: INK, fontFamily: sans,
        borderTop: `18px solid ${TEAL}`, borderBottom: `18px solid ${TEAL}`,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: STORY.top, padding: '44px 72px 0' }}>
          <OgLine text={`${SIX_STEPS[loc]}  ·  ${UI[loc].appTitle}`} size={38} color={GOLD} font={serif} weight={700} align="center" />
          <div style={{ display: 'flex', width: 936, height: 150, marginTop: 14, alignItems: 'center', justifyContent: 'center' }}>
            <TitleLine text={title} size={titleFont} font={serif} color={PARCHMENT} />
          </div>
          <div style={{ display: 'flex', marginTop: 12, padding: '4px 28px', borderRadius: 999, border: `2px solid ${TEAL}`, background: 'rgba(95,212,208,0.08)' }}>
            <OgLine text={stepsLabel(share.steps, loc)} size={38} color={PARCHMENT} font={sans} weight={500} align="center" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: WIDTH, height: STORY.zone }}>
          {rows}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: '100%', height: STORY.bottom, padding: '0 60px 34px' }}>
          {credits.lines.map((c, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              {credits.mixed && c.kind === 'photo' && <PhotoMark size={26} />}
              <OgLine text={c.text} size={26} color={MUTED} font={sans} weight={500} align="center" />
            </div>
          ))}
          <div style={{ display: 'flex', marginTop: 4, fontSize: 28, color: MUTED, fontFamily: 'PT Sans' }}>{address}</div>
          <div style={{ display: 'flex', marginTop: 8 }}>
            <OgLine text={UI[loc].appTitle} size={30} color={GOLD} font={serif} weight={700} align="center" />
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } },
  )
}
