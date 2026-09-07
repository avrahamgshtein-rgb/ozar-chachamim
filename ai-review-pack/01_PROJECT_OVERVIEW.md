# 01 — Project Overview

## The product

**אוצר חכמים ("Ozar Chachamim") — a knowledge graph of Jewish sages.**

An interactive, trilingual (Hebrew / English / Russian) web application that presents ~422
figures from Jewish intellectual history — from the biblical patriarchs through the modern
era — together with ~1,624 typed relationships between them (teacher, student, colleague,
family, influence, polemic, predecessor, contemporary).

The application is a **single-page canvas with seven views**, switched by a tab bar:

| tab key | Hebrew label | What it renders |
|---|---|---|
| `graph` | רשת קשרים | D3 force-directed network of sages and connections (default view) |
| `map` | גיאוגרפיה | Leaflet map of birthplaces / centres of activity, with migration paths |
| `traditions` | מסורות | Sage cards grouped by era |
| `ideas` | טבלה | Sortable/filterable table of all sages |
| `timeline` | שלשלת הקבלה | D3 horizontal era bands — the chain of transmission |
| `genealogy` | עץ שושלות | Dynastic / lineage tree |
| `about` | אודות | Project description |

Cross-cutting features: full-text fuzzy Hebrew search (nikud- and quote-insensitive, so
`רמבם` matches `רמב״ם`), multi-axis filtering (era × region × field), a two-sage comparator,
a path-finder between any two sages, per-sage detail pages with long-form research documents,
a first-visit onboarding tour, dark/light theming, and an **AI chat widget** (RAG over the
sage corpus, backed by the Claude API) with an anonymous free-trial quota and Supabase Auth
accounts.

## Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 15.1** (App Router, React Server Components), **React 19** |
| Language | TypeScript 5.6, `strict: true` |
| Styling | Tailwind CSS 3.4 + CSS custom properties for theming |
| State | **Zustand 5** — one global store, `store/useAppStore.ts` |
| Visualization | **D3 7.9** (network, timeline, genealogy), **Leaflet 1.9** (map) |
| Data / Auth | **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) |
| AI | Anthropic Claude API via a Node runtime route handler |
| Fonts | `next/font/google` — Frank Ruhl Libre (serif), Heebo (sans) |
| Hosting | **Vercel**, Node 24.x |

No test framework, no linter run in CI (`eslint.ignoreDuringBuilds: true`), no state
management beyond Zustand, no data-fetching library.

## Repository layout

The repository is **not** a clean application repo. It is a working folder that accumulated
three years of artifacts:

```
ozar-chachamim/
├── nextjs-app/          ← THE DEPLOYED APPLICATION (this pack's subject)
│   ├── app/             route handlers + pages (App Router)
│   ├── components/      React components
│   ├── lib/             domain logic, data access, i18n, RAG
│   ├── store/           Zustand store
│   └── public/          data.json + supplements, research/, i18n/, icons
├── index.html, graph.js, map.js, styles-graph.css
│                        ← legacy pre-Next.js static site, still deployed separately
├── data/                ~40 .docx research source documents
├── sages/, sources/, periods/, topics/  content folders
├── supabase/            SQL migrations
├── scripts/             one-off Python/JS ETL scripts (~60 of them)
└── ~150 *.md status/plan/session files accumulated over the project's life
```

Both `ozar-chachamim/` and `ozar-chachamim/nextjs-app/` are linked to **separate Vercel
projects** (`ozar-chachamim` and `nextjs-app`). Both are live. See file 05.

## Data sources — three of them, layered

This is the single most important thing to understand before reviewing the data flow.

1. **Supabase** (`sages_with_stats`, `connections_with_names` views) — queried first.
2. **`public/data.json`** — the canonical curated dataset, 422 nodes / 1,624 links, bundled
   as a static file. Used as a fallback **whenever Supabase returns a thinner dataset**
   (`connections.length < 100 || sages.length < 300`).
3. **Supplement files** — `data-ancient.json`, `data-supplement.json`,
   `data-supplement-2.json`, `data-research-links.json`, `data-patch.json` — merged on top,
   adding figures deliberately kept out of the canonical file (biblical patriarchs, Rashi,
   the Vilna Gaon, the Baal Shem Tov…) and patching fields on existing ones.

Then a per-locale **content overlay** (`public/i18n/sages.en.json`, `sages.ru.json`) is
applied to translate the text fields.

The same merge is implemented **twice** — client-side in `components/layout/AppShell.tsx`
and server-side in `lib/serverData.ts` — with a comment in the latter acknowledging the
duplication. This is intentional but fragile; it is listed in the review brief.

## Scale

| Measure | Value |
|---|---|
| Source files reviewed | 78 (`.ts`, `.tsx`, `.css`) |
| Lines of source | 11,006 |
| Largest file | `components/viz/NetworkGraph.tsx` — 811 lines |
| Sages in the canonical dataset | 422 nodes |
| Connections | 1,624 links |
| Per-sage research documents | 351 JSON files in `public/research/` (~12 MB) |
| Locales | 3 (he default, en, ru) |
| Dependencies | 10 runtime, 10 dev |

## Project history in one paragraph

The project began as a static HTML/D3 site (`index.html` + `graph.js`, ~178 KB of hand-written
HTML) and was migrated to Next.js in July–August 2026. The migration is complete in the sense
that the Next.js app is feature-superior, but incomplete in the sense that the old site was
never retired, the repository was never cleaned, and the two share a Vercel org. Recent commits
(see `git log`) show active work on a Milestone-2 RAG chat feature with quota management,
anonymous sessions, and Supabase Auth — that code is present and deployed.
