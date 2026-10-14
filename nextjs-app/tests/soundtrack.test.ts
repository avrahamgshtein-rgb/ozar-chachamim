/**
 * The background music (lib/soundtrack.ts, played by components/layout/Soundtrack.tsx, turned on and
 * off by components/ui/SoundtrackToggle.tsx): silent until the visitor asks, quiet whenever
 * something else speaks or plays, and never in the way of a browser that wants a tap first.
 * The controller runs here against a fake <audio>, with real timers for the fades.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  MUSIC_POS_KEY, MUSIC_PREF_KEY, SOUNDTRACK, SoundtrackController, resumeAt, type AudioLike, type StoreLike,
} from '../lib/soundtrack'

let passed = 0
let failed = 0
let queue: Promise<void> = Promise.resolve()
let registered = 0
process.on('exit', () => {
  if (passed + failed !== registered) {
    console.log(`\nFAIL ${registered - passed - failed} test(s) never finished`)
    process.exitCode = 1
  }
})
function test(name: string, fn: () => void | Promise<void>) {
  registered++
  queue = queue.then(async () => {
    try {
      await fn()
      passed++
      console.log(`  ok  ${name}`)
    } catch (e) {
      failed++
      console.log(`  FAIL ${name}\n       ${(e as Error).message}`)
    }
  })
}

function section(name: string) {
  queue = queue.then(() => { console.log(`\n${name}`) })
}

class FakeAudio implements AudioLike {
  private v = 1
  currentTime = 0
  paused = true
  plays = 0
  pauses = 0
  /** what the next play() does */
  next: 'ok' | 'blocked' | 'broken' | 'pending' = 'ok'
  private pendingResolve: (() => void) | null = null
  constructor(private fixedVolume = false) {}
  get volume() { return this.v }
  set volume(x: number) {
    if (x < 0 || x > 1) throw new RangeError(`volume ${x}`)
    if (!this.fixedVolume) this.v = x
  }
  play(): Promise<void> {
    this.plays++
    if (this.next === 'blocked') return Promise.reject(new DOMException('needs a tap', 'NotAllowedError'))
    if (this.next === 'broken') return Promise.reject(new DOMException('no file', 'NotSupportedError'))
    if (this.next === 'pending') {
      return new Promise(resolve => { this.pendingResolve = () => { this.paused = false; resolve() } })
    }
    this.paused = false
    return Promise.resolve()
  }
  finishPending() { this.pendingResolve?.(); this.pendingResolve = null }
  pause() { this.pauses++; this.paused = true }
}

class MemStore implements StoreLike {
  data = new Map<string, string>()
  getItem(k: string) { return this.data.get(k) ?? null }
  setItem(k: string, v: string) { this.data.set(k, v) }
}

const timers = {
  later: (fn: () => void, _ms: number) => setTimeout(fn, 0),
  cancel: (h: unknown) => clearTimeout(h as NodeJS.Timeout),
}

function setup({ on = false, fixedVolume = false, session }: { on?: boolean; fixedVolume?: boolean; session?: MemStore } = {}) {
  const audio = new FakeAudio(fixedVolume)
  const prefs = new MemStore()
  if (on) prefs.setItem(MUSIC_PREF_KEY, '1')
  const sess = session ?? new MemStore()
  const toggles: boolean[] = []
  const c = new SoundtrackController(audio, { prefs, session: sess, ...timers, onToggle: on => toggles.push(on) })
  return { audio, prefs, session: sess, c, toggles }
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6

section('lib/soundtrack.ts')

test('a first visit is silent: nothing plays until the visitor presses 🎵', async () => {
  const { audio, c } = setup()
  await c.resume()
  await c.gesture()
  assert.equal(audio.plays, 0)
  assert.deepEqual(c.getState(), { on: false, playing: false, waiting: false, held: false })
})

test('pressing 🎵 plays inside the click itself (iOS allows sound only there), fades in, and is remembered', async () => {
  const { audio, prefs, c, toggles } = setup()
  const done = c.toggle()
  assert.equal(audio.plays, 1, 'play() must be called before the first await')
  await done
  assert.equal(c.getState().playing, true)
  assert.ok(near(audio.volume, SOUNDTRACK.volume), `volume ${audio.volume}`)
  assert.equal(prefs.getItem(MUSIC_PREF_KEY), '1')
  assert.deepEqual(toggles, [true])
})

test('pressing it again fades out, pauses, keeps the place for the next page, and is remembered', async () => {
  const { audio, prefs, session, c, toggles } = setup()
  await c.toggle()
  audio.currentTime = 42
  await c.toggle()
  assert.equal(audio.paused, true)
  assert.equal(c.getState().playing, false)
  assert.equal(prefs.getItem(MUSIC_PREF_KEY), '0')
  assert.equal(JSON.parse(session.getItem(MUSIC_POS_KEY)!).t, 42)
  assert.ok(near(audio.volume, SOUNDTRACK.volume), 'the volume is restored for the next start')
  assert.deepEqual(toggles, [true, false])
})

test('with the choice on, a new page plays at once where the browser allows it', async () => {
  const { audio, c } = setup({ on: true })
  await c.resume()
  assert.equal(audio.plays, 1)
  assert.equal(c.getState().playing, true)
})

test('where the browser wants a tap first, it waits, and the first tap anywhere starts it', async () => {
  const { audio, c } = setup({ on: true })
  audio.next = 'blocked'
  await c.resume()
  assert.deepEqual(c.getState(), { on: true, playing: false, waiting: true, held: false })
  assert.ok(near(audio.volume, SOUNDTRACK.volume), 'not left at 0')
  audio.next = 'ok'
  await c.gesture()
  assert.equal(c.getState().playing, true)
  assert.equal(c.getState().waiting, false)
  await c.gesture()
  assert.equal(audio.plays, 2, 'a later tap does nothing more')
})

test('a missing file or codec leaves the page silent and not waiting for a tap', async () => {
  const { audio, c } = setup({ on: true })
  audio.next = 'broken'
  await c.resume()
  assert.deepEqual(c.getState(), { on: true, playing: false, waiting: false, held: false })
})

test('read-aloud and videos hold the music; it returns when the last of them ends', async () => {
  const { audio, c } = setup()
  await c.toggle()
  await c.hold('speech')
  assert.equal(audio.paused, true)
  assert.deepEqual(c.getState(), { on: true, playing: false, waiting: false, held: true })
  await c.hold('media')
  await c.release('speech')
  assert.equal(audio.paused, true, 'still a video playing')
  await c.release('media')
  assert.equal(audio.paused, false)
  assert.equal(c.getState().playing, true)
  assert.ok(near(audio.volume, SOUNDTRACK.volume))
})

test('a hold with the music off changes nothing, and its release does not turn the music on', async () => {
  const { audio, c } = setup()
  await c.hold('youtube')
  await c.release('youtube')
  assert.equal(audio.plays, 0)
})

test('pressing 🎵 over a video plays the music anyway: the visitor decides', async () => {
  const { audio, c } = setup()
  await c.toggle()
  await c.hold('youtube')
  assert.equal(c.getState().playing, false)
  await c.toggle()
  assert.equal(c.getState().playing, true)
  assert.equal(audio.paused, false)
  assert.equal(c.getState().held, false)
})

test('a hidden tab stops the music at once (no fade: hidden tabs run timers once a second) and the page brings it back', async () => {
  const { audio, c } = setup()
  await c.toggle()
  const stopping = c.hold('hidden')
  assert.equal(audio.paused, true, 'paused synchronously')
  await stopping
  await c.release('hidden')
  assert.equal(audio.paused, false)
})

test('a hold that comes while play() is still pending leaves the music silent', async () => {
  const { audio, c } = setup()
  audio.next = 'pending'
  const starting = c.toggle()
  await c.hold('speech')
  audio.finishPending()
  await starting
  assert.equal(audio.paused, true)
  assert.equal(c.getState().playing, false)
  audio.next = 'ok'
  await c.release('speech')
  assert.equal(audio.paused, false)
})

test('turned off and on again during the fade-out, it keeps playing', async () => {
  const { audio, c } = setup()
  await c.toggle()
  const off = c.toggle()
  const on = c.toggle()
  await Promise.all([off, on])
  assert.equal(audio.paused, false)
  assert.equal(c.getState().playing, true)
  assert.ok(near(audio.volume, SOUNDTRACK.volume), `volume ${audio.volume}`)
})

test('on iOS (the volume cannot be set) it plays at the file\'s level and stops without a fade', async () => {
  const { audio, c } = setup({ fixedVolume: true })
  await c.toggle()
  assert.equal(audio.volume, 1)
  assert.equal(c.getState().playing, true)
  await c.toggle()
  assert.equal(audio.paused, true)
})

test('stopped by the system (headset, lock screen): the button shows silence and the next press plays', async () => {
  const { audio, c } = setup()
  await c.toggle()
  audio.pause()
  c.externalPause()
  assert.equal(c.getState().playing, false)
  await c.toggle()
  assert.equal(c.getState().playing, true)
  assert.equal(audio.plays, 2)
})

test('the next page of the visit continues the tune where it was', () => {
  const session = new MemStore()
  session.setItem(MUSIC_POS_KEY, JSON.stringify({ t: 73.5, at: Date.now() - 5000 }))
  const { audio } = setup({ on: true, session })
  assert.equal(audio.currentTime, 73.5)
})

test('resumeAt: only a recent, sane place is resumed', () => {
  const now = 1_000_000_000
  assert.equal(resumeAt(JSON.stringify({ t: 30, at: now - 1000 }), now), 30)
  assert.equal(resumeAt(JSON.stringify({ t: 30, at: now - 31 * 60 * 1000 }), now), 0, 'over half an hour ago')
  assert.equal(resumeAt(JSON.stringify({ t: 300, at: now }), now, 209.6), 0, 'beyond the end')
  assert.equal(resumeAt(JSON.stringify({ t: -1, at: now }), now), 0)
  assert.equal(resumeAt('{oops', now), 0)
  assert.equal(resumeAt(null, now), 0)
})

test('blocked storage (private mode) does not break it: the choice lasts the page', async () => {
  const broken: StoreLike = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
  const audio = new FakeAudio()
  const c = new SoundtrackController(audio, { prefs: broken, session: broken, ...timers })
  await c.toggle()
  assert.equal(c.getState().playing, true)
  await c.toggle()
  assert.equal(audio.paused, true)
})

section('the page')

const root = path.join(__dirname, '..')
const src = (p: string) => fs.readFileSync(path.join(root, p), 'utf8')

test('the track is in public/, an MP3, small enough for a phone, and the player does not fetch it before asked', () => {
  const file = path.join(root, 'public', SOUNDTRACK.src)
  assert.ok(fs.existsSync(file), `${SOUNDTRACK.src} is missing`)
  const buf = fs.readFileSync(file)
  assert.ok(buf.subarray(0, 3).toString() === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0), 'not an MP3')
  assert.ok(buf.length < 3.5 * 1024 * 1024, `${(buf.length / 1048576).toFixed(1)} MB: re-encode it smaller`)
  const player = src('components/layout/Soundtrack.tsx')
  assert.match(player, /preload="none"/)
  assert.doesNotMatch(player, /autoPlay|autoplay=/i, 'never autoplay')
  assert.match(player, /\bloop\b/)
})

test('the locale layout renders the player once; the 🎵 button is in every top bar and on the About page', () => {
  assert.match(src('app/[locale]/layout.tsx'), /<Soundtrack \/>/)
  for (const f of ['components/layout/Header.tsx', 'components/layout/SiteTopBar.tsx', 'app/[locale]/sage/[id]/page.tsx', 'components/about/AboutContent.tsx']) {
    assert.match(src(f), /<SoundtrackToggle/, f)
  }
  assert.equal((src('components/layout/Header.tsx').match(/<SoundtrackToggle/g) ?? []).length, 2, 'desktop header and the mobile menu')
})

test('a tap on the 🎵 button is not also taken as the page\'s first tap (which would start, then stop, the music)', () => {
  assert.match(src('components/ui/SoundtrackToggle.tsx'), /data-soundtrack-toggle/)
  assert.match(src('components/layout/Soundtrack.tsx'), /closest\?\.\('\[data-soundtrack-toggle\]'\)/)
})

test('read-aloud, the YouTube player and the Spotify player hold the music while they are on', () => {
  assert.match(src('components/sages/ListenResearch.tsx'), /holdSoundtrack\('speech'\)[\s\S]*releaseSoundtrack\('speech'\)/)
  assert.match(src('components/sages/YoutubeWatch.tsx'), /holdSoundtrack\('youtube'\)[\s\S]*releaseSoundtrack\('youtube'\)/)
  assert.match(src('components/sages/SpotifyListen.tsx'), /holdSoundtrack\('spotify'\)[\s\S]*releaseSoundtrack\('spotify'\)/)
  // any other <audio>/<video> with sound (the status video's preview) through the document
  assert.match(src('components/layout/Soundtrack.tsx'), /addEventListener\('play', onPlay, true\)/)
})

test('turning it on or off is counted, with no more than the language', () => {
  assert.match(src('lib/analytics.ts'), /\| 'music_toggle'/)
  assert.match(src('components/layout/Soundtrack.tsx'), /track\('music_toggle', \{ locale: [^,]+, state: on \? 'on' : 'off' \}\)/)
})

queue.then(() => {
  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed) process.exit(1)
})
