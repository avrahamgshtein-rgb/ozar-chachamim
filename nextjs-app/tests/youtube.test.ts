/**
 * YouTube videos: public/data-youtube.json is keyed by sage id, and ids are exactly what drifts
 * between data sets (see CLAUDE.md). Each entry therefore carries the roster label it was made for,
 * and these tests fail when an id now belongs to a different sage, so the file is regenerated
 * (scripts/build_youtube_links.py) instead of showing one sage's video on another's page.
 * Imports the real production modules.
 */
import assert from 'node:assert/strict'
import graph from '../public/data.json'
import { INTRO_VIDEO, durationLabel, embedUrl, getYoutubeEntry, isVideoId, sageVideo, watchUrl, youtubeEntries } from '../lib/youtube'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ok  ${name}`)
    passed++
  } catch (e) {
    console.log(`  FAIL ${name}`)
    console.log(`       ${(e as Error).message}`)
    failed++
  }
}

const labels = new Map((graph.nodes as Array<{ id: string; label: string }>).map(n => [n.id, n.label]))
const LANGS = ['he', 'en', 'ru'] as const
const hasHebrew = (s: string) => /[֐-׿]/.test(s)
const hasCyrillic = (s: string) => /[Ѐ-ӿ]/.test(s)

console.log('\ndata-youtube.json')

test('the file is not empty or truncated', () => {
  assert.ok(youtubeEntries().length >= 250, `only ${youtubeEntries().length} sages have a video`)
})

test('every id is a sage on the roster, and still carries the label it was made for', () => {
  const drifted = youtubeEntries()
    .filter(([id, e]) => labels.get(id) !== e.label)
    .map(([id, e]) => `${id}: file says "${e.label}", roster says "${labels.get(id)}"`)
  assert.deepEqual(drifted, [], 'regenerate with scripts/build_youtube_links.py')
})

test('every video has a well-formed id, a title and a length', () => {
  for (const [id, e] of youtubeEntries()) {
    let any = false
    for (const lang of LANGS) {
      const v = e[lang]
      if (!v) continue
      any = true
      assert.ok(isVideoId(v.id), `${id}/${lang}: bad video id "${v.id}"`)
      assert.ok(v.title.trim().length > 3, `${id}/${lang}: empty title`)
      assert.ok(v.seconds > 30 && v.seconds < 3600, `${id}/${lang}: odd length ${v.seconds}s`)
    }
    assert.ok(any, `${id} has an entry but no video`)
  }
})

test('no video belongs to two sages, or to two languages', () => {
  const seen = new Map<string, string>()
  for (const [id, e] of youtubeEntries()) {
    for (const lang of LANGS) {
      const v = e[lang]
      if (!v) continue
      assert.ok(!seen.has(v.id), `${v.id} is used by both ${seen.get(v.id)} and ${id}/${lang}`)
      seen.set(v.id, `${id}/${lang}`)
    }
  }
})

test('a video sits under the language its title is written in', () => {
  for (const [id, e] of youtubeEntries()) {
    if (e.en) assert.ok(!hasHebrew(e.en.title) && !hasCyrillic(e.en.title), `${id}/en: "${e.en.title}"`)
    if (e.ru) assert.ok(hasCyrillic(e.ru.title), `${id}/ru: "${e.ru.title}"`)
    if (e.he) assert.ok(hasHebrew(e.he.title), `${id}/he: "${e.he.title}"`)
  }
})

console.log('\nlookup and urls')

test('a page only ever gets the video of its own language', () => {
  // The Maharal (72) has an English and a Russian video, none in Hebrew; Rabbi Goren (491) has all three.
  assert.ok(sageVideo('72', 'en'), 'the Maharal (72) should have an English video')
  assert.ok(sageVideo('72', 'ru'), 'the Maharal (72) should have a Russian video')
  assert.equal(sageVideo('72', 'he'), undefined)
  assert.notEqual(sageVideo('72', 'en')?.id, sageVideo('72', 'ru')?.id)
  assert.ok(sageVideo('491', 'he') && sageVideo('491', 'en') && sageVideo('491', 'ru'), 'Rabbi Goren (491) should have all three')
  assert.equal(sageVideo('does-not-exist', 'en'), undefined)
  assert.equal(getYoutubeEntry('72')?.label, labels.get('72'))
})

test('the player is the cookieless embed, and the watch link is the plain one', () => {
  assert.equal(watchUrl('abcdefghijk'), 'https://www.youtube.com/watch?v=abcdefghijk')
  assert.equal(embedUrl('abcdefghijk', 'he'), 'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1&rel=0&hl=he&cc_lang_pref=he')
  assert.equal(durationLabel(392), '6:32')
  assert.equal(durationLabel(65), '1:05')
  assert.equal(durationLabel(0), '')
})

test('an introduction video, where one is set, is a well-formed video', () => {
  for (const lang of LANGS) {
    const v = INTRO_VIDEO[lang]
    if (v) {
      assert.ok(isVideoId(v.id), `${lang}: bad id "${v.id}"`)
      assert.ok(v.title.length > 3, `${lang}: empty title`)
    }
  }
})

console.log(`\n${'='.repeat(50)}\nTests: ${passed} passed, ${failed} failed\n${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
