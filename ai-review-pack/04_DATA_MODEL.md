# 04 — Data Model

## 1. Domain types — `lib/types.ts`

```ts
type Period = 'patriarchs' | 'exodus' | 'judges' | 'kings' | 'second-temple'
            | 'tannaim' | 'amoraim' | 'geonim' | 'rishonim' | 'acharonim' | 'modern'

type Region = 'ashkenaz' | 'east-europe' | 'tsarfat' | 'provence' | 'sefarad'
            | 'italy' | 'north-africa' | 'mizrach' | 'eretz-israel' | 'other'

type ConnectionType = 'student' | 'teacher' | 'colleague' | 'influence'
                    | 'oppose' | 'predecessor' | 'contemporary' | 'family'

type Locale = 'he' | 'en' | 'ru'
type Tab    = 'graph' | 'map' | 'traditions' | 'ideas' | 'timeline' | 'genealogy' | 'about'

interface Sage {
  id: string
  label: string                 // Hebrew name — canonical
  name_en?: string
  period: Period
  region?: Region
  location?: string             // free text, e.g. "טולדו"
  field?: string                // free text, MAY BE COMMA-SEPARATED
  bio?: string
  core_concept?: string
  birth_year?: number
  death_year?: number
  tags?: string[]
  migration_path?: { from: string; to: string; intermediate?: string[]; years?: string }
  coordinates?: { lat: number; lng: number }
  spotify_url?: string
  works?: string[]
}

interface Connection {
  source: string; target: string; type: ConnectionType
  source_name?: string; target_name?: string
}

interface Filters { period: Period[]; region: Region[]; field: string[]; searchQuery: string }
```

Alongside the types, the same file exports six lookup tables:
`ALL_PERIODS`, `ERA_LABELS` (Period × Locale), `ERA_COLORS`, `REGION_LABELS`,
`REGION_COLORS`, `CONNECTION_LABELS`, `TAB_META`.

`ERA_COLORS` and `REGION_COLORS` **duplicate** the `era.*` and `region.*` colour scales in
`tailwind.config.ts`. The two lists must be kept in sync by hand, and today they only partly
are: Tailwind defines seven `era.*` colours, `ERA_COLORS` defines eleven.

---

## 2. The static dataset — `public/data.json`

422 nodes, 1,624 links. Node keys as they actually appear in the file:

```
id, label, era, era_key, era_label, field, location, bio,
central_idea, tags, chapter_type, has_research, spotify_url
```

Note the mismatch with the `Sage` interface. `lib/serverData.ts::mapNode()` and
`lib/supabase.ts::fetchLocalGraphData()` each translate it:

| JSON key | → `Sage` field |
|---|---|
| `era_key` | `period` (defaulting to `'modern'` when absent) |
| `central_idea` | `core_concept` |
| `tags` (comma-separated **string**) | `tags` (`string[]`, split on `,`) |
| `era`, `era_label`, `chapter_type`, `has_research` | **dropped** |

Neither mapper reads `region`, `birth_year`, `death_year`, `coordinates`, `migration_path`
or `works` — so any sage loaded from `data.json` has those fields `undefined`. Those fields
only ever arrive from Supabase or from a supplement/patch file. `formatYearRange()` and the
map's coordinate logic must cope with that.

### Supplement layer

| file | size | role |
|---|---|---|
| `public/data-ancient.json` | 4 KB | biblical-era figures (patriarchs, Exodus, judges, kings) |
| `public/data-supplement.json` | 4 KB | major figures missing from the CSV master (Rashi, Hillel…) |
| `public/data-supplement-2.json` | 22 KB | further additions |
| `public/data-research-links.json` | 1 KB | links tying research documents to sages |
| `public/data-patch.json` | 2 KB | field-level patches, shallow-merged by sage id |

**Merge precedence, both client and server:** a node from a supplement is added *only if its
`id` is not already present*. Links are appended **unconditionally, with no de-duplication and
no check that both endpoints exist.** A link pointing at a missing node is possible.

### Locale overlay

`public/i18n/sages.en.json` (24 KB), `sages.ru.json` (40 KB) — `Record<sageId, {label?, bio?,
core_concept?, field?, location?}>`, spread over the sage record. Hebrew is canonical and has
no overlay file. When a sage has no overlay entry, `applyOverlay()` falls back to `name_en`
as the label if one exists, otherwise leaves Hebrew text in an English/Russian UI.

### Research documents

`public/research/` — 351 JSON files, ~12 MB total, named `{sageId}.json` and optionally
`{sageId}.{locale}.json`. Shape:

```ts
interface ResearchDoc { title: string; source_file: string; word_count: number; content: string }
```

Served two ways: client-side via `GET /api/research/[id]?locale=…` (24-hour cache header),
and server-side via `lib/serverData.ts::getResearchDocs()`. Both read the file with
`fs/promises` and `join(process.cwd(), 'public', 'research', `${id}.json`)`.

---

## 3. Supabase

Accessed through **views**, not base tables.

| view / table | read by | columns used |
|---|---|---|
| `sages_with_stats` | `fetchSages`, `fetchSageById`, `searchSages`, `fetchSageStats` | see below |
| `connections_with_names` | `fetchConnections`, `fetchSageConnections` | `source_id`/`source`, `target_id`/`target`, `connection_type`/`type`, `source_name`, `target_name` |
| `research_content` | `fetchResearchContent` | `sage_id`, `content` |
| `usage_periods` | `app/api/chat/route.ts` | `question_limit`, `questions_used`, `questions_reserved`, `period_end`, `user_id` |
| `anonymous_sessions` | `app/api/chat/route.ts` (service role) | `session_token_hash`, `questions_limit`, `questions_used`, `questions_reserved`, `linked_user_id`, `retention_expires_at` |
| `chat_sessions`, `chat_messages` | chat persistence (see route) | — |

### Schema drift is handled in application code

`mapSageRow()` accepts either column vocabulary for the same concept:

```
location  ??  region
field     ??  primary_field
bio       ??  summary
era       ??  period  ??  era_key      (then normalised through ERA_MAP)
tags      : string[] OR comma-separated string
```

and the connection mapper accepts `source_id ?? source`, `target_id ?? target`,
`connection_type ?? type`. This means **nobody knows which schema is actually deployed**;
the code is written to survive either. That is a finding, not a feature.

### The fallback guard

```ts
if (connections.length < 100 || sages.length < 300) { … prefer /data.json … }
```

Two magic numbers decide which of two datasets the entire application renders. The comment in
`lib/supabase.ts` says Supabase "still carries the old sparse connection set", and the comment
in `AppShell.tsx` says the fallback "keeps parity with Vercel". Read together, they imply the
production site is normally running on `data.json`, and the Supabase queries are a round-trip
whose result is usually discarded.

Note also that the counts disagree across the codebase. `lib/supabase.ts`'s comment says
"363 sages, 450 typed connections"; `lib/serverData.ts`'s comment says "409 sages"; the file
on disk has **422 nodes and 1,624 links**; `components/about/AboutContent.tsx` hardcodes
`422` and `1,624` as display statistics (lines 145, 149) plus "423 documents across 309
sages" (line 217). The About numbers currently match the data file — but they are literals in
JSX, not derived from it, so they will silently drift the next time the dataset changes. The
stale comments already have.

---

## 4. Auth and quota model

```
anonymous visitor
  └─ cookie ANON_SESSION_COOKIE  →  sha256 →  anonymous_sessions.session_token_hash
     · questions_limit DEFAULT 3   (duplicated as a literal `3` in app/api/chat/route.ts)
     · 7-day cookie max-age, matching anonymous_sessions.retention_expires_at
     · questions_reserved / questions_used — reserve-then-commit, with a
       release_anonymous_question RPC (added in a later commit)

registered user (Supabase Auth, @supabase/ssr)
  └─ usage_periods rows, summed across all periods where period_end is null or future
     · limit     = Σ question_limit
     · consumed  = Σ (questions_used + questions_reserved)
```

Three Supabase clients, by privilege: `lib/supabase-auth/client.ts` (browser, anon key),
`server.ts` (cookie-aware, for RSC and route handlers), `serviceRole.ts` (bypasses RLS —
used only to read/write `anonymous_sessions`, which has no authenticated user to scope by).
