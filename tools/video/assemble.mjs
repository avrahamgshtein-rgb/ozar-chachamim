// Joins the pieces of the walkthrough into one mp4: opening clips, the recorded
// walkthrough, closing clips, with cross-fades, and optionally a narration
// track and background music.
//
//   node tools/video/assemble.mjs --main intro-he.mp4 \
//     --pre 1-manuscript.mp4,3-network.mp4 --post 4-glow.mp4 \
//     [--voice voice-he.mp3] [--music music.mp3] --out final-he.mp4
//
// Every clip is scaled and cropped to 1920x1080 at 30 fps. The fade from the
// opening clips into the walkthrough goes through black; the others are plain
// cross-fades. The narration starts at the first frame of the walkthrough, so a
// voice file recorded against intro-<lang>.srt lines up without extra offsets.
// Needs ffmpeg with libx264 (set FFMPEG to its path if it is not on PATH).

import { spawnSync } from 'node:child_process'

const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FADE = +(process.env.FADE || 0.8)

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
)
const list = s => (s ? s.split(',').map(x => x.trim()).filter(Boolean) : [])
const pre = list(args.pre)
const post = list(args.post)
if (!args.main || !args.out) {
  console.error('usage: assemble.mjs --main <walkthrough.mp4> --out <final.mp4> [--pre a.mp4,b.mp4] [--post c.mp4] [--voice v.mp3] [--music m.mp3]')
  process.exit(2)
}

function seconds(file) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-i', file], { encoding: 'utf8' })
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(r.stderr || '')
  if (!m) throw new Error(`cannot read the duration of ${file}`)
  return +m[1] * 3600 + +m[2] * 60 + +m[3]
}

const clips = [...pre.map(f => ({ f, role: 'pre' })), { f: args.main, role: 'main' }, ...post.map(f => ({ f, role: 'post' }))]
clips.forEach(c => { c.d = seconds(c.f) })

const inputs = clips.flatMap(c => ['-i', c.f])
const filters = clips.map((c, i) =>
  `[${i}:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p,setsar=1,settb=AVTB[v${i}]`)

// chain the cross-fades; `len` is the length of the video built so far
let label = 'v0'
let len = clips[0].d
let mainStart = 0
for (let i = 1; i < clips.length; i++) {
  const transition = clips[i].role === 'main' ? 'fadeblack' : 'fade'
  const out = `x${i}`
  filters.push(`[${label}][v${i}]xfade=transition=${transition}:duration=${FADE}:offset=${(len - FADE).toFixed(3)}[${out}]`)
  if (clips[i].role === 'main') mainStart = len - FADE + (transition === 'fadeblack' ? FADE / 2 : 0)
  len = len + clips[i].d - FADE
  label = out
}
if (clips.length === 1) filters.push('[v0]null[x0]'), (label = 'x0')

const ff = ['-y', '-hide_banner', '-loglevel', 'error', ...inputs]
let map = ['-map', `[${label}]`]
let next = clips.length
if (args.voice || args.music) {
  const audio = []
  if (args.voice) {
    ff.push('-i', args.voice)
    const ms = Math.round(mainStart * 1000)
    audio.push(`[${next}:a]adelay=${ms}|${ms},volume=1.0[voice]`)
    next++
  }
  if (args.music) {
    ff.push('-stream_loop', '-1', '-i', args.music)
    audio.push(`[${next}:a]volume=${args.voice ? 0.22 : 0.6},afade=t=in:d=2,afade=t=out:st=${Math.max(0, len - 3).toFixed(2)}:d=3[music]`)
    next++
  }
  const mix = args.voice && args.music
    ? '[voice][music]amix=inputs=2:duration=longest:normalize=0[a]'
    : args.voice ? '[voice]anull[a]' : '[music]anull[a]'
  filters.push(...audio, mix)
  map = [...map, '-map', '[a]']
}

const r = spawnSync(FFMPEG, [
  ...ff, '-filter_complex', filters.join(';'), ...map,
  '-t', len.toFixed(3), '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', args.out,
], { stdio: 'inherit' })
if (r.status !== 0) process.exit(r.status ?? 1)
console.log(JSON.stringify({ out: args.out, seconds: +len.toFixed(1), walkthroughStartsAt: +mainStart.toFixed(1) }))
