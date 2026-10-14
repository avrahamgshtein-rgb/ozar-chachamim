'use client'

// The Today page's video for a WhatsApp status or a story, made in the browser: the card of
// lib/todayVideo.ts drawn frame by frame on a canvas, encoded to H.264 with WebCodecs and wrapped in an
// MP4 (mp4-muxer), so the phone gets a file WhatsApp takes and the server does nothing. Where the browser
// has no encoder, the canvas is recorded in real time instead (MediaRecorder); where it has neither, the
// button is not shown. Making the file takes a few seconds, more than a share sheet waits for a tap, so
// the video is first made and shown, then shared or saved with a second tap.
import { useEffect, useState } from 'react'
import type { Locale } from '@/lib/types'
import { track } from '@/lib/analytics'
import { ENCODER_CANDIDATES, VIDEO, nameSize, phase, wrapWords, type TodayCard } from '@/lib/todayVideo'

const S = {
  make: { he: 'סרטון לסטטוס', en: 'Video for a status', ru: 'Видео для статуса' },
  working: { he: 'מכין סרטון…', en: 'Making the video…', ru: 'Готовим видео…' },
  share: { he: 'שיתוף הסרטון', en: 'Share the video', ru: 'Поделиться видео' },
  save: { he: 'שמירה', en: 'Save', ru: 'Сохранить' },
  saved: { he: 'הסרטון נשמר', en: 'Video saved', ru: 'Видео сохранено' },
  failed: { he: 'לא הצלחנו להכין סרטון בדפדפן הזה; אפשר לשתף את התמונה.', en: 'This browser could not make the video; the image can be shared instead.', ru: 'В этом браузере не удалось сделать видео; можно поделиться картинкой.' },
} satisfies Record<string, Record<Locale, string>>

const C = { ink: '#0b0907', parchment: '#f3ead8', gold: '#c9973a', goldSoft: '#e2c27d', muted: '#a89a82' }

type Fonts = { serif: string; sans: string }

function cssFont(variable: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  return v || fallback
}

async function loadAssets(): Promise<{ fonts: Fonts; medallion: HTMLImageElement }> {
  const fonts = { serif: cssFont('--font-frank-ruhl', "'Frank Ruhl Libre', Georgia, serif"), sans: cssFont('--font-heebo', "'Heebo', sans-serif") }
  await Promise.all([
    document.fonts.load(`700 80px ${fonts.serif}`, 'אבג Abc'),
    document.fonts.load(`500 40px ${fonts.sans}`, 'אבג Abc'),
  ]).catch(() => {})
  const medallion = new Image()
  medallion.src = '/images/temple-medallion.png'
  await medallion.decode()
  return { fonts, medallion }
}

/** A stable number in [0, 1) for particle `i`. */
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** One frame at time `t` (seconds), drawn in the 1080×1920 card's own units. */
function drawFrame(ctx: CanvasRenderingContext2D, t: number, card: TodayCard, a: { fonts: Fonts; medallion: HTMLImageElement }) {
  const W = VIDEO.width, H = VIDEO.height, cx = W / 2
  const { serif, sans } = a.fonts
  ctx.save()
  ctx.fillStyle = C.ink
  ctx.fillRect(0, 0, W, H)
  // a slow drift toward the viewer over the whole video
  const zoom = 1 + 0.025 * (t / VIDEO.seconds)
  ctx.translate(cx, H / 2)
  ctx.scale(zoom, zoom)
  ctx.translate(-cx, -H / 2)

  // the glow behind the medallion
  const m = phase(t, 0.1, 1.4)
  const glow = ctx.createRadialGradient(cx, 400, 0, cx, 400, 520)
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
  const size = 300 * (0.86 + 0.14 * m) * (1 + 0.012 * Math.sin(t * 1.6))
  ctx.globalAlpha = m
  ctx.drawImage(a.medallion, cx - size / 2, 400 - size / 2, size, size)
  ctx.globalAlpha = 1

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
  text(card.heading, 640, `700 46px ${serif}`, C.gold, phase(t, 0.7, 0.8))
  text(card.date, 728, `700 58px ${serif}`, C.parchment, phase(t, 1.0, 0.8))

  // the middle: the kind of day, the name, era and years, one line about him, centred between y 860 and 1580
  const nSize = nameSize(card.name)
  ctx.font = `700 ${nSize}px ${serif}`
  const nameLines = wrapWords(card.name, 940, s => ctx.measureText(s).width, 3)
  ctx.font = `500 40px ${sans}`
  const lineLines = card.line ? wrapWords(card.line, 900, s => ctx.measureText(s).width, 5) : []
  const nameH = nameLines.length * nSize * 1.12
  const total = 70 + 44 + nameH + (card.sub ? 30 + 44 : 0) + (lineLines.length ? 46 + lineLines.length * 58 : 0)
  let y = Math.max(860, 860 + (720 - total) / 2)

  const pill = phase(t, 2.0, 0.6)
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
    ctx.roundRect(cx - pw / 2, y, pw, 70, 35)
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    text(card.kind, y + 49, `500 40px ${sans}`, C.goldSoft, pill)
  }
  y += 70 + 44

  const nk = phase(t, 2.5, 0.9)
  nameLines.forEach((l, i) => {
    y += nSize
    ctx.save()
    ctx.translate(cx, y)
    ctx.scale(0.95 + 0.05 * nk, 0.95 + 0.05 * nk)
    ctx.translate(-cx, -y)
    text(l, y, `700 ${nSize}px ${serif}`, C.parchment, nk)
    ctx.restore()
    y += nSize * 0.12
  })
  if (card.sub) { y += 30 + 40; text(card.sub, y, `500 40px ${sans}`, C.muted, phase(t, 3.3, 0.7)); y += 4 }
  if (lineLines.length) {
    y += 46
    lineLines.forEach((l, i) => { y += 52; text(l, y, `500 40px ${sans}`, C.parchment, phase(t, 4.3 + i * 0.55, 0.7)); y += 6 })
  }

  // the way to the page
  text(card.more, 1690, `500 34px ${sans}`, C.goldSoft, phase(t, 8.6, 0.9))
  text(card.host, 1745, `400 32px ${sans}`, C.muted, phase(t, 8.8, 0.9), 'ltr')
  text(card.appTitle, 1800, `700 30px ${serif}`, C.gold, phase(t, 9.0, 0.9))
  ctx.restore()

  // the era's colour along the top and bottom, opening from the middle (outside the zoom)
  const bar = phase(t, 0, 0.9) * W
  ctx.fillStyle = card.accent
  ctx.fillRect(cx - bar / 2, 0, bar, 18)
  ctx.fillRect(cx - bar / 2, H - 18, bar, 18)
}

/** The video as a file: MP4 through WebCodecs where it can, else a real-time recording. */
async function renderTodayVideo(card: TodayCard, onProgress: (p: number) => void): Promise<File> {
  const assets = await loadAssets()
  const frames = VIDEO.fps * VIDEO.seconds

  if ('VideoEncoder' in window) {
    let pick: (typeof ENCODER_CANDIDATES)[number] | null = null
    for (const c of ENCODER_CANDIDATES) {
      const ok = await VideoEncoder.isConfigSupported({ codec: c.codec, width: c.width, height: c.height, bitrate: 5_000_000, framerate: VIDEO.fps }).catch(() => null)
      if (ok?.supported) { pick = c; break }
    }
    if (pick) {
      const { Muxer, ArrayBufferTarget } = await import('mp4-muxer')
      const canvas = document.createElement('canvas')
      canvas.width = pick.width
      canvas.height = pick.height
      const ctx = canvas.getContext('2d')!
      const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: pick.width, height: pick.height }, fastStart: 'in-memory' })
      let failure: unknown = null
      const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { failure = e } })
      encoder.configure({ codec: pick.codec, width: pick.width, height: pick.height, bitrate: 5_000_000, framerate: VIDEO.fps })
      const scale = pick.width / VIDEO.width
      for (let i = 0; i < frames; i++) {
        if (failure) throw failure
        ctx.setTransform(scale, 0, 0, scale, 0, 0)
        drawFrame(ctx, i / VIDEO.fps, card, assets)
        const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / VIDEO.fps), duration: Math.round(1e6 / VIDEO.fps) })
        encoder.encode(frame, { keyFrame: i % (VIDEO.fps * 2) === 0 })
        frame.close()
        while (encoder.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 4))
        if (i % 10 === 0) { onProgress(i / frames); await new Promise(r => setTimeout(r, 0)) }
      }
      await encoder.flush()
      encoder.close()
      if (failure) throw failure
      muxer.finalize()
      onProgress(1)
      return new File([muxer.target.buffer], 'ozar-chachamim-today.mp4', { type: 'video/mp4' })
    }
  }

  // no encoder: record the canvas while it plays
  const type = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t))
  if (!type) throw new Error('no video format')
  const canvas = document.createElement('canvas')
  canvas.width = 720
  canvas.height = 1280
  const ctx = canvas.getContext('2d')!
  const rec = new MediaRecorder(canvas.captureStream(VIDEO.fps), { mimeType: type, videoBitsPerSecond: 4_000_000 })
  const chunks: Blob[] = []
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
  const done = new Promise<void>(r => { rec.onstop = () => r() })
  rec.start(250)
  const t0 = performance.now()
  await new Promise<void>(resolve => {
    const step = () => {
      const t = (performance.now() - t0) / 1000
      ctx.setTransform(720 / VIDEO.width, 0, 0, 720 / VIDEO.width, 0, 0)
      drawFrame(ctx, Math.min(t, VIDEO.seconds), card, assets)
      onProgress(Math.min(1, t / VIDEO.seconds))
      if (t >= VIDEO.seconds) resolve()
      else requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })
  rec.stop()
  await done
  const mp4 = type.startsWith('video/mp4')
  return new File(chunks, `ozar-chachamim-today.${mp4 ? 'mp4' : 'webm'}`, { type: mp4 ? 'video/mp4' : 'video/webm' })
}

type State = { s: 'idle' } | { s: 'working'; p: number } | { s: 'ready'; url: string; file: File } | { s: 'error' }

export function TodayVideo({ locale, card, shareText, pageUrl }: { locale: Locale; card: TodayCard; shareText: string; pageUrl: string }) {
  const [can, setCan] = useState(false)
  const [state, setState] = useState<State>({ s: 'idle' })
  const [note, setNote] = useState('')
  useEffect(() => {
    setCan('VideoEncoder' in window || ('MediaRecorder' in window && typeof HTMLCanvasElement.prototype.captureStream === 'function'))
  }, [])
  useEffect(() => () => { if (state.s === 'ready') URL.revokeObjectURL(state.url) }, [state])
  if (!can) return null

  const make = async () => {
    setNote('')
    setState({ s: 'working', p: 0 })
    try {
      const file = await renderTodayVideo(card, p => setState({ s: 'working', p }))
      setState({ s: 'ready', url: URL.createObjectURL(file), file })
    } catch {
      setState({ s: 'error' })
    }
  }
  const save = (file: File, url: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setNote(S.saved[locale])
    track('today_share', { locale, method: 'video_download' })
  }
  const share = async (file: File, url: string) => {
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: `${shareText}\n${pageUrl}` })
        track('today_share', { locale, method: 'video' })
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') save(file, url)
      }
    } else save(file, url)
  }

  const btn = 'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm disabled:opacity-60'
  return (
    <div className="flex flex-wrap items-center gap-2">
      {state.s !== 'ready' && (
        <button type="button" onClick={make} disabled={state.s === 'working'} className={`${btn} border-gold-500/40 bg-gold-500/10 text-gold-200 hover:bg-gold-500/20`}>
          <span aria-hidden>🎬</span>
          {state.s === 'working' ? `${S.working[locale]} ${Math.round(state.p * 100)}%` : S.make[locale]}
        </button>
      )}
      {state.s === 'ready' && (
        <div className="flex items-center gap-3">
          <video src={state.url} className="h-40 rounded-lg border border-gold-500/30" autoPlay muted loop playsInline controls aria-label={S.make[locale]} />
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => share(state.file, state.url)} className={`${btn} border-gold-500 bg-gold-500 font-semibold text-ink-900 hover:bg-gold-400`}>
              <span aria-hidden>↗</span>{S.share[locale]}
            </button>
            <button type="button" onClick={() => save(state.file, state.url)} className={`${btn} border-ink-600/50 text-ink-200 hover:border-gold-500/40`}>
              <span aria-hidden>⬇</span>{S.save[locale]}
            </button>
          </div>
        </div>
      )}
      {state.s === 'error' && <span role="status" className="text-xs text-ink-400">{S.failed[locale]}</span>}
      {note && <span role="status" className="text-xs text-ink-400">{note}</span>}
    </div>
  )
}
