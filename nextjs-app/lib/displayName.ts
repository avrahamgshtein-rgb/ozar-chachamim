// Many sage labels are essay titles rather than names: the spreadsheet row was
// named after the research paper, so the label carries the paper's subtitle
// and sometimes the life span:
//   "הרב חיים קניבסקי (1928–2022) – 'שר התורה': פסיקה, שקידה והשפעה בציבור הליטאי"
// Every surface that shows a name in a tight spot (graph labels, chips, lists,
// breadcrumbs) should use `displayName`; the full label stays for headings.
// The label itself is never rewritten here: it's the join key the research
// pipeline resolves names against.

const DASH = /\s+[–—-]\s+/
const YEARS_PAREN = /\s*\([^)]*\d[^)]*\)/g
// A tail that opens with a title is the person's full name, not a subtitle:
// "הריבב״ן – רבי יהודה בן בנימין הענו".
const TITLE_START = /^(?:רבי|רבנו|רבינו|רב|הרב|ר[׳'])\s/

export interface LabelParts {
  /** The name alone: no subtitle, no "(1928–2022)". */
  name: string
  /** The essay subtitle after the dash, if any. */
  tagline: string | null
  /** A full name given after an acronym ("רבי יהודה בן בנימין הענו"), if any. */
  fullName: string | null
}

export function labelParts(label: string | undefined | null): LabelParts {
  const raw = (label ?? '').trim()
  const [head, ...rest] = raw.split(DASH)
  const name = head.replace(YEARS_PAREN, '').trim() || raw
  const tail = rest.join(' – ').trim()
  if (!tail) return { name, tagline: null, fullName: null }
  if (TITLE_START.test(tail)) return { name, tagline: null, fullName: tail }
  return { name, tagline: tail, fullName: null }
}

/** The sage's name without the essay subtitle or year span. */
export function displayName(label: string | undefined | null): string {
  return labelParts(label).name
}

/** `displayName`, cut to `max` characters with an ellipsis for very tight spots. */
export function displayNameShort(label: string | undefined | null, max = 26): string {
  const name = displayName(label)
  return name.length > max ? name.slice(0, max - 1).trimEnd() + '…' : name
}
