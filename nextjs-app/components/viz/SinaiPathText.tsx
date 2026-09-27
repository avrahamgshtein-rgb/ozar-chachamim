// Strings and line styles shared by the "הדרך לסיני" view (SinaiPath.tsx,
// client) and its sage-page card (SinaiPathCard.tsx, server). Kept out of both
// so the server card doesn't import a client module. No React here.

import type { Locale } from '@/lib/types'
import type { LineageKind } from './lineage'
import type { SinaiStepKind } from '@/lib/sinaiPath'

type T = Record<Locale, string>

export const SP = {
  title:        { he: 'הדרך לסיני', en: 'The Road to Sinai', ru: 'Путь к Синаю' },
  mountain:     { he: 'הר סיני', en: 'Mount Sinai', ru: 'Гора Синай' },
  givingTorah:  { he: 'מתן תורה', en: 'The Giving of the Torah', ru: 'Дарование Торы' },
  avot:         {
    he: '״משה קיבל תורה מסיני ומסרה ליהושע״ (אבות א, א)',
    en: '“Moses received the Torah at Sinai and handed it on to Joshua” (Avot 1:1)',
    ru: '«Моше получил Тору на Синае и передал её Йеошуа» (Авот 1:1)',
  },
  chainHeading: { he: 'שלשלת הדורות לפי הרמב״ם', en: 'The generations, as the Rambam counts them', ru: 'Поколения по счёту Рамбама' },
  fromArchive:  { he: 'מכאן: קשרים מתועדים במאגר', en: 'From here: links recorded in the archive', ru: 'Дальше: связи, записанные в архиве' },
  joinsHere:    { he: 'כאן מצטרפת הדרך לשלשלת', en: 'The path joins the chain here', ru: 'Здесь путь входит в цепь' },
  alongside:    { he: 'ובאותו דור:', en: 'Alongside:', ru: 'В том же поколении:' },
  fullView:     { he: 'לדרך המלאה', en: 'Open the full path', ru: 'Весь путь' },
  openCard:     { he: 'פתח כרטיס', en: 'Open card', ru: 'Открыть карточку' },
  direct:       { he: 'קבלה ישירה לכל אורך הדרך', en: 'Direct transmission all the way', ru: 'Прямая передача на всём пути' },
  honesty: {
    he: 'קווים מקווקווים הם השראה ולא קבלה ישירה. שלשלת הדורות מסיני עד רב אשי היא לפי הקדמת הרמב״ם למשנה תורה. מתחתיה, הדרך נבחרה מבין הקשרים המתועדים במאגר, בהעדפה לקשרי רב ותלמיד ולקפיצות קצרות בזמן.',
    en: 'Dashed lines are inspiration, not direct transmission. The generations from Sinai to Rav Ashi follow the Rambam’s introduction to the Mishneh Torah. Below them, the route is chosen from the links recorded in the archive, preferring teacher and student and the shortest leaps in time.',
    ru: 'Пунктир означает вдохновение, а не прямую передачу. Поколения от Синая до Рав Аши даны по предисловию Рамбама к «Мишне Тора». Ниже путь выбран из связей, записанных в архиве: предпочтение отдаётся учителям и ученикам и самым коротким разрывам во времени.',
  },
} satisfies Record<string, T>

/** Legend entries: the line style and its plain-language meaning. */
export const LEGEND: { kind: SinaiStepKind; label: T }[] = [
  { kind: 'chain',       label: { he: 'שלשלת הקבלה לפי הרמב״ם', en: 'The chain, as the Rambam lists it', ru: 'Цепь передачи по Рамбаму' } },
  { kind: 'teacher',     label: { he: 'רב ותלמיד: קבלה ישירה', en: 'Teacher and student: direct transmission', ru: 'Учитель и ученик: прямая передача' } },
  { kind: 'influence',   label: { he: 'השראה, לא קבלה ישירה', en: 'Inspiration, not direct transmission', ru: 'Вдохновение, не прямая передача' } },
  { kind: 'predecessor', label: { he: 'רצף הנהגה', en: 'Succession in office', ru: 'Преемственность' } },
  { kind: 'family',      label: { he: 'משפחה', en: 'Family', ru: 'Семья' } },
]

/** How a sage received from the one above, from the lower sage's side. [masculine, feminine] in Hebrew. */
const RECEIVED: Record<LineageKind, { he: [string, string]; en: string; ru: string }> = {
  teacher:     { he: ['תלמידו של ', 'תלמידתו של '], en: 'Student of ', ru: 'Учился(-ась) у: ' },
  influence:   { he: ['הושפע מ', 'הושפעה מ'], en: 'Inspired by ', ru: 'Под влиянием: ' },
  predecessor: { he: ['ממשיך דרכו של ', 'ממשיכת דרכו של '], en: 'Successor of ', ru: 'Преемник: ' },
  family:      { he: ['בן משפחתו של ', 'בת משפחתו של '], en: 'Relative of ', ru: 'Родственник: ' },
}

export function receivedFrom(kind: LineageKind, above: string, locale: Locale, feminine = false): string {
  const r = RECEIVED[kind]
  return (locale === 'he' ? r.he[feminine ? 1 : 0] : r[locale]) + above
}

/** "Generation 12" of the Rambam's forty. */
export function genLabel(gen: number, locale: Locale): string {
  return locale === 'he' ? `דור ${gen}` : locale === 'en' ? `Generation ${gen}` : `${gen}-е поколение`
}

/** A leap across the centuries, said as the approximation it is. */
export function leapLabel(c: number, locale: Locale): string {
  if (locale === 'he') return c === 1 ? 'קפיצה של כמאה שנה' : c === 2 ? 'קפיצה של כמאתיים שנה' : `קפיצה של כ־${c} מאות שנה`
  if (locale === 'en') return c === 1 ? 'a leap of about a century' : `a leap of about ${c} centuries`
  return c === 1 ? 'разрыв около века' : `разрыв около ${c} веков`
}

/** Russian plural: 1 связь, 2 связи, 5 связей. */
export function ruPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many
}

export function generationsLabel(n: number, locale: Locale): string {
  if (locale === 'he') return n === 1 ? 'דור אחד' : `${n} דורות`
  if (locale === 'en') return n === 1 ? '1 generation' : `${n} generations`
  return `${n} ${ruPlural(n, 'поколение', 'поколения', 'поколений')}`
}

export function linksLabel(n: number, locale: Locale): string {
  if (locale === 'he') return n === 1 ? 'קשר אחד במאגר' : `${n} קשרים במאגר`
  if (locale === 'en') return n === 1 ? '1 archive link' : `${n} archive links`
  return `${n} ${ruPlural(n, 'связь', 'связи', 'связей')} в архиве`
}

export function inspirationsLabel(n: number, locale: Locale): string {
  if (locale === 'he') return n === 1 ? 'כולל קשר השראה אחד' : `כולל ${n} קשרי השראה`
  if (locale === 'en') return n === 1 ? 'includes 1 inspiration link' : `includes ${n} inspiration links`
  return `включая ${n} ${ruPlural(n, 'связь', 'связи', 'связей')} вдохновения`
}

/*
 * Line styles, one class per link kind, for vertical river segments
 * (.sp-seg) and horizontal legend swatches (.sp-sw). Colours follow the
 * lineage tree's legend (GenealogyTree.tsx) so the two views read alike; the
 * Rambam's chain is a channel with two banks, the one style no archive link
 * uses. Everything reads theme variables, so the light theme needs no JS.
 */
export const SINAI_LINE_CSS = `
.sp-lines { --sp-gold: var(--gold-400); --sp-chain: rgb(var(--gold-500-rgb) / .8); --sp-chain-fill: rgb(var(--gold-500-rgb) / .14);
  --sp-infl: rgb(var(--ink-300-rgb) / .9); --sp-pred: #4fb3a9; --sp-family: #d98ca0; }
[data-theme='light'] .sp-lines { --sp-pred: #1d7a70; --sp-family: #a4466a; --sp-infl: rgb(var(--ink-400-rgb)); --sp-chain-fill: rgb(var(--gold-500-rgb) / .12); }
.sp-lines .sp-seg { position: absolute; left: 50%; transform: translateX(-50%); }
.sp-lines .sp-seg.k-sinai, .sp-lines .sp-seg.k-chain { width: 8px; border-inline: 1.5px solid var(--sp-chain); background: var(--sp-chain-fill); }
.sp-lines .sp-seg.k-sinai { border-color: var(--sp-gold); background: rgb(var(--gold-400-rgb) / .28); box-shadow: 0 0 12px rgb(var(--gold-400-rgb) / .35); }
.sp-lines .sp-seg.k-teacher { width: 3px; border-radius: 2px; background: var(--sp-gold); box-shadow: 0 0 8px rgb(var(--gold-400-rgb) / .45); }
.sp-lines .sp-seg.k-influence { width: 2px; background: repeating-linear-gradient(to bottom, var(--sp-infl) 0 6px, transparent 6px 11px); }
.sp-lines .sp-seg.k-predecessor { width: 2px; background: repeating-linear-gradient(to bottom, var(--sp-pred) 0 9px, transparent 9px 12px, var(--sp-pred) 12px 14px, transparent 14px 17px); }
.sp-lines .sp-seg.k-family { width: 3px; background: radial-gradient(circle, var(--sp-family) 1.3px, transparent 1.6px) center top / 3px 6px repeat-y; }
.sp-lines .sp-sw { display: inline-block; flex-shrink: 0; width: 26px; height: 8px; vertical-align: middle; }
.sp-lines .sp-sw.k-chain, .sp-lines .sp-sw.k-sinai { height: 8px; border-block: 1.5px solid var(--sp-chain); background: var(--sp-chain-fill); }
.sp-lines .sp-sw.k-teacher { background: linear-gradient(var(--sp-gold), var(--sp-gold)) center / 100% 3px no-repeat; }
.sp-lines .sp-sw.k-influence { background: repeating-linear-gradient(to right, var(--sp-infl) 0 6px, transparent 6px 10px) center / 100% 2px no-repeat; }
.sp-lines .sp-sw.k-predecessor { background: repeating-linear-gradient(to right, var(--sp-pred) 0 8px, transparent 8px 11px, var(--sp-pred) 11px 13px, transparent 13px 16px) center / 100% 2px no-repeat; }
.sp-lines .sp-sw.k-family { background: radial-gradient(circle, var(--sp-family) 1.3px, transparent 1.6px) left center / 6px 3px repeat-x; }
`
