/**
 * The kids' journey: two routes from the owner's books, every station complete, every sage it links to
 * still the sage the book means (ids drift, names do not), the illustrations present, and the passport
 * robust to whatever a browser kept. Imports the real production modules.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import graph from '../public/data.json'
import supplement from '../public/data-supplement.json'
import supplement2 from '../public/data-supplement-2.json'
import ancient from '../public/data-ancient.json'
import { KIDS_ROUTES, stationAnchor, stationsOfSage } from '../lib/kidsJourney'
import { parseProgress } from '../lib/kidsJourneyProgress'
import { getAllConnections, getAllSages } from '../lib/serverData'
import { buildTower } from '../lib/tower'
import { bookYear, jumpLabel, kidsTour, kidsTourPath } from '../lib/kidsTour'
import { KIDS_QUIZ_LENGTH, kidsQuizUrl, validateQuiz, isTrueFalse, type QuizFile } from '../lib/quiz'

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

const labels = new Map<string, string>()
for (const set of [graph, supplement, supplement2, ancient] as unknown as Array<{ nodes?: Array<{ id: string | number; label: string }> }>) {
  for (const n of set.nodes ?? []) if (!labels.has(String(n.id))) labels.set(String(n.id), n.label)
}
const plain = (s: string) => s.replace(/[״"]/g, '"').replace(/[׳']/g, "'")

// What each linked id must still be: a word of the sage's name the roster label carries.
const EXPECTED: Record<string, string> = {
  198: 'דונש', 592: 'יוחנן בן זכאי', 507: 'אליעזר', 346: 'אלעזר בן ערך', 437: 'רב יוסף', 573: 'בירב', 585: 'חביב',
  72: 'מהר"ל', 428: 'גנז', 130: 'נובהרדוק', 143: 'פיאסצ', 156: 'קהתי',
  629: 'מרים', 389: 'דבורה', 282: 'חנה', 556: 'ברוריה', 534: 'ילתא', 524: 'גרציה', 510: 'שנירר', 496: 'ליבוביץ',
}

const [saltiel, shira] = KIDS_ROUTES

test('two routes: Saltiel\'s seven meetings and Shira\'s eight stations, numbered in order', () => {
  assert.equal(saltiel.key, 'saltiel')
  assert.equal(shira.key, 'shira')
  assert.deepEqual(saltiel.stations.map(s => s.n), [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(shira.stations.map(s => s.n), [1, 2, 3, 4, 5, 6, 7, 8])
})

test('every station has its travel card, a summary and the book\'s game and task', () => {
  for (const r of KIDS_ROUTES) {
    for (const s of r.stations) {
      const at = `${r.key} ${s.n}`
      for (const f of [s.title, s.place, s.when, s.summary]) assert.ok(f && f.trim(), `${at}: a field is empty`)
      assert.ok(s.who.length > 0, `${at}: nobody to meet`)
      assert.ok(s.keywords.length > 0, `${at}: no keywords`)
      assert.ok(s.tasks.length > 0, `${at}: no game or task`)
      for (const t of s.tasks) assert.ok(t.name.trim() && t.text.trim(), `${at}: a task without name or text`)
      if (r.key === 'shira') assert.ok(s.object?.name && s.object.icon, `${at}: Shira takes nothing into her bag`)
    }
  }
})

test('every sage a station links to is still that sage', () => {
  let linked = 0
  for (const r of KIDS_ROUTES) {
    for (const s of r.stations) {
      for (const p of s.who.filter(p => p.id)) {
        linked++
        const label = labels.get(p.id!)
        assert.ok(label, `${r.key} ${s.n}: id ${p.id} (${p.name}) is not in the roster`)
        assert.ok(EXPECTED[p.id!], `${r.key} ${s.n}: add id ${p.id} (${p.name}) to EXPECTED`)
        assert.ok(plain(label!).includes(plain(EXPECTED[p.id!])), `${r.key} ${s.n}: id ${p.id} is now "${label}", not ${p.name}`)
      }
    }
  }
  assert.equal(linked, 20)
})

test('a sage page finds its stations', () => {
  const dunash = stationsOfSage('198')
  assert.equal(dunash.length, 1)
  assert.equal(dunash[0].route.key, 'saltiel')
  assert.equal(dunash[0].station.n, 1)
  assert.equal(stationAnchor('shira', 4), 'shira-4')
  assert.equal(stationsOfSage('556')[0].route.key, 'shira')
  assert.deepEqual(stationsOfSage('41'), [])
})

test('the illustrations are in public/kids', () => {
  const dir = path.join(__dirname, '..', 'public')
  const images = [...KIDS_ROUTES.map(r => r.cover.src), ...KIDS_ROUTES.flatMap(r => r.stations.map(s => s.image?.src).filter(Boolean) as string[])]
  assert.ok(images.length >= 9)
  for (const src of images) assert.ok(fs.existsSync(path.join(dir, src)), `${src} is missing`)
  for (const s of saltiel.stations) assert.ok(s.image, `Saltiel's meeting ${s.n} has its illustration`)
})

test('Hebrew acronyms carry gershayim, not a plain quote', () => {
  const text = JSON.stringify(KIDS_ROUTES)
  const bad = text.match(/[א-ת]\\?"[א-ת](?![א-ת])/g) ?? []
  assert.deepEqual(bad, [])
})

test('every station has its quiz: ten questions, valid, written for that station', () => {
  const pub = path.join(__dirname, '..', 'public')
  const files = fs.readdirSync(path.join(pub, 'quiz', 'kids')).filter(f => f.endsWith('.json'))
  assert.equal(files.length, 15, 'one quiz per station, nothing else')
  for (const r of KIDS_ROUTES) {
    for (const s of r.stations) {
      const file = path.join(pub, kidsQuizUrl(r.key, s.n))
      assert.ok(fs.existsSync(file), `${r.key} ${s.n}: no quiz`)
      const quiz = JSON.parse(fs.readFileSync(file, 'utf8')) as QuizFile
      assert.deepEqual(validateQuiz(quiz, KIDS_QUIZ_LENGTH), [], `${r.key} ${s.n}`)
      assert.equal(quiz.label, s.title, `${r.key} ${s.n}: the quiz was written for another station`)
      for (const q of quiz.questions.filter(isTrueFalse)) assert.deepEqual(q.options, ['נכון', 'לא נכון'])
      const tf = quiz.questions.filter(isTrueFalse).length
      assert.ok(tf >= 2 && tf <= 4, `${r.key} ${s.n}: ${tf} true/false questions`)
    }
  }
})

test('the passport survives whatever the browser kept', () => {
  assert.deepEqual(parseProgress(''), { saltiel: [], shira: [] })
  assert.deepEqual(parseProgress('not json'), { saltiel: [], shira: [] })
  assert.deepEqual(parseProgress('{"saltiel":[1,"2",3.5,4],"shira":"x"}'), { saltiel: [1, 4], shira: [] })
})

console.log('\nthe time machine (the routes flown in the tower)')

const tower = buildTower(getAllSages(), getAllConnections(), 'he')
const towerNode = new Map(tower.nodes.map(n => [n.id, n]))

test('every station of both routes is flown, in the book\'s order, at the place of the sage it meets', () => {
  for (const route of KIDS_ROUTES) {
    const tour = kidsTour(tower, route.key)!
    assert.ok(tour, route.key)
    assert.deepEqual(tour.stations.map(s => s.n), route.stations.map(s => s.n), `${route.key}: a station is missing`)
    assert.equal(tour.points.length, tour.stations.length)
    tour.points.forEach((p, i) => {
      const station = route.stations[i]
      assert.ok(station.who.some(w => w.id === p.id), `${route.key} ${station.n}: flown to a sage it does not meet`)
      const n = towerNode.get(p.id!)!
      assert.deepEqual([p.x, p.y, p.z], [n.x, n.y, n.z])
      assert.equal(tour.stations[i].href, `/he/kids#${stationAnchor(route.key, station.n)}`)
    })
  }
  assert.equal(kidsTour(tower, 'nobody'), null)
})

test("Saltiel's time machine jumps back and forth; Shira's bag fills as she climbs", () => {
  const saltiel = kidsTour(tower, 'saltiel')!
  // by the books' own dates: Cordoba 950 → Yavne 70 → Pumbedita 300 → Safed 1538 → Prague 1600 …
  assert.deepEqual(saltiel.stations.map(s => s.jump ?? null), [null, -880, 230, 1238, 62, 296, 59])
  assert.equal(bookYear('יציאת מצרים · ב׳תמ״ח (1313 לפנה״ס) · לפי המסורת'), -1313)
  assert.equal(bookYear('הגיליונות · ה׳תש״ב–ה׳תשל״א (1942–1971)'), 1942)
  assert.equal(bookYear('ימי השופטים'), null)
  assert.match(jumpLabel(-880), /^⏪ חזרנו אחורה בזמן, כ־880 שנה$/)
  assert.match(jumpLabel(1238), /^⏩ קפצנו קדימה בזמן, כ־1,250 שנה$/)
  const shira = kidsTour(tower, 'shira')!
  assert.ok(shira.stations.every(s => s.object), 'every station gives Shira an object')
})

test('the time machine shows only the travel card: never the story', () => {
  const panel = fs.readFileSync(path.join(__dirname, '../components/kids/KidsTourPanel.tsx'), 'utf8')
  for (const field of ['title', 'place', 'when', 'who', 'object', 'image']) assert.match(panel, new RegExp(`st\\.${field}`))
  assert.doesNotMatch(panel, /\.summary|\.tasks|\.intro/)
})

test('the kids page leads to both time machines, and the tower keeps the journey\'s own address', () => {
  const page = fs.readFileSync(path.join(__dirname, '../app/[locale]/kids/page.tsx'), 'utf8')
  assert.match(page, /href=\{kidsTourPath\(route\.key\)\}/)
  assert.equal(kidsTourPath('shira'), '/he/kids/journey/shira')
  assert.ok(fs.existsSync(path.join(__dirname, '../app/[locale]/kids/journey/[route]/page.tsx')))
  const scene = fs.readFileSync(path.join(__dirname, '../components/tower/TowerScene.tsx'), 'utf8')
  assert.match(scene, /\/\/ the kids' journey keeps its own address\s+if \(tourRef\.current\) return/)
  assert.match(scene, /if \(tourRef\.current\) return\s+const i = pick\(ev\)/)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
