// What the Today page and its status image show, decided on the server from the corpus:
// the sages whose hillula falls today (lib/today.ts) or, when none does, the sage of the day.
import { getAllSages, getSageById } from './serverData'
import { localizeSage } from './serverDataTranslator'
import { dayNumber, hebrewDate, hillulotOn, sageOfTheDay, YAHRZEITS, type HebrewDate } from './today'
import type { Sage } from './types'

export interface TodayFeature {
  date: Date
  hebrew: HebrewDate
  /** Sages whose hillula is today, in id order. */
  hillulot: Sage[]
  /** The sage the page and the image lead with: the first hillula, else the sage of the day. */
  featured: Sage
  kind: 'hillula' | 'daily'
}

/**
 * Sages a daily pick may land on: those with a research paper, so the page has something to read, and with a
 * name in English and Russian, so every language shows the same sage under a name its readers can read.
 */
function dailyPool(): string[] {
  const withResearch = getAllSages().filter(s => s.has_research)
  const named = withResearch.filter(s => localizeSage(s, 'en').label !== s.label && localizeSage(s, 'ru').label !== s.label)
  return (named.length > 0 ? named : withResearch).map(s => s.id)
}

export function todayFeature(date: Date = new Date()): TodayFeature {
  const hebrew = hebrewDate(date)
  const known = new Set(getAllSages().map(s => s.id))
  const hillulot = hillulotOn(hebrew, known).map(id => getSageById(id)).filter((s): s is Sage => Boolean(s))
  if (hillulot.length > 0) return { date, hebrew, hillulot, featured: hillulot[0], kind: 'hillula' }
  const id = sageOfTheDay(dailyPool(), dayNumber(date)) ?? getAllSages()[0].id
  return { date, hebrew, hillulot, featured: getSageById(id)!, kind: 'daily' }
}

export interface UpcomingHillula {
  date: Date
  hebrew: HebrewDate
  sage: Sage
  inDays: number
}

/** The hillulot of the coming days (tomorrow onward), nearest first. */
export function upcomingHillulot(from: Date = new Date(), days = 30): UpcomingHillula[] {
  const known = new Set(getAllSages().map(s => s.id))
  const out: UpcomingHillula[] = []
  for (let i = 1; i <= days; i++) {
    const date = new Date(from.getTime() + i * 86_400_000)
    const hebrew = hebrewDate(date)
    for (const id of hillulotOn(hebrew, known)) {
      const sage = getSageById(id)
      if (sage) out.push({ date, hebrew, sage, inDays: i })
    }
  }
  return out
}

/** The paper's own words for a sage's date of death, if the data file has them. */
export function yahrzeitOf(id: string) {
  return YAHRZEITS[id] ?? null
}
