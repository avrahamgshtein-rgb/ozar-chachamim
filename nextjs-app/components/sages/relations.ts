// How a related sage stands to the sage being viewed. A link's `type` alone
// says nothing about which end is which, so the label has to come from the
// type AND the side the current sage is on:
//   teacher      source is the teacher of target
//   student      source is the student of target
//   influence    source influenced target
//   oppose       source disputed target
//   predecessor  source came before target (in an office or a lineage)
// family / colleague / contemporary are symmetric.
// Reading `type` alone is how the Gra's page came to call his own student,
// R. Chaim of Volozhin, "רב".
import { ALL_PERIODS } from '@/lib/types'
import type { ConnectionType, Locale, Period } from '@/lib/types'

export type RelationGroup =
  | 'teachers'
  | 'students'
  | 'family'
  | 'influencedBy'
  | 'influenced'
  | 'peers'
  | 'disputed'
  | 'disputedBy'
  | 'predecessors'
  | 'successors'

/** Most relevant first: lineage, family, intellectual debts, then the rest. */
export const RELATION_ORDER: RelationGroup[] = [
  'teachers', 'students', 'family', 'influencedBy', 'influenced',
  'peers', 'disputed', 'disputedBy', 'predecessors', 'successors',
]

/** Group headings on the viewed sage's page. */
export const RELATION_LABELS: Record<RelationGroup, Record<Locale, string>> = {
  teachers:     { he: 'רבותיו',            en: 'Teachers',                    ru: 'Учителя' },
  students:     { he: 'תלמידיו',           en: 'Students',                    ru: 'Ученики' },
  family:       { he: 'משפחה',             en: 'Family',                      ru: 'Семья' },
  influencedBy: { he: 'הושפע מהם',         en: 'Influenced by',               ru: 'Испытал влияние' },
  influenced:   { he: 'השפיע עליהם',       en: 'Influenced',                  ru: 'Повлиял на' },
  peers:        { he: 'עמיתים ובני דורו',  en: 'Colleagues & contemporaries', ru: 'Коллеги и современники' },
  disputed:     { he: 'חלק עליהם',         en: 'Disputed',                    ru: 'Полемизировал с' },
  disputedBy:   { he: 'חלקו עליו',         en: 'Disputed by',                 ru: 'С ним полемизировали' },
  predecessors: { he: 'קודמיו',            en: 'Predecessors',                ru: 'Предшественники' },
  successors:   { he: 'ממשיכיו',           en: 'Successors',                  ru: 'Преемники' },
}

/** One related sage's relation, as a short tag ("the other one is his …"). */
export const RELATION_ITEM_LABELS: Record<RelationGroup, Record<Locale, string>> = {
  teachers:     { he: 'רבו',          en: 'his teacher',      ru: 'учитель' },
  students:     { he: 'תלמידו',       en: 'his student',      ru: 'ученик' },
  family:       { he: 'בן משפחה',     en: 'family',           ru: 'родственник' },
  influencedBy: { he: 'השפיע עליו',   en: 'influenced him',   ru: 'повлиял на него' },
  influenced:   { he: 'הושפע ממנו',   en: 'influenced by him', ru: 'под его влиянием' },
  peers:        { he: 'בן דורו',      en: 'contemporary',     ru: 'современник' },
  disputed:     { he: 'בר־פלוגתא',    en: 'opponent',         ru: 'оппонент' },
  disputedBy:   { he: 'בר־פלוגתא',    en: 'opponent',         ru: 'оппонент' },
  predecessors: { he: 'קודמו',        en: 'predecessor',      ru: 'предшественник' },
  successors:   { he: 'ממשיכו',       en: 'successor',        ru: 'преемник' },
}

export interface DirectedLink {
  source: string
  target: string
  type: ConnectionType | string
}

/** The group `link`'s other end belongs to, seen from sage `meId`. */
export function relationOf(meId: string, link: DirectedLink): RelationGroup {
  const meIsSource = String(link.source) === String(meId)
  switch (link.type) {
    case 'teacher':     return meIsSource ? 'students' : 'teachers'
    case 'student':     return meIsSource ? 'teachers' : 'students'
    case 'influence':   return meIsSource ? 'influenced' : 'influencedBy'
    case 'oppose':      return meIsSource ? 'disputed' : 'disputedBy'
    case 'predecessor': return meIsSource ? 'successors' : 'predecessors'
    case 'family':      return 'family'
    default:            return 'peers' // colleague, contemporary, anything unknown
  }
}

export interface RelatedPerson {
  id: string
  label: string
  period: Period
  birth_year?: number
}

export interface RelatedGroup<T extends RelatedPerson> {
  group: RelationGroup
  people: T[]
}

/**
 * The sages linked to `meId`, grouped by relation in RELATION_ORDER, each
 * group in chronological order. A sage linked twice (a teacher link and an
 * influence link, say) is listed once, under the more relevant relation.
 */
export function groupRelated<T extends RelatedPerson>(
  meId: string,
  links: DirectedLink[],
  lookup: (id: string) => T | undefined,
): RelatedGroup<T>[] {
  const best = new Map<string, RelationGroup>()
  for (const link of links) {
    const s = String(link.source)
    const t = String(link.target)
    if (s !== meId && t !== meId) continue
    const otherId = s === meId ? t : s
    if (otherId === meId || !lookup(otherId)) continue
    const group = relationOf(meId, link)
    const prev = best.get(otherId)
    if (!prev || RELATION_ORDER.indexOf(group) < RELATION_ORDER.indexOf(prev)) best.set(otherId, group)
  }
  const byGroup = new Map<RelationGroup, T[]>()
  for (const [id, group] of best) {
    const person = lookup(id)!
    if (!byGroup.has(group)) byGroup.set(group, [])
    byGroup.get(group)!.push(person)
  }
  const chrono = (a: T, b: T) =>
    ALL_PERIODS.indexOf(a.period) - ALL_PERIODS.indexOf(b.period) ||
    (a.birth_year ?? 9999) - (b.birth_year ?? 9999) ||
    a.label.localeCompare(b.label, 'he')
  return RELATION_ORDER
    .filter(g => byGroup.has(g))
    .map(g => ({ group: g, people: byGroup.get(g)!.sort(chrono) }))
}
