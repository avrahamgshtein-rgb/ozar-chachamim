// What the riddle page shows, decided on the server from the corpus (lib/riddle.ts holds the rules):
// the pool of sages a riddle may be about, today's pick, its clues in the page's language, and the list of
// every roster sage the player can guess from.
import { getAllConnections, getAllSages, getSageById } from './serverData'
import { localizeSage, translatedFields } from './serverDataTranslator'
import { dayNumber } from './today'
import { todayFeature } from './todayServer'
import { labelParts } from './displayName'
import { clipWords } from './ogText'
import { getSefaria } from './sefaria'
import { wikiLinks } from './wikipedia'
import { hasQuiz } from './quiz'
import { towerPath } from './tower'
import { formatYearRangeFor } from './utils'
import type { Locale, Sage } from './types'
import {
  buildLinkIndex, factsOf, fameScore, riddleClues, riddleIdOn, riddleNumber, riddlePool,
  type RiddleCandidate, type RiddleContext, type RiddlePayload,
} from './riddle'

/** A bio for the end screen: whole sentences while they fit in `max` characters, else cut at a word. */
export function clipBio(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const stop = Math.max(...['. ', '! ', '? '].map(p => flat.lastIndexOf(p, max - 1)))
  return stop > max * 0.5 ? flat.slice(0, stop + 1) : clipWords(flat, max)
}

let cache: { ctx: RiddleContext; pool: string[] } | null = null

function state() {
  if (cache) return cache
  const sages = getAllSages()
  const byId = new Map(sages.map(s => [s.id, s]))
  const links = buildLinkIndex(getAllConnections(), new Set(byId.keys()))
  const fame = (id: string) => {
    const sefaria = getSefaria(id)
    const wiki = wikiLinks(id, sefaria)
    return fameScore({ degree: links.degree.get(id) ?? 0, hebrewArticle: !!wiki.he, englishArticle: !!wiki.en, works: sefaria?.total ?? 0 })
  }
  const ctx: RiddleContext = { byId, links, localize: localizeSage, fame }
  cache = { ctx, pool: riddlePool(sages, ctx) }
  return cache
}

export function riddleContext(): RiddleContext {
  return state().ctx
}

/** Ids of the sages a riddle may be about, in id order. */
export function riddlePoolIds(): string[] {
  return state().pool
}

export interface RiddleToday {
  date: Date
  /** The Israeli day (changes at midnight there). */
  day: number
  number: number
  sage: Sage
  /** The sage the Today page features the same day: the riddle is never he. */
  featuredId: string
}

/** The riddle of the day `date` falls on in Israel. */
export function riddleOn(date: Date = new Date()): RiddleToday {
  const day = dayNumber(date)
  const featuredId = todayFeature(date).featured.id
  const pool = riddlePoolIds()
  const id = riddleIdOn(pool, day, featuredId) ?? pool[0]
  return { date, day, number: riddleNumber(day), sage: getSageById(id)!, featuredId }
}

/** Everything the game needs for `locale`: the clues, the sages to guess from, and the card for the end screen. */
export function riddlePayload(locale: Locale, date: Date = new Date()): RiddlePayload {
  const { ctx } = state()
  const today = riddleOn(date)
  const shown = localizeSage(today.sage, locale)
  const linked = ctx.links.linked.get(today.sage.id) ?? new Set<string>()
  const candidates: RiddleCandidate[] = [...ctx.byId.values()].map(s => ({
    ...factsOf(s),
    name: labelParts(localizeSage(s, locale).label).name,
    linked: linked.has(s.id),
  }))
  const { name, tagline } = labelParts(shown.label)
  const bioIsLocal = locale === 'he' || translatedFields(today.sage.id, locale).has('bio')
  const id = today.sage.id
  return {
    day: today.day,
    number: today.number,
    answer: id,
    clues: riddleClues(today.sage, ctx, locale),
    candidates,
    card: {
      id,
      name,
      tagline,
      years: formatYearRangeFor(locale, shown.birth_year, shown.death_year, shown.date_precision),
      period: shown.period,
      bio: bioIsLocal ? clipBio(shown.bio || shown.core_concept || '', 260) : '',
      sageHref: `/${locale}/sage/${id}`,
      towerHref: towerPath(locale, id),
      quizHref: hasQuiz(id, locale) ? `/${locale}/sage/${id}#quiz` : null,
    },
  }
}
