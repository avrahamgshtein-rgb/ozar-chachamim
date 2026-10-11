// Records the "meet Ozar Chachamim" walkthrough: a scripted tour of the real
// site, with captions, a visible cursor and title/outro cards, as a .webm.
//
//   PW_DIR=/path/with/node_modules BASE=http://localhost:3200 LANG_CODE=he \
//     OUT_DIR=./out node tools/video/record-intro.mjs
//
// BASE must serve a production build (`npm run build && npm run start`) or the
// live site. The recording is the site itself, so it stays accurate as the
// site changes: re-run it after a release to refresh the video.
//
// Outputs in OUT_DIR:
//   intro-<lang>.webm   the raw recording (starts with page-load time to trim)
//   intro-<lang>.json   trimStart (seconds to cut from the front) and the scene log
//   intro-<lang>.srt    the captions as a subtitle track, already shifted by trimStart

import fs from 'node:fs'
import path from 'node:path'
import { CHROME, installOverlay, loadPlaywright, makeDriver } from './lib.mjs'

const BASE = process.env.BASE || 'http://localhost:3200'
const LANG = process.env.LANG_CODE || 'he'
const OUT_DIR = path.resolve(process.env.OUT_DIR || './out')
const W = +(process.env.W || 1920)
const H = +(process.env.H || 1080)
const SCALE = +(process.env.SCALE || 1)
const URL_SHOWN = process.env.URL_SHOWN || 'ozar-chachamim-app.vercel.app'

const T = {
  he: {
    title: ['אוצר חכמים', 'מפת הידע של חכמי ישראל לדורותיהם'],
    graph1: ['מפה אחת של מאות חכמים והקשרים ביניהם', 'מהאבות ועד ימינו'],
    graph2: ['כל נקודה היא חכם. כל קו הוא קשר של לימוד או השפעה'],
    search: ['מחפשים כמו שכותבים', '״רשי״ מוצא את רש״י'],
    drawer: ['כרטיס חכם: תקופה, מקום, רעיון מרכזי וקשרים'],
    page1: ['לכל חכם דף עם מחקר מלא'],
    page2: ['תוכן עניינים, הערות שוליים וזמן קריאה'],
    writings: ['הכתבים של החכם, בלחיצה אחת', 'בספריא ובוויקיטקסט'],
    listen: ['ולרוב החכמים יש פרק בפודקאסט', 'מאזינים ישר מהדף'],
    timeline: ['ציר הזמן: אלפי שנים של תורה'],
    journey: ['מסע התורה: איך מרכזי התורה נעו בעולם'],
    sinai: ['הדרך לסיני: מכל חכם עד משה רבנו', 'קו מקווקו הוא השראה, לא קבלה ישירה'],
    schools: ['בתי מדרש ומסורות: מי הושפע ממי'],
    outro: ['אוצר חכמים', 'כנסו, חפשו, גלו'],
    typed: 'רשי',
    full: 'דף מלא',
    speed: /מהירות/,
    play: /נגן/,
    load: /הפעלת הנגן/,
  },
  en: {
    title: ['Ozar Chachamim', 'The knowledge map of Jewish sages, through the generations'],
    graph1: ['One map of hundreds of sages and the links between them', 'From the Patriarchs to today'],
    graph2: ['Every dot is a sage. Every line is a link of study or influence'],
    search: ['Search the way you type', '“rashi” finds Rashi'],
    drawer: ['A sage card: era, place, core idea and connections'],
    page1: ['Every sage has a page with full research'],
    page2: ['Contents, footnotes and reading time'],
    writings: ['The sage’s own writings, one click away', 'On Sefaria and Wikisource'],
    listen: ['Most sages have a podcast episode', 'Listen right from the page'],
    timeline: ['The timeline: thousands of years of Torah'],
    journey: ['The journey of Torah: how its centres moved around the world'],
    sinai: ['The road to Sinai: from any sage back to Moses', 'A dashed line is inspiration, not direct transmission'],
    schools: ['Schools and traditions: who influenced whom'],
    outro: ['Ozar Chachamim', 'Come in, search, discover'],
    typed: 'rashi',
    full: 'Full Profile',
    speed: /Speed/,
    play: /Play/,
    load: /Load player/,
  },
  ru: {
    title: ['Оцар Хахамим', 'Карта знаний о мудрецах Израиля сквозь поколения'],
    graph1: ['Одна карта сотен мудрецов и связей между ними', 'От праотцев до наших дней'],
    graph2: ['Каждая точка — мудрец. Каждая линия — связь учёбы или влияния'],
    search: ['Ищите так, как пишете', '«rashi» находит Раши'],
    drawer: ['Карточка мудреца: эпоха, место, главная идея и связи'],
    page1: ['У каждого мудреца есть страница с полным исследованием'],
    page2: ['Оглавление, сноски и время чтения'],
    writings: ['Сочинения мудреца — в один клик', 'На Sefaria и Викитеке'],
    listen: ['У большинства мудрецов есть выпуск подкаста', 'Слушайте прямо со страницы'],
    timeline: ['Лента времени: тысячелетия Торы'],
    journey: ['Путь Торы: как центры Торы перемещались по миру'],
    sinai: ['Путь к Синаю: от любого мудреца до Моисея', 'Пунктир — вдохновение, а не прямая передача'],
    schools: ['Школы и традиции: кто на кого повлиял'],
    outro: ['Оцар Хахамим', 'Заходите, ищите, открывайте'],
    typed: 'rashi',
    full: 'Полный профиль',
    speed: /Скорость/,
    play: /Воспроизвести/,
    load: /Включить плеер/,
  },
}[LANG]
if (!T) throw new Error('LANG_CODE must be he, en or ru')

const { chromium } = loadPlaywright()
fs.mkdirSync(OUT_DIR, { recursive: true })
const vdir = fs.mkdtempSync(path.join(OUT_DIR, 'raw-'))

const browser = await chromium.launch({ executablePath: CHROME })
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: vdir, size: { width: W, height: H } },
  locale: LANG === 'he' ? 'he-IL' : LANG === 'ru' ? 'ru-RU' : 'en-US',
  colorScheme: 'dark',
})
await ctx.addInitScript(() => { try { localStorage.setItem('ozar-tour-v1', '1') } catch {} })
await ctx.addInitScript(installOverlay)
// The assistant's quota check needs Supabase, which a recording box can't
// reach. Report it as available so the panel opens in its normal state if a
// scene opens it; the walkthrough never sends a question.
await ctx.route('**/api/chat', route =>
  route.request().method() === 'GET'
    ? route.fulfill({ json: { authenticated: false, quota: { limit: 5, remaining: 5 } } })
    : route.abort())

const page = await ctx.newPage()
const t0 = Date.now()
const d = makeDriver(page)
const log = []
const mark = name => log.push({ scene: name, at: +((Date.now() - t0) / 1000).toFixed(1) })

async function scene(name, fn) {
  mark(name)
  try { await fn() } catch (e) { log.push({ scene: name, error: String(e.message).slice(0, 200) }) }
}
/** A full navigation, hidden behind the veil so no half-loaded page is ever on screen. */
async function go(p, settle = 1500) {
  await d.capOff()
  await d.veilOn()
  await page.goto(`${BASE}/${LANG}${p}`, { waitUntil: 'domcontentloaded' })
  await d.sleep(settle)
  await d.park()
  await d.veilOff()
  await d.sleep(750)
}
const tab = id => `?tab=${id}`

// ── load, then the title card ───────────────────────────────────────────
await page.goto(`${BASE}/${LANG}`, { waitUntil: 'domcontentloaded' })
await d.sleep(2600)
await d.scale(SCALE)
const tCard = (Date.now() - t0) / 1000
await scene('title', async () => {
  await d.card({ img: '/images/temple-medallion.png', lines: [['h1', '', T.title[0]], ['p', '', T.title[1]]] })
  await d.sleep(3900)
  await d.cardOff()
  await d.sleep(1000)
})

// ── 1. the network ──────────────────────────────────────────────────────
await scene('graph', async () => {
  await d.glide(W * 0.5, H * 0.5, 600)
  await d.cap(...T.graph1)
  await d.sleep(3400)
  await d.cap(...T.graph2)
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -120); await d.sleep(220) }
  await d.sleep(1100)
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 120); await d.sleep(200) }
  await d.sleep(500)
})

// ── 2. search, the sage card ────────────────────────────────────────────
await scene('search', async () => {
  const box = page.locator('[data-tour="search"] input').first()
  await d.click(box, 900)
  await d.cap(...T.search)
  await d.typeSlow(T.typed, 230)
  await d.sleep(1900)
  await page.keyboard.press('Enter')
  await d.sleep(1500)
  await d.cap(...T.drawer)
  await d.sleep(3700)
})

// ── 3. the sage's own page ──────────────────────────────────────────────
await scene('sage page', async () => {
  const full = page.getByRole('link', { name: T.full }).first()
  await d.capOff()
  await d.click(full, 1000)
  await d.veilOn()
  await page.waitForURL(/\/sage\//, { timeout: 15000 })
  await d.sleep(1500)
  await d.park()
  await d.veilOff()
  await d.sleep(500)
  await d.cap(...T.page1)
  await d.glide(W * 0.5, H * 0.55, 500)
  await d.sleep(2600)
  // the sage's writings on Sefaria and Wikisource
  await d.cap(...T.writings)
  await page.evaluate(() => document.getElementById('writings')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  await d.sleep(1500)
  await d.pointAt(page.locator('#writings ul a').first(), 900)
  await d.sleep(1800)
  await d.pointAt(page.locator('#writings a[href*="wikisource"]').first(), 900)
  await d.sleep(2200)
  await page.evaluate(() => document.getElementById('sage-scroll')?.scrollTo({ top: 0, behavior: 'instant' }))
  await d.sleep(500)
  await d.cap(...T.page2)
  await d.scroll(1100, 4400)
  await d.sleep(600)
  await page.evaluate(() => document.getElementById('sage-scroll')?.scrollTo({ top: 0, behavior: 'instant' }))
  await d.sleep(800)
  // The assistant ("שאלו על החכם") is not shown: on 2026-10-11 the live /api/chat
  // answered every question with 500 internal_error. Add the scene back (open the
  // panel, type a question, show the answer) once an answer is confirmed working.
})

// ── 3b. listen to the episode, on a sage who has one (the Rambam) ────────
await scene('listen', async () => {
  await go('/sage/41')
  await d.glide(W * 0.4, H * 0.5, 500)
  await d.cap(...T.listen)
  await page.evaluate(() => document.getElementById('listen')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  await d.sleep(1600)
  await d.click(page.getByRole('button', { name: T.load }).first(), 900)
  await d.sleep(4600)
  await d.capOff()
  await page.evaluate(() => document.getElementById('sage-scroll')?.scrollTo({ top: 0, behavior: 'instant' }))
  await d.sleep(400)
})

// ── 4. the timeline ─────────────────────────────────────────────────────
await scene('timeline', async () => {
  await go(tab('timeline'))
  await d.glide(W * 0.5, H * 0.66, 700)
  await d.cap(...T.timeline)
  await d.sleep(1800)
  // Ctrl + wheel zooms the axis: the dense centuries open up into names
  await page.keyboard.down('Control')
  for (let i = 0; i < 9; i++) { await page.mouse.wheel(0, -140); await d.sleep(190) }
  await page.keyboard.up('Control')
  await d.sleep(2600)
  await page.keyboard.down('Control')
  for (let i = 0; i < 9; i++) { await page.mouse.wheel(0, 140); await d.sleep(150) }
  await page.keyboard.up('Control')
  await d.sleep(600)
})

// ── 5. the journey of Torah ─────────────────────────────────────────────
await scene('journey', async () => {
  await go(`${tab('map')}&journey=1&year=1000`)
  await d.cap(T.journey[0], '', 250)
  await d.glide(W * 0.45, H * 0.4, 500)
  // fast enough to cross the centuries in a few seconds
  const speed = page.getByLabel(T.speed).first()
  await d.click(speed, 800)
  for (let i = 0; i < 4; i++) {
    if (/4×|4x|4 ×/.test((await speed.getAttribute('aria-label')) || '')) break
    await speed.click()
    await d.sleep(150)
  }
  await d.click(page.getByLabel(T.play).first(), 700)
  await d.glide(W * 0.45, H * 0.4, 500)
  await d.sleep(10500)
})

// ── 6. the road to Sinai ────────────────────────────────────────────────
await scene('sinai', async () => {
  await go(`${tab('genealogy')}&view=sinai&focus=41`)
  await d.glide(W * 0.5, H * 0.6, 500)
  await d.cap(...T.sinai)
  await d.sleep(2600)
  await d.scroll(2000, 7600, 40)
  await d.sleep(500)
})

// ── 7. schools and traditions ───────────────────────────────────────────
await scene('schools', async () => {
  await go(tab('traditions'))
  await d.glide(W * 0.5, H * 0.55, 500)
  await d.cap(...T.schools)
  await d.sleep(1800)
  await d.scroll(800, 4200)
  await d.sleep(500)
})

// ── outro ───────────────────────────────────────────────────────────────
await scene('outro', async () => {
  await d.capOff()
  await d.card({
    img: '/images/temple-medallion.png',
    lines: [['h1', '', T.outro[0]], ['p', '', T.outro[1]], ['div', 'url', URL_SHOWN]],
  })
  await d.sleep(4800)
})
const tEnd = Date.now()

const video = page.video()
await ctx.close()
const rawPath = await video.path()
await browser.close()
const dest = path.join(OUT_DIR, `intro-${LANG}.webm`)
fs.renameSync(rawPath, dest)
fs.rmSync(vdir, { recursive: true, force: true })

// Subtitle track from the caption log, shifted so 0 is the first frame kept.
const trimStart = +(tCard + 0.15).toFixed(2)
const tc = s => {
  const ms = Math.max(0, Math.round(s * 1000))
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`
}
const rel = at => (at - t0) / 1000 - trimStart
const srt = []
d.cues.forEach((c, i) => {
  if (c.off) return
  const next = d.cues.slice(i + 1).find(n => true)
  const end = (next ? next.at : tEnd) - 150
  if (rel(c.at) < -0.5) return
  srt.push(`${srt.length + 1}\n${tc(Math.max(0, rel(c.at)) + 0.35)} --> ${tc(rel(end))}\n${c.text}${c.sub ? '\n' + c.sub : ''}\n`)
})
fs.writeFileSync(path.join(OUT_DIR, `intro-${LANG}.srt`), srt.join('\n'))
fs.writeFileSync(path.join(OUT_DIR, `intro-${LANG}.json`), JSON.stringify({ trimStart, seconds: +((tEnd - t0) / 1000 - trimStart).toFixed(1), log }, null, 2))
console.log(JSON.stringify({ dest, trimStart, seconds: +((tEnd - t0) / 1000 - trimStart).toFixed(1), log }))
