/**
 * English and Russian profiles: every sage's bio and core concept translated in
 * public/i18n/sages.<locale>.json, and his place and field shown in the reader's language through
 * the vocabulary in public/i18n/terms.<locale>.json (lib/terms.ts), while the data keeps them in
 * Hebrew, because regions, map coordinates, filters and search read the Hebrew.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getAllSages } from '../lib/serverData'
import { localizeSage, overlayEntry } from '../lib/serverDataTranslator'
import { translateTerm, type TermDict } from '../lib/terms'
import { regionsOf } from '../lib/regions'
import termsEn from '../public/i18n/terms.en.json'
import termsRu from '../public/i18n/terms.ru.json'

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

const sages = getAllSages()
const TERMS = { en: termsEn.terms as TermDict, ru: termsRu.terms as TermDict }
const AND = { en: 'and', ru: 'и' } as const
const HEBREW = /[א-ת]/

console.log('\nlib/terms.ts')

test('a phrase is translated piece by piece, keeping its separators and joining ו with "and"', () => {
  const dict = { 'הלכה': 'halakha', 'קבלה': 'Kabbalah', 'מוסר': 'ethics', 'ירושלים': 'Jerusalem', 'צפת': 'Safed', 'ארץ ישראל': 'the Land of Israel' }
  assert.equal(translateTerm('הלכה, קבלה ומוסר', dict, 'and'), 'Halakha, Kabbalah and ethics')
  assert.equal(translateTerm('צפת; ירושלים', dict, 'and'), 'Safed; Jerusalem')
  assert.equal(translateTerm('ארץ ישראל (ירושלים)', dict, 'and'), 'The Land of Israel (Jerusalem)')
  assert.equal(translateTerm('צפת → ירושלים', dict, 'and'), 'Safed → Jerusalem')
  assert.equal(translateTerm('צפת/ירושלים', dict, 'and'), 'Safed / Jerusalem')
})

test('a whole phrase in the dictionary wins; an unknown piece leaves the phrase untranslated', () => {
  const dict = { 'גטו ורשה': 'the Warsaw Ghetto', 'פולין': 'Poland', 'הלכה': 'halakha' }
  // "ורשה" begins with ו but is Warsaw, not "and Rasha"
  assert.equal(translateTerm('פולין; גטו ורשה', dict, 'and'), 'Poland; the Warsaw Ghetto')
  assert.equal(translateTerm('הלכה ופולמוס', dict, 'and'), null)
  assert.equal(translateTerm('', dict, 'and'), null)
})

console.log('\nthe roster in English and Russian')

for (const locale of ['en', 'ru'] as const) {
  test(`every sage's place and field has a ${locale} translation`, () => {
    const missing = sages.flatMap(s => (['location', 'field'] as const)
      .filter(f => s[f]?.trim() && !translateTerm(s[f], TERMS[locale], AND[locale]))
      .map(f => `${s.id} ${f}: ${s[f]}`))
    assert.deepEqual(missing, [], `add the pieces to public/i18n/terms.${locale}.json`)
  })

  test(`every sage's tags, works and journey stops have a ${locale} translation`, () => {
    const missing = new Set<string>()
    for (const s of sages) {
      const p = s.migration_path
      const phrases = [...(s.tags ?? []), ...(s.works ?? []), ...(p ? [p.from, ...(p.intermediate ?? []), p.to] : [])]
      for (const t of phrases) if (t?.trim() && !translateTerm(t, TERMS[locale], AND[locale])) missing.add(t)
    }
    assert.deepEqual([...missing], [], `add them to public/i18n/terms.${locale}.json`)
  })

  test(`every sage's bio and core concept is translated to ${locale}, with no Hebrew left in it`, () => {
    const missing: string[] = []
    for (const s of sages) {
      const e = overlayEntry(s.id, locale)
      for (const f of ['bio', 'core_concept'] as const) {
        if (!s[f]?.trim()) continue
        const t = e?.[f]?.trim()
        if (!t || HEBREW.test(t)) missing.push(`${s.id} ${f}`)
      }
    }
    assert.deepEqual(missing, [])
  })
}

test("the Hebrew bios are bios, not a paper's opening lines (NotebookLM's header, a cut mid-word)", () => {
  const bad = sages.filter(s => {
    const b = s.bio?.trim() ?? ''
    return /^(מדריך בנושא המקור|סקירה זו|דוח זה|מאמר זה)|Source guide/.test(b) || /[\u0400-\u04FF]/.test(b) || (b && !/[.!?״"'׳)…]$/.test(b))
  }).map(s => s.id)
  assert.deepEqual(bad, [], 'write the bio into the spreadsheet column תקציר (2–3 שורות)')
})

test('every sage has a Hebrew bio and core concept (the page shows nothing under his name without them)', () => {
  const missing = sages.filter(s => !s.bio?.trim() || !s.core_concept?.trim()).map(s => `${s.id} ${s.label}`)
  assert.deepEqual(missing, [], 'write them into the spreadsheet columns תקציר (2–3 שורות) and רעיון מרכזי/חידוש')
})

test("a tag that holds the word נשים inside a longer tag (נשים בתלמוד) is not the women's tag: that sage carries the whole tag נשים too", () => {
  // the site matches whole tags (tags.includes('נשים')): the tower, the captions, the filter and the description
  // lines read nothing else, so a woman tagged only 'נשים בתלמוד' (624 until 2026-10-25) was spoken of as a man
  const bad = sages
    .filter(s => (s.tags ?? []).some(t => t !== 'נשים' && t.split(/[\s־-]+/).includes('נשים')) && !(s.tags ?? []).includes('נשים'))
    .map(s => `${s.id} ${s.label}: ${(s.tags ?? []).filter(t => t.includes('נשים')).join(', ')}`)
  assert.deepEqual(bad, [], "add the whole tag נשים to these sages (the spreadsheet's תגיות cell and both copies of data.json)")
})

test('the translation is shown beside the Hebrew, never over it: regions and places still read Hebrew', () => {
  for (const s of sages) {
    const en = localizeSage(s, 'en')
    assert.equal(en.location, s.location, `${s.id} location`)
    assert.equal(en.field, s.field, `${s.id} field`)
    assert.deepEqual(regionsOf(en.location), regionsOf(s.location))
  }
  const rashi = localizeSage(sages.find(s => s.id === '594')!, 'en')
  assert.equal(rashi.location_label, 'Troyes')
  assert.equal(rashi.field_label, 'Biblical commentary, Talmud commentary')
})

test('the browser path fetches the vocabulary and the pages show the translated place and field', () => {
  const src = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8')
  assert.match(src('../components/layout/AppShell.tsx'), /applyOverlay\(normalizedSages, overlay, terms, locale\)/)
  assert.match(src('../app/[locale]/sage/[id]/page.tsx'), /shownLocation\(sage\)/)
  assert.match(src('../app/[locale]/sage/[id]/page.tsx'), /shownField\(sage\)/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
