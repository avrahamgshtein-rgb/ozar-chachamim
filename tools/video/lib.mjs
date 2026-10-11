// Shared pieces of the video pipeline: a caption/cursor/title-card overlay that
// is injected into the page being recorded, and the helpers that drive it.
//
// The overlay lives in the page (not in ffmpeg) on purpose: the browser shapes
// Hebrew and Arabic-script text correctly, uses the site's own fonts, and the
// result needs no font or text-layout support in the video encoder.
//
// Playwright is not a dependency of this repo. Point PW_DIR at any folder whose
// node_modules contains it (see record-intro.mjs).

import { createRequire } from 'node:module'

export function loadPlaywright() {
  const dir = process.env.PW_DIR
  if (!dir) throw new Error('Set PW_DIR to a folder whose node_modules contains playwright')
  return createRequire(dir.endsWith('/') ? dir : dir + '/')('playwright')
}

// Unset: Playwright's own Chromium. Set CHROME to use another browser binary.
export const CHROME = process.env.CHROME || undefined

/**
 * Runs in every document of the recorded page (context.addInitScript). Nothing
 * is added to the DOM until the overlay is first used, which is after the page
 * has hydrated, so it can't disturb React.
 */
export function installOverlay() {
  // The veil: a fade through black that hides page loads between scenes. It is
  // a class on <html> plus an adopted stylesheet, never a DOM node, so React's
  // hydration doesn't see it. sessionStorage carries it across a full navigation.
  try {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync('html.vo-veil{background:#0a0806 !important} body{transition:opacity .55s ease} html.vo-veil body{opacity:0 !important}')
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
    if (sessionStorage.getItem('vo-veil') === '1') document.documentElement.classList.add('vo-veil')
  } catch (e) { /* storage or CSSStyleSheet unavailable: no veil */ }
  if (window.__vo) return
  const S = { root: null, cap: null, cursor: null, card: null, capTimer: 0 }
  const CSS = `
  #vo-root{position:fixed;inset:0;pointer-events:none;z-index:2147483647;
    font-family:var(--font-heebo),Heebo,system-ui,sans-serif}
  #vo-cap{position:absolute;left:50%;bottom:calc(118px * var(--vo-s,1));width:max-content;
    transform:translate(-50%,14px);max-width:80%;padding:calc(16px * var(--vo-s,1)) calc(34px * var(--vo-s,1));
    border-radius:20px;background:rgba(10,8,6,.88);border:1.5px solid rgba(212,168,67,.6);
    color:#f8eed8;font-size:calc(40px * var(--vo-s,1));font-weight:600;line-height:1.38;text-align:center;
    opacity:0;transition:opacity .5s ease,transform .5s ease;
    box-shadow:0 14px 44px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.4)}
  #vo-cap.on{opacity:1;transform:translate(-50%,0)}
  #vo-cap .sub{display:block;font-size:.58em;font-weight:400;color:#e0b94f;margin-top:.3em;letter-spacing:.01em}
  #vo-cursor{position:absolute;left:0;top:0;width:34px;height:34px;opacity:0;margin:-4px 0 0 -4px;
    filter:drop-shadow(0 3px 5px rgba(0,0,0,.65));transition:opacity .25s}
  #vo-cursor.on{opacity:1}
  .vo-ripple{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;
    border:3px solid #e8c260;animation:vo-rip .6s ease-out forwards}
  @keyframes vo-rip{from{transform:scale(.4);opacity:.95}to{transform:scale(3.4);opacity:0}}
  #vo-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:calc(22px * var(--vo-s,1));text-align:center;color:#f8eed8;opacity:0;transition:opacity .8s ease;
    background:radial-gradient(ellipse at 50% 38%,#33250d 0%,#150f07 48%,#0a0806 80%)}
  #vo-card.on{opacity:1}
  #vo-card img{width:calc(210px * var(--vo-s,1));height:calc(210px * var(--vo-s,1));border-radius:50%;
    box-shadow:0 0 0 3px rgba(232,194,96,.55),0 0 90px rgba(232,194,96,.35);
    transform:scale(.9);transition:transform 2.4s ease}
  #vo-card.on img{transform:scale(1)}
  #vo-card h1{margin:0;font-family:var(--font-frank-ruhl),'Frank Ruhl Libre',serif;font-weight:900;
    font-size:calc(124px * var(--vo-s,1));line-height:1.05;color:#ecc765;text-shadow:0 0 50px rgba(232,194,96,.35)}
  #vo-card p{margin:0;font-size:calc(42px * var(--vo-s,1));font-weight:400;color:#f1e4c6;max-width:72%;line-height:1.4}
  #vo-card .url{margin-top:calc(14px * var(--vo-s,1));font-size:calc(34px * var(--vo-s,1));font-weight:600;color:#ecc765;
    letter-spacing:.02em;direction:ltr;border:1.5px solid rgba(232,194,96,.55);border-radius:999px;
    padding:calc(10px * var(--vo-s,1)) calc(34px * var(--vo-s,1));background:rgba(10,8,6,.55)}
  #vo-card .small{font-size:calc(30px * var(--vo-s,1));color:#bfae86}
  `
  const ARROW = '<svg viewBox="0 0 34 34" width="34" height="34"><path d="M5 3 L5 26 L11 20.5 L15.5 30 L20 28 L15.6 18.6 L24 18 Z" fill="#fff" stroke="#14100a" stroke-width="2" stroke-linejoin="round"/></svg>'

  function ensure() {
    if (S.root) return
    const st = document.createElement('style')
    st.textContent = CSS
    const root = document.createElement('div')
    root.id = 'vo-root'
    root.innerHTML = '<div id="vo-card"></div><div id="vo-cap" dir="auto"></div><div id="vo-cursor">' + ARROW + '</div>'
    document.documentElement.append(st, root)
    S.root = root
    S.card = root.querySelector('#vo-card')
    S.cap = root.querySelector('#vo-cap')
    S.cursor = root.querySelector('#vo-cursor')
  }

  document.addEventListener('mousemove', e => {
    ensure()
    S.cursor.classList.add('on')
    S.cursor.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'
  }, true)
  document.addEventListener('mousedown', e => {
    ensure()
    const r = document.createElement('span')
    r.className = 'vo-ripple'
    r.style.left = e.clientX + 'px'
    r.style.top = e.clientY + 'px'
    S.root.append(r)
    setTimeout(() => r.remove(), 700)
  }, true)

  window.__vo = {
    scale(v) { ensure(); document.documentElement.style.setProperty('--vo-s', String(v)) },
    veil(on) {
      try {
        if (on) { sessionStorage.setItem('vo-veil', '1'); document.documentElement.classList.add('vo-veil') }
        else { sessionStorage.removeItem('vo-veil'); document.documentElement.classList.remove('vo-veil') }
      } catch (e) { /* no veil */ }
    },
    cap(text, sub, lift) {
      ensure()
      S.cap.style.bottom = lift ? 'calc(' + lift + 'px * var(--vo-s,1))' : ''
      const swap = () => {
        S.cap.innerHTML = ''
        S.cap.append(document.createTextNode(text))
        if (sub) {
          const s = document.createElement('span')
          s.className = 'sub'
          s.textContent = sub
          S.cap.append(s)
        }
        S.cap.classList.add('on')
      }
      if (S.cap.classList.contains('on')) {
        S.cap.classList.remove('on')
        clearTimeout(S.capTimer)
        S.capTimer = setTimeout(swap, 380)
      } else swap()
    },
    capOff() { ensure(); S.cap.classList.remove('on') },
    card(o) {
      ensure()
      S.cap.classList.remove('on')
      S.card.innerHTML = ''
      if (o.img) { const i = document.createElement('img'); i.src = o.img; S.card.append(i) }
      for (const [tag, cls, text] of o.lines) {
        const el = document.createElement(tag)
        if (cls) el.className = cls
        el.textContent = text
        S.card.append(el)
      }
      requestAnimationFrame(() => requestAnimationFrame(() => S.card.classList.add('on')))
    },
    cardOff() { ensure(); S.card.classList.remove('on') },
  }
}

/** A recorder bound to one page: timing, smooth cursor, captions. */
export function makeDriver(page) {
  const sleep = ms => page.waitForTimeout(ms)
  /** Every caption/card shown or hidden, with wall-clock time: the subtitle track is built from it. */
  const cues = []
  const pos = { x: 960, y: 540 }
  const run = (fn, arg) => page.evaluate(fn, arg).catch(() => {})

  // Time-based, not step-based: each CDP mouse move costs 15-30 ms on a busy
  // box, so a fixed step count with a sleep between steps runs about twice as long.
  async function glide(x, y, ms = 700) {
    const x0 = pos.x, y0 = pos.y
    const start = Date.now()
    for (;;) {
      const t = Math.min(1, (Date.now() - start) / ms)
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e)
      if (t >= 1) break
    }
    pos.x = x
    pos.y = y
  }
  async function center(loc) {
    const b = await loc.boundingBox()
    if (!b) throw new Error('no box for locator')
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  }
  async function pointAt(loc, ms = 800) {
    const c = await center(loc)
    await glide(c.x, c.y, ms)
  }
  async function click(loc, ms = 800) {
    await pointAt(loc, ms)
    await sleep(160)
    await page.mouse.down()
    await sleep(70)
    await page.mouse.up()
  }
  /** Wheel-scroll `px` pixels (negative = up) over `ms` milliseconds. */
  async function scroll(px, ms = 3000, step = 36) {
    const n = Math.max(1, Math.round(Math.abs(px) / step))
    const d = px / n
    for (let i = 0; i < n; i++) {
      await page.mouse.wheel(0, d)
      await sleep(ms / n)
    }
  }
  async function typeSlow(text, per = 150) {
    for (const ch of text) {
      await page.keyboard.type(ch)
      await sleep(per)
    }
  }
  /** Re-places the cursor after a full navigation wiped the overlay. */
  const park = () => page.mouse.move(pos.x + 1, pos.y + 1)
  const cap = (t, sub, lift) => {
    cues.push({ at: Date.now(), text: t, sub: sub || '' })
    return run(([a, b, c]) => window.__vo.cap(a, b, c), [t, sub, lift])
  }
  const capOff = () => {
    cues.push({ at: Date.now(), off: true })
    return run(() => window.__vo.capOff())
  }
  const card = o => {
    cues.push({ at: Date.now(), text: o.lines.filter(l => l[0] !== 'div').map(l => l[2]).join(' - '), sub: '' })
    return run(arg => window.__vo.card(arg), o)
  }
  const cardOff = () => {
    cues.push({ at: Date.now(), off: true })
    return run(() => window.__vo.cardOff())
  }
  const scale = v => run(s => window.__vo.scale(s), v)
  const veilOn = async () => { await run(() => window.__vo.veil(true)); await sleep(650) }
  const veilOff = () => run(() => window.__vo.veil(false))

  return { sleep, glide, pointAt, click, scroll, typeSlow, park, cap, capOff, card, cardOff, scale, veilOn, veilOff, cues, pos }
}
