/**
 * The portrait in the hero of a sage's page (components/sages/SagePortrait.tsx, used by app/[locale]/sage/[id]/page.tsx):
 * the picture with the alt text of its kind, the caption link to the episode section, nothing at all for a sage with no
 * portrait, and the page's source (one use, in the hero, no change to the metadata or the structured data). The data
 * are whatever lib/portraits.ts holds; no test names a sage id. Illustration and photograph wording are checked against
 * the literal strings, so a swap of the two rows fails here. The page itself needs Next to render: what can be checked
 * here is the component's markup and the page's source.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import * as ReactNS from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getAllSages, getSageById } from '../lib/serverData'
import { localizeSage } from '../lib/serverDataTranslator'
import { labelParts } from '../lib/displayName'
import { hasPortrait, portraitEntries, portraitOf, type Portrait, type PortraitKind } from '../lib/portraits'
import type { Locale } from '../lib/types'
import { SagePortrait, SagePortraitFigure } from '../components/sages/SagePortrait'

// the component files are transformed with the classic JSX runtime here (Next uses the automatic one)
;(globalThis as { React?: unknown }).React = ReactNS

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

const src = (rel: string) => readFileSync(path.join(__dirname, rel), 'utf8')
const LOCALES: Locale[] = ['he', 'en', 'ru']
const KINDS: PortraitKind[] = ['illustration', 'photo']

// the wording the owner gave, written out here so that swapping the two rows in lib/portraits.ts is caught
const CAPTION: Record<PortraitKind, Record<Locale, string>> = {
  illustration: { he: 'איור מתוך פרק הפודקאסט', en: 'Illustration from the podcast episode', ru: 'Иллюстрация из выпуска подкаста' },
  photo: { he: 'תמונה מתוך פרק הפודקאסט', en: 'Picture from the podcast episode', ru: 'Изображение из выпуска подкаста' },
}
const ALT_WORD: Record<PortraitKind, Record<Locale, string>> = {
  illustration: { he: 'איור', en: 'Illustration', ru: 'Иллюстрация' },
  photo: { he: 'תמונה', en: 'Picture', ru: 'Изображение' },
}

const unescapeHtml = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

/** The value of the first attribute `name` on the first tag that matches `tag`, unescaped; null when there is none. */
function attr(html: string, tag: RegExp, name: string): string | null {
  const t = html.match(tag)
  if (!t) return null
  const m = t[0].match(new RegExp(`\\s${name}="([^"]*)"`))
  return m ? unescapeHtml(m[1]) : null
}

const nameOf = (id: string, loc: Locale) => {
  const raw = getSageById(id)
  assert.ok(raw, `the data name a sage that is not on the roster: ${id}`)
  return labelParts(localizeSage(raw, loc).label).name
}

const render = (props: { id: string; name: string; locale: Locale; accent?: string; className?: string }) =>
  renderToStaticMarkup(ReactNS.createElement(SagePortrait, props))
const renderFigure = (props: { id: string; name: string; locale: Locale; portrait: Portrait; accent?: string; className?: string }) =>
  renderToStaticMarkup(ReactNS.createElement(SagePortraitFigure, props))

const IMG = /<img\b[^>]*>/
const CREDIT = /<a\b[^>]*data-portrait-credit[^>]*>/
const creditText = (html: string) => unescapeHtml((html.match(/<a\b[^>]*data-portrait-credit[^>]*>([^<]*)<\/a>/) ?? [])[1] ?? '')

/** The checks every portrait's markup must pass, for its kind and language. */
function checkMarkup(html: string, id: string, name: string, loc: Locale, portrait: Portrait) {
  assert.notEqual(html, '', `no markup for ${id} in ${loc}`)
  assert.equal(attr(html, IMG, 'src'), portrait.src, 'the large file, not the small one')
  assert.equal(attr(html, IMG, 'alt'), `${ALT_WORD[portrait.kind][loc]}: ${name}`, `alt of a ${portrait.kind} in ${loc}`)
  assert.equal(attr(html, IMG, 'width'), '160')
  assert.equal(attr(html, IMG, 'height'), '160')
  assert.equal(attr(html, IMG, 'loading'), 'eager', 'the hero is above the fold')
  assert.equal(attr(html, IMG, 'decoding'), 'async')
  assert.equal(attr(html, IMG, 'data-portrait'), id)
  assert.equal(attr(html, IMG, 'data-portrait-kind'), portrait.kind)
  assert.equal(attr(html, CREDIT, 'href'), '#listen', 'the caption goes to the episode section of this page')
  assert.equal(creditText(html), CAPTION[portrait.kind][loc], `caption of a ${portrait.kind} in ${loc}`)
  // never the other kind's wording, in the alt or the caption
  const other = KINDS.find(k => k !== portrait.kind)!
  assert.ok(!html.includes(CAPTION[other][loc]), `${portrait.kind} markup holds the ${other} caption`)
  assert.ok(!attr(html, IMG, 'alt')!.startsWith(`${ALT_WORD[other][loc]}:`), `${portrait.kind} alt starts with the ${other} word`)
  // nothing is asked from anywhere but this site
  assert.doesNotMatch(html, /https?:\/\//)
  assert.doesNotMatch(html, /spotify|scdn/i)
}

console.log('\nthe portrait in the hero')

const inData = Object.fromEntries(
  KINDS.map(k => [k, portraitEntries().find(([, e]) => e.kind === k)?.[0] ?? null]),
) as Record<PortraitKind, string | null>

for (const kind of KINDS) {
  test(`a sage whose portrait is ${kind === "photo" ? "a photograph" : "an illustration"}: the picture, its alt and the caption, in he, en and ru`, () => {
    const id = inData[kind]
    if (!id) {
      console.log(`       (the data hold no ${kind} yet: the stub test below covers its wording)`)
      return
    }
    const portrait = portraitOf(id)!
    assert.equal(portrait.kind, kind)
    for (const loc of LOCALES) {
      const name = nameOf(id, loc)
      checkMarkup(render({ id, name, locale: loc }), id, name, loc, portrait)
    }
  })

  test(`a stub ${kind} entry gets the ${kind} wording, whatever the data hold`, () => {
    const portrait: Portrait = { src: '/portraits/0.webp', srcSm: '/portraits/0.sm.webp', episode: 'x', kind }
    for (const loc of LOCALES) {
      checkMarkup(renderFigure({ id: '0', name: 'N', locale: loc, portrait }), '0', 'N', loc, portrait)
    }
  })
}

test('the wording of the two kinds is the owner\'s, row for row', () => {
  const stub = (kind: PortraitKind): Portrait => ({ src: '/portraits/0.webp', srcSm: '/portraits/0.sm.webp', episode: 'x', kind })
  for (const kind of KINDS) {
    for (const loc of LOCALES) {
      const html = renderFigure({ id: '0', name: 'N', locale: loc, portrait: stub(kind) })
      assert.equal(creditText(html), CAPTION[kind][loc])
    }
  }
  assert.notEqual(CAPTION.illustration.he, CAPTION.photo.he)
})

test('a sage with no portrait renders nothing at all: no wrapper, no placeholder', () => {
  const sage = getAllSages().find(s => !hasPortrait(s.id))
  assert.ok(sage, 'every sage on the roster has a portrait?')
  for (const loc of LOCALES) assert.equal(render({ id: sage.id, name: nameOf(sage.id, loc), locale: loc, accent: '#c9973a' }), '')
  assert.equal(render({ id: 'not-a-sage', name: 'x', locale: 'en' }), '')
  assert.equal(SagePortrait({ id: 'not-a-sage', name: 'x', locale: 'en' }), null)
})

test('the ring takes the era colour when the page gives it, the quiet border when it does not', () => {
  const portrait = portraitOf(portraitEntries()[0][0])!
  const id = portraitEntries()[0][0]
  const withAccent = renderFigure({ id, name: 'N', locale: 'en', portrait, accent: '#27ae60' })
  assert.match(attr(withAccent, IMG, 'style') ?? '', /border-color:\s*#27ae6099/i)
  const without = renderFigure({ id, name: 'N', locale: 'en', portrait })
  assert.equal(attr(without, IMG, 'style'), null)
  assert.match(without, /border-ink-700\/40/)
})

test('a class from the page is added to the figure and nothing else changes', () => {
  const [id] = portraitEntries()[0]
  const portrait = portraitOf(id)!
  const plain = renderFigure({ id, name: 'N', locale: 'he', portrait })
  const extra = renderFigure({ id, name: 'N', locale: 'he', portrait, className: 'mt-3' })
  assert.equal(extra, plain.replace(/(<figure\b[^>]*class=")([^"]*)"/, '$1$2 mt-3"'))
})

test('the figure is a square of 96 px on a phone and 160 px from md up, the caption under it, in logical utilities only', () => {
  const [id] = portraitEntries()[0]
  const html = renderFigure({ id, name: 'N', locale: 'he', portrait: portraitOf(id)! })
  assert.match(html, /<figure\b[^>]*class="[^"]*\bw-24\b[^"]*\bmd:w-40\b/)
  assert.match(html, /class="[^"]*\baspect-square\b[^"]*\bobject-cover\b/)
  assert.ok(html.indexOf('<img') < html.indexOf('<figcaption'), 'caption under the picture')
  const code = src('../components/sages/SagePortrait.tsx')
  // no left/right: the page runs both ways
  assert.doesNotMatch(code, /(?:^|[\s"'`])(?:-?(?:ml|mr|pl|pr|left|right)-|text-(?:left|right)\b|float-(?:left|right)\b|(?:border|rounded)-[lr](?:-|\b))/, 'a physical-direction utility')
})

console.log('\nthe component and the page')

test('the component is a server component and a plain <img>, with the wording from lib/portraits.ts only', () => {
  const code = src('../components/sages/SagePortrait.tsx')
  assert.doesNotMatch(code, /['"]use client['"]/)
  assert.doesNotMatch(code, /from 'next\/image'/)
  assert.doesNotMatch(code, /<Image\b/)
  assert.doesNotMatch(code, /useEffect|useState/)
  assert.match(code, /loading="eager"/)
  assert.match(code, /portraitAlt\(name, locale, portrait\)/)
  assert.match(code, /portraitCredit\(portrait, locale\)/)
  // no literal caption or alt word, and no picking of a row by hand
  assert.doesNotMatch(code, /איור|תמונה|Illustration|Picture|Иллюстрация|Изображение/)
  assert.doesNotMatch(code, /PORTRAIT_CREDIT/)
  // the page's lazy-loading rule: the hero is the only eager portrait, and this is the hero's component
  assert.doesNotMatch(code, /loading="lazy"/)
})

test('the page imports the component once and uses it once, inside the hero, before the buttons', () => {
  const page = src('../app/[locale]/sage/[id]/page.tsx')
  assert.equal((page.match(/import \{ SagePortrait \} from '@\/components\/sages\/SagePortrait'/g) ?? []).length, 1)
  assert.equal((page.match(/<SagePortrait\b/g) ?? []).length, 1)
  assert.match(page, /<SagePortrait id=\{raw\.id\} name=\{name\} locale=\{loc\} accent=\{accent\} \/>/)
  const hero = page.indexOf('<header\n            className="sage-hero')
  const use = page.indexOf('<SagePortrait')
  const buttons = page.indexOf('<div className="no-print mt-6 flex flex-wrap gap-2">')
  assert.ok(hero > 0 && use > hero && buttons > use, 'the portrait sits in the hero, above the buttons row')
  const heroEnd = page.indexOf('</header>', hero)
  assert.ok(use < heroEnd)
})

test('a sage without a portrait gets the hero text directly, with no wrapper; one with a portrait gets it beside the picture', () => {
  const page = src('../app/[locale]/sage/[id]/page.tsx')
  assert.match(page, /const hasHeroPortrait = hasPortrait\(raw\.id\)/)
  assert.match(
    page,
    /\{hasHeroPortrait \? \(\s*<div className="flex items-start gap-4 md:gap-8">\s*<div className="min-w-0 flex-1">\{heroText\}<\/div>\s*<SagePortrait [^>]*\/>\s*<\/div>\s*\) : heroText\}/,
  )
  // the text is defined once, as a fragment, so both branches hold the same elements
  assert.equal((page.match(/const heroText = \(\s*<>/g) ?? []).length, 1)
  assert.equal((page.match(/\{heroText\}|: heroText\}/g) ?? []).length, 2)
  // the era chip, years, place, name and tags are all in the text and nothing of them stayed behind in the hero
  const heroTextAt = page.indexOf('const heroText')
  const heroTextEnd = page.indexOf('</>\n  )', heroTextAt)
  const text = page.slice(heroTextAt, heroTextEnd)
  for (const piece of ['<EraChip', '<MetaChip icon="calendar">', '<MetaChip icon="pin">', '<h1 dir="auto"', 'shownField(sage)', 'shownTags(sage)']) {
    assert.ok(text.includes(piece), `${piece} is in the hero text`)
  }
  const header = page.slice(page.indexOf('<header\n            className="sage-hero'), page.indexOf('</header>'))
  assert.ok(!header.includes('<EraChip') && !header.includes('<h1'), 'the hero holds the text only through heroText')
})

test('the hero loads the picture eagerly and the rest of the page does not use it', () => {
  const page = src('../app/[locale]/sage/[id]/page.tsx')
  assert.doesNotMatch(page, /portraitOf|portraitAlt|portraitCredit|PORTRAIT_/, 'the page leaves the wording and the lookup to the component')
  assert.match(page, /import \{ hasPortrait \} from '@\/lib\/portraits'/)
})

test('the metadata, the share tags and the structured data do not carry the portrait', () => {
  const page = src('../app/[locale]/sage/[id]/page.tsx')
  const meta = page.slice(page.indexOf('export async function generateMetadata'), page.indexOf('export default async function SagePage'))
  assert.ok(meta.length > 200)
  assert.doesNotMatch(meta, /portrait/i)
  const ld = page.slice(page.indexOf('const jsonLd = jsonLdScript('), page.indexOf('const searchName'))
  assert.ok(ld.length > 100)
  assert.doesNotMatch(ld, /portrait/i)
  assert.doesNotMatch(src('../lib/structuredData.ts'), /portrait/i)
})

test('the page keeps its existing hero buttons in their order', () => {
  const page = src('../app/[locale]/sage/[id]/page.tsx')
  const order = ['href="#research"', 'href="#listen"', 'href="#video"', 'href="#writings"', 'href="#quiz"', '<AskSageButton', 'showInGraph[loc]', 'towerPath(loc, raw.id)', 'connectHref(loc, raw.id)']
  let last = page.indexOf('<div className="no-print mt-6 flex flex-wrap gap-2">')
  assert.ok(last > 0)
  for (const piece of order) {
    const at = page.indexOf(piece, last)
    assert.ok(at > last, `${piece} comes after the previous button`)
    last = at
  }
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
