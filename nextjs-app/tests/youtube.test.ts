/**
 * YouTube videos: public/data-youtube.json is keyed by sage id, and ids are exactly what drifts
 * between data sets (see CLAUDE.md). Each entry therefore carries the roster label it was made for,
 * and these tests fail when an id now belongs to a different sage, so the file is regenerated
 * (scripts/build_youtube_links.py) instead of showing one sage's video on another's page.
 * Imports the real production modules.
 */
import assert from 'node:assert/strict'
import graph from '../public/data.json'
import { INTRO_VIDEO, durationLabel, embedUrl, getYoutubeEntry, isVideoId, sageVideos, watchUrl, youtubeEntries } from '../lib/youtube'

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
      const list = e[lang]
      if (!list) continue
      assert.ok(Array.isArray(list) && list.length > 0, `${id}/${lang}: empty list`)
      any = true
      for (const v of list) {
        assert.ok(isVideoId(v.id), `${id}/${lang}: bad video id "${v.id}"`)
        assert.ok(v.title.trim().length > 3, `${id}/${lang}: empty title`)
        assert.ok(v.seconds > 30 && v.seconds < 3600, `${id}/${lang}: odd length ${v.seconds}s`)
      }
    }
    assert.ok(any, `${id} has an entry but no video`)
  }
})

test('no video belongs to two sages, or to two languages', () => {
  const seen = new Map<string, string>()
  for (const [id, e] of youtubeEntries()) {
    for (const lang of LANGS) {
      for (const v of e[lang] ?? []) {
        assert.ok(!seen.has(v.id), `${v.id} is used by both ${seen.get(v.id)} and ${id}/${lang}`)
        seen.set(v.id, `${id}/${lang}`)
      }
    }
  }
})

test('a video sits under the language its own title is written in', () => {
  // the snapshot holds each video's original title and language (YouTube Data API), so the two agree
  for (const [id, e] of youtubeEntries()) {
    for (const v of e.en ?? []) assert.ok(!hasHebrew(v.title) && !hasCyrillic(v.title), `${id}/en: "${v.title}"`)
    for (const v of e.ru ?? []) assert.ok(hasCyrillic(v.title), `${id}/ru: "${v.title}"`)
    for (const v of e.he ?? []) assert.ok(hasHebrew(v.title), `${id}/he: "${v.title}"`)
  }
})

test('the pairs the owner listened to are filed as he heard them', () => {
  // first Russian, second English: Rashi (13/14), R. Jacob Landau (452, rows 169/170), the Shach (83, 420/421)
  assert.deepEqual([sageVideos('594', 'ru')[0]?.id, sageVideos('594', 'en')[0]?.id], ['V_IWxYu1f9Y', 'q5x9P6uZGpE'])
  assert.deepEqual([sageVideos('452', 'ru')[0]?.id, sageVideos('452', 'en')[0]?.id], ['wEmwGlLhGjw', 'ycaGC9cXwLY'])
  assert.deepEqual([sageVideos('83', 'ru')[0]?.id, sageVideos('83', 'en')[0]?.id], ['OlCwbut_kfc', '_w9R_rFvReU'])
  // first English, second Russian: Rabbeinu Perachiah (288, rows 248/249) and the Meshech Chochmah (128, rows 600/601)
  assert.deepEqual([sageVideos('288', 'en')[0]?.id, sageVideos('288', 'ru')[0]?.id], ['NnujnyQUOOg', '-pmGp_mGqDw'])
  assert.deepEqual([sageVideos('128', 'en')[0]?.id, sageVideos('128', 'ru')[0]?.id], ['V8-UTxd-8bA', 'P3ez1FM8JmA'])
})

test('most sages have one video in English and one in Russian', () => {
  const both = youtubeEntries().filter(([, e]) => e.en?.length === 1 && e.ru?.length === 1).length
  assert.ok(both >= 300, `only ${both} sages have exactly one English and one Russian video`)
  assert.ok(youtubeEntries().filter(([, e]) => e.ru).length >= 330, 'a Russian page without a video for most sages')
})

console.log('\nlookup and urls')

test('a page only ever gets the video of its own language', () => {
  // The Maharal (72) has an English and a Russian video, none in Hebrew; Rabbi Goren (491) has all three.
  assert.equal(sageVideos('72', 'en').length, 1, 'the Maharal (72) has one English video')
  assert.equal(sageVideos('72', 'ru').length, 1, 'the Maharal (72) has one Russian video')
  assert.deepEqual(sageVideos('72', 'he'), [])
  assert.notEqual(sageVideos('72', 'en')[0]?.id, sageVideos('72', 'ru')[0]?.id)
  assert.ok(sageVideos('491', 'he').length && sageVideos('491', 'en').length && sageVideos('491', 'ru').length, 'Rabbi Goren (491) should have all three')
  assert.deepEqual(sageVideos('does-not-exist', 'en'), [])
  assert.equal(getYoutubeEntry('72')?.label, labels.get('72'))
})

test('every video of the playlist that names a roster sage is kept, a sage can have several in a language', () => {
  assert.equal(sageVideos('44', 'en').length, 3, 'the Ramban (44) has six uploads: three in each language')
  assert.equal(sageVideos('44', 'ru').length, 3)
})

test('the sages added from the owner’s Drive have their videos, and Theodos of Rome his two', () => {
  // 623 Abbahu, 624 Imma Shalom, 625 Berdugo, 626 Nathan Shapira, 627 Bokrat, 629 Miriam: one Russian, one English
  for (const id of ['623', '624', '625', '626', '627', '629']) {
    assert.equal(sageVideos(id, 'en').length, 1, `${id} (${labels.get(id)}) has no English video`)
    assert.equal(sageVideos(id, 'ru').length, 1, `${id} (${labels.get(id)}) has no Russian video`)
  }
  // Theodos of Rome (485): "Religious Authority and Imperial Policy in Ancient Rome", English and Russian
  assert.equal(sageVideos('485', 'en').length, 1)
  assert.equal(sageVideos('485', 'ru').length, 1)
})

test('a lesson on a weekly portion is not a sage’s video', () => {
  // parashat Ekev, two uploads (rows 79-80 of the playlist): the owner asked for them to stay out
  const used = new Set(youtubeEntries().flatMap(([, e]) => LANGS.flatMap(lang => (e[lang] ?? []).map(v => v.id))))
  assert.ok(!used.has('iYtU6ZBjyjw') && !used.has('Cd4lauoPrw0'), 'an Ekev lesson is attached to a sage')
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
