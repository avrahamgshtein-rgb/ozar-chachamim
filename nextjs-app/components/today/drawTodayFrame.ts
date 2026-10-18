// One frame of the Today status video, drawn on a 2D canvas in the 1080×1920 card's own units. Pure canvas code, with no
// React and no page: components/today/TodayVideo.tsx loads the fonts and pictures, computes the layout once
// (lib/todayVideo.ts::videoLayout) and calls this for every frame, so a plain page can draw the same frames to look at them.
import {
  PORTRAIT_RING, VIDEO, cardZoom, phase, portraitScale, videoCues,
  type TodayCard, type VideoLayout,
} from '@/lib/todayVideo'

export const C = { ink: '#0b0907', parchment: '#f3ead8', gold: '#c9973a', goldSoft: '#e2c27d', muted: '#a89a82' }

export type VideoFonts = { serif: string; sans: string }

/** What a frame is drawn from: the page's two font stacks, the medallion, and the portrait when it loaded. */
export interface VideoAssets {
  fonts: VideoFonts
  medallion: CanvasImageSource
  portrait?: CanvasImageSource | null
}

/** A stable number in [0, 1) for particle `i`. */
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** `#rrggbb` or `#rgb` as an `rgba()` with this alpha; anything else falls back to the gold. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  const h = m ? (m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]) : 'c9973a'
  const n = parseInt(h, 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`
}

/** A rounded square from its top centre, clockwise (so a dash of the stroke draws the ring from the top), and its length. */
function roundedSquare(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, r: number): number {
  ctx.beginPath()
  ctx.moveTo(x + s / 2, y)
  ctx.lineTo(x + s - r, y)
  ctx.arc(x + s - r, y + r, r, -Math.PI / 2, 0)
  ctx.lineTo(x + s, y + s - r)
  ctx.arc(x + s - r, y + s - r, r, 0, Math.PI / 2)
  ctx.lineTo(x + r, y + s)
  ctx.arc(x + r, y + s - r, r, Math.PI / 2, Math.PI)
  ctx.lineTo(x, y + r)
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5)
  ctx.closePath()
  return 4 * (s - 2 * r) + 2 * Math.PI * r
}

/** The soft glow in the era's colour behind the portrait, as it comes in. */
function drawPortraitGlow(ctx: CanvasRenderingContext2D, t: number, card: TodayCard, p: NonNullable<VideoLayout['portrait']>, start: number) {
  const k = phase(t, start, 0.9)
  if (k <= 0) return
  const cx = p.x + p.size / 2, cy = p.y + p.size / 2
  const glow = ctx.createRadialGradient(cx, cy, p.size * 0.3, cx, cy, p.size * 0.95)
  glow.addColorStop(0, withAlpha(card.accent, 0.42 * k * (0.9 + 0.1 * Math.sin(t * 1.4))))
  glow.addColorStop(1, withAlpha(card.accent, 0))
  ctx.fillStyle = glow
  ctx.fillRect(cx - p.size, cy - p.size, p.size * 2, p.size * 2)
}

/**
 * The portrait: it fades in growing from 0.9 to 1, the ring in the era's colour draws around it from the top, and a very
 * slow push-in (at most 4%) runs to the end. The picture is drawn inside the ring at its own size, never above the file's
 * 384 px (`PORTRAIT_VIDEO_MAX` and `PORTRAIT_PUSH` keep it under, with the card's drift).
 */
function drawPortrait(
  ctx: CanvasRenderingContext2D, t: number, card: TodayCard, img: CanvasImageSource,
  p: NonNullable<VideoLayout['portrait']>, cues: ReturnType<typeof videoCues>,
) {
  const k = phase(t, cues.portrait, 0.9)
  if (k <= 0) return
  const cx = p.x + p.size / 2, cy = p.y + p.size / 2
  const s = portraitScale(t, cues)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  ctx.translate(-cx, -cy)

  // the picture, inside the ring
  const inner = p.size - 2 * PORTRAIT_RING
  ctx.save()
  ctx.globalAlpha = k
  roundedSquare(ctx, p.x + PORTRAIT_RING, p.y + PORTRAIT_RING, inner, p.radius - PORTRAIT_RING)
  ctx.clip()
  ctx.drawImage(img, p.x + PORTRAIT_RING, p.y + PORTRAIT_RING, inner, inner)
  ctx.restore()

  // the ring: a faint full track, and the bright arc drawing itself round from the top
  const mid = PORTRAIT_RING / 2
  const length = roundedSquare(ctx, p.x + mid, p.y + mid, p.size - PORTRAIT_RING, p.radius - mid)
  ctx.lineWidth = PORTRAIT_RING
  ctx.strokeStyle = withAlpha(card.accent, 0.22 * k)
  ctx.stroke()
  const ring = phase(t, cues.ring, 0.8)
  if (ring > 0) {
    ctx.strokeStyle = card.accent
    ctx.globalAlpha = k
    if (ring < 1) ctx.setLineDash([length * ring, length])
    ctx.stroke()
  }
  ctx.restore()
}

/** One frame at time `t` (seconds), drawn in the 1080×1920 card's own units. */
export function drawTodayFrame(ctx: CanvasRenderingContext2D, t: number, card: TodayCard, a: VideoAssets, L: VideoLayout) {
  const W = VIDEO.width, H = VIDEO.height, cx = W / 2
  const { serif, sans } = a.fonts
  const cues = videoCues(Boolean(L.portrait))
  ctx.save()
  ctx.fillStyle = C.ink
  ctx.fillRect(0, 0, W, H)
  // a slow drift toward the viewer over the whole video
  const zoom = cardZoom(t)
  ctx.translate(cx, H / 2)
  ctx.scale(zoom, zoom)
  ctx.translate(-cx, -H / 2)

  // the glow behind the medallion
  const m = phase(t, 0.1, 1.4)
  const glow = ctx.createRadialGradient(cx, L.glow.cy, 0, cx, L.glow.cy, L.glow.r)
  glow.addColorStop(0, `rgba(201,151,58,${0.22 * m})`)
  glow.addColorStop(1, 'rgba(201,151,58,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, 1000)

  // gold motes rising
  for (let i = 0; i < 46; i++) {
    const speed = 30 + 45 * rnd(i, 2)
    const y = (((rnd(i, 1) * H - speed * t) % H) + H) % H
    const x = rnd(i, 3) * W + Math.sin(t * 0.7 + i) * 12
    ctx.globalAlpha = (0.12 + 0.33 * rnd(i, 4)) * (0.6 + 0.4 * Math.sin(t * 2 + i * 1.7)) * phase(t, 0, 1.5)
    ctx.fillStyle = C.goldSoft
    ctx.beginPath()
    ctx.arc(x, y, 2 + 3 * rnd(i, 5), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // the medallion
  const size = L.medallion.size * (0.86 + 0.14 * m) * (1 + 0.012 * Math.sin(t * 1.6))
  ctx.globalAlpha = m
  ctx.drawImage(a.medallion, cx - size / 2, L.medallion.cy - size / 2, size, size)
  ctx.globalAlpha = 1

  // the portrait's glow sits behind the heading and the date, which are drawn over it
  const portrait = L.portrait && a.portrait ? { box: L.portrait, img: a.portrait } : null
  if (portrait) drawPortraitGlow(ctx, t, card, portrait.box, cues.portrait)

  const text = (s: string, y: number, font: string, color: string, k: number, dir: 'rtl' | 'ltr' = card.dir) => {
    if (k <= 0 || !s) return
    ctx.save()
    ctx.globalAlpha = k
    ctx.font = font
    ctx.fillStyle = color
    ctx.direction = dir
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(s, cx, y + (1 - k) * 26)
    ctx.restore()
  }
  text(card.heading, L.headingY, `700 46px ${serif}`, C.gold, phase(t, 0.7, 0.8))
  text(card.date, L.dateY, `700 58px ${serif}`, C.parchment, phase(t, 1.0, 0.8))

  if (portrait) {
    drawPortrait(ctx, t, card, portrait.img, portrait.box, cues)
    text(card.portrait?.caption ?? '', portrait.box.captionY, `500 28px ${sans}`, C.muted, phase(t, cues.caption, 0.6))
  }

  // the middle: the kind of day, the name, era and years, one line about him (positions from the layout)
  const nSize = L.nameSize
  const pill = phase(t, cues.pill, 0.6)
  if (pill > 0) {
    ctx.save()
    ctx.font = `500 40px ${sans}`
    ctx.direction = card.dir
    const pw = ctx.measureText(card.kind).width + 64
    ctx.globalAlpha = pill
    ctx.fillStyle = 'rgba(201,151,58,0.16)'
    ctx.strokeStyle = 'rgba(201,151,58,0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(cx - pw / 2, L.pill.y, pw, L.pill.h, 35)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    text(card.kind, L.pill.y + 49, `500 40px ${sans}`, C.goldSoft, pill)
  }

  const nk = phase(t, cues.name, 0.9)
  L.nameLines.forEach(l => {
    ctx.save()
    ctx.translate(cx, l.y)
    ctx.scale(0.95 + 0.05 * nk, 0.95 + 0.05 * nk)
    ctx.translate(-cx, -l.y)
    text(l.text, l.y, `700 ${nSize}px ${serif}`, C.parchment, nk)
    ctx.restore()
  })
  if (L.subY !== null) text(card.sub, L.subY, `500 40px ${sans}`, C.muted, phase(t, cues.sub, 0.7))
  L.coreLines.forEach((l, i) => text(l.text, l.y, `500 40px ${sans}`, C.parchment, phase(t, cues.line + i * cues.lineStep, 0.7)))

  // the way to the page
  text(card.more, L.footer.moreY, `500 34px ${sans}`, C.goldSoft, phase(t, cues.more, 0.9))
  text(card.host, L.footer.hostY, `400 32px ${sans}`, C.muted, phase(t, cues.host, 0.9), 'ltr')
  text(card.appTitle, L.footer.appY, `700 30px ${serif}`, C.gold, phase(t, cues.app, 0.9))
  ctx.restore()

  // the era's colour along the top and bottom, opening from the middle (outside the zoom)
  const bar = phase(t, 0, 0.9) * W
  ctx.fillStyle = card.accent
  ctx.fillRect(cx - bar / 2, 0, bar, 18)
  ctx.fillRect(cx - bar / 2, H - 18, bar, 18)
}
