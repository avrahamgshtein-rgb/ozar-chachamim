'use client'

// The Today page's video for a WhatsApp status or a story, made in the browser: the card of
// lib/todayVideo.ts drawn frame by frame on a canvas, encoded to H.264 with WebCodecs and wrapped in an
// MP4 (mp4-muxer), so the phone gets a file WhatsApp takes and the server does nothing. Where the browser
// has no encoder, the canvas is recorded in real time instead (MediaRecorder); where it has neither, the
// button is not shown. Making the file takes a few seconds, more than a share sheet waits for a tap, so
// the video is first made and shown, then shared or saved with a second tap. The frame is drawn by drawTodayFrame.ts
// from the layout of lib/todayVideo.ts, computed once here; a card with a portrait loads its picture with the other
// assets and, if it cannot be loaded, is drawn as the card of a sage who has none.
import { useEffect, useState } from 'react'
import type { Locale } from '@/lib/types'
import { track } from '@/lib/analytics'
import { ENCODER_CANDIDATES, VIDEO, videoLayout, type TodayCard, type VideoLayout, type VideoMeasure } from '@/lib/todayVideo'
import { drawTodayFrame, type VideoAssets, type VideoFonts } from './drawTodayFrame'

const S = {
  make: { he: 'סרטון לסטטוס', en: 'Video for a status', ru: 'Видео для статуса' },
  working: { he: 'מכין סרטון…', en: 'Making the video…', ru: 'Готовим видео…' },
  share: { he: 'שיתוף הסרטון', en: 'Share the video', ru: 'Поделиться видео' },
  save: { he: 'שמירה', en: 'Save', ru: 'Сохранить' },
  saved: { he: 'הסרטון נשמר', en: 'Video saved', ru: 'Видео сохранено' },
  failed: { he: 'לא הצלחנו להכין סרטון בדפדפן הזה; אפשר לשתף את התמונה.', en: 'This browser could not make the video; the image can be shared instead.', ru: 'В этом браузере не удалось сделать видео; можно поделиться картинкой.' },
} satisfies Record<string, Record<Locale, string>>

function cssFont(variable: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  return v || fallback
}

async function loadAssets(card: TodayCard): Promise<VideoAssets> {
  const fonts = { serif: cssFont('--font-frank-ruhl', "'Frank Ruhl Libre', Georgia, serif"), sans: cssFont('--font-heebo', "'Heebo', sans-serif") }
  await Promise.all([
    document.fonts.load(`700 80px ${fonts.serif}`, 'אבג Abc'),
    document.fonts.load(`500 40px ${fonts.sans}`, 'אבג Abc'),
  ]).catch(() => {})
  const medallion = new Image()
  medallion.src = '/images/temple-medallion.png'
  await medallion.decode()
  // The sage's picture, when the page gave one (same origin, so the canvas stays clean). If it cannot be loaded the card is
  // drawn without it, exactly as it is for a sage who has none.
  let portrait: HTMLImageElement | null = null
  if (card.portrait) {
    try {
      const img = new Image()
      img.src = card.portrait.src
      await img.decode()
      portrait = img
    } catch { /* no picture: the card without one */ }
  }
  return { fonts, medallion, portrait }
}

/** The text measure the layout needs, on a canvas of its own with the page's fonts. */
function canvasMeasure(fonts: VideoFonts): VideoMeasure {
  const ctx = document.createElement('canvas').getContext('2d')!
  return (text, role, weight, px) => {
    ctx.font = `${weight} ${px}px ${role === 'serif' ? fonts.serif : fonts.sans}`
    return ctx.measureText(text).width
  }
}

/** The layout of the video: with the portrait when it loaded, else the card as it is without one. */
function layoutFor(card: TodayCard, assets: VideoAssets): VideoLayout {
  return videoLayout(assets.portrait ? card : { ...card, portrait: undefined }, canvasMeasure(assets.fonts))
}

/** The video as a file: MP4 through WebCodecs where it can, else a real-time recording. */
async function renderTodayVideo(card: TodayCard, onProgress: (p: number) => void): Promise<File> {
  const assets = await loadAssets(card)
  const layout = layoutFor(card, assets)
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
        drawTodayFrame(ctx, i / VIDEO.fps, card, assets, layout)
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
      drawTodayFrame(ctx, Math.min(t, VIDEO.seconds), card, assets, layout)
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
