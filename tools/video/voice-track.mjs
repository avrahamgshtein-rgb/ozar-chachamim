// Builds the narration track from separately recorded takes.
//
//   node tools/video/voice-track.mjs --plan tools/video/narration-he.json \
//     --dir takes/ --out voice-he.wav
//
// The plan lists a start and an end for each line (seconds from the first frame
// of the walkthrough). A take is any audio file in --dir whose name starts with
// the segment id ("01.m4a", "02-final.wav"). Each take has leading and trailing
// silence trimmed and its loudness levelled; if it is longer than its window it
// is sped up slightly (at most MAX_SPEEDUP), otherwise it is only warned about.
// The result starts at the walkthrough's first frame, so pass it to
// assemble.mjs as --voice. Needs ffmpeg (set FFMPEG if it is not on PATH).

import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const MAX_SPEEDUP = +(process.env.MAX_SPEEDUP || 1.15)
const SILENCE = process.env.SILENCE_DB || '-45dB'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
)
if (!args.plan || !args.dir || !args.out) {
  console.error('usage: voice-track.mjs --plan <narration.json> --dir <takes folder> --out <voice.wav>')
  process.exit(2)
}

const plan = JSON.parse(readFileSync(args.plan, 'utf8')).segments
const files = readdirSync(args.dir)
const work = mkdtempSync(join(tmpdir(), 'voice-'))

function ff(argv) {
  const r = spawnSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...argv], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(r.stderr || 'ffmpeg failed')
}
function seconds(file) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-i', file], { encoding: 'utf8' })
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(r.stderr || '')
  if (!m) throw new Error(`cannot read the duration of ${file}`)
  return +m[1] * 3600 + +m[2] * 60 + +m[3]
}

const trim = `silenceremove=start_periods=1:start_threshold=${SILENCE}:start_silence=0.08`
const placed = []
const problems = []
try {
  for (const seg of plan) {
    const take = files.find(f => f.startsWith(seg.id) && /\.(wav|mp3|m4a|aac|ogg|opus|flac|webm|mp4|mov)$/i.test(f))
    if (!take) { problems.push(`${seg.id}: no take found in ${args.dir}`); continue }
    // two passes: ffmpeg 7.0 aborts when loudnorm follows the reverse/trim chain in one graph
    const trimmed = join(work, `${seg.id}-trim.wav`)
    const clean = join(work, `${seg.id}.wav`)
    ff(['-i', join(args.dir, take), '-vn', '-af', `highpass=f=80,${trim},areverse,${trim},areverse`, '-ar', '48000', '-ac', '2', trimmed])
    ff(['-i', trimmed, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '2', clean])
    let d = seconds(clean)
    const window = seg.end - seg.start
    let file = clean
    if (d > window) {
      const tempo = d / window
      if (tempo <= MAX_SPEEDUP) {
        file = join(work, `${seg.id}-fit.wav`)
        ff(['-i', clean, '-af', `atempo=${tempo.toFixed(4)}`, file])
        problems.push(`${seg.id}: ${d.toFixed(1)}s in a ${window.toFixed(1)}s window, sped up ${tempo.toFixed(2)}x`)
        d = window
      } else {
        problems.push(`${seg.id}: ${d.toFixed(1)}s in a ${window.toFixed(1)}s window (${tempo.toFixed(2)}x), too long to fit: re-record it shorter`)
      }
    }
    placed.push({ ...seg, file, d })
  }
  placed.sort((a, b) => a.start - b.start)
  placed.forEach((p, i) => {
    const next = placed[i + 1]
    if (next && p.start + p.d > next.start) problems.push(`${p.id} runs into ${next.id} by ${(p.start + p.d - next.start).toFixed(1)}s`)
  })
  if (!placed.length) throw new Error('no takes to place')

  const inputs = placed.flatMap(p => ['-i', p.file])
  const delays = placed.map((p, i) => {
    const ms = Math.round(p.start * 1000)
    return `[${i}:a]adelay=${ms}|${ms}[a${i}]`
  })
  const mix = `${placed.map((_, i) => `[a${i}]`).join('')}amix=inputs=${placed.length}:duration=longest:normalize=0[out]`
  ff([...inputs, '-filter_complex', [...delays, mix].join(';'), '-map', '[out]', '-ar', '48000', args.out])
  const end = Math.max(...placed.map(p => p.start + p.d))
  console.log(JSON.stringify({ out: args.out, segments: placed.length, of: plan.length, seconds: +end.toFixed(1), notes: problems }, null, 2))
  if (placed.length < plan.length) process.exitCode = 1
} finally {
  rmSync(work, { recursive: true, force: true })
}
