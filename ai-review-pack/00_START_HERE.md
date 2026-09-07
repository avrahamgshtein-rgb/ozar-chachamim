# אוצר חכמים — AI Review Pack

**Generated:** 2026-09-07
**Live site under review:** https://ozar-chachamim-app.vercel.app/he
**Repository root:** `ozar-chachamim/` — the reviewed application is the `nextjs-app/` subfolder.

---

## What this pack is

A self-contained context bundle for a code/product review by an AI model. It contains the
**complete source** of the deployed application (78 files, 11,006 lines), its configuration,
its data model, and a description of the live behaviour observed on 2026-09-07.

You do **not** need repository access. Everything needed to review is in these files.

## How to use it

Upload all files in this folder to the model in one conversation, then paste the brief
in `06_REVIEW_BRIEF.md` as your prompt. If the model has a small context window, upload in
this order and let it work through them:

| # | File | ~size | What it is |
|---|---|---|---|
| 00 | `00_START_HERE.md` | 4 KB | This file — orientation |
| 01 | `01_PROJECT_OVERVIEW.md` | 8 KB | What the product is, stack, deployment |
| 02 | `02_ARCHITECTURE.md` | 14 KB | Rendering model, data flow, state, RAG chat |
| 03 | `03_FILE_MAP.md` | 12 KB | Every file: size, client/server boundary, exports |
| 04 | `04_DATA_MODEL.md` | 9 KB | Types, dataset shape, Supabase tables |
| 05 | `05_LIVE_SITE_SNAPSHOT.md` | 8 KB | Observed live behaviour + open questions |
| 06 | `06_REVIEW_BRIEF.md` | 7 KB | **The prompt** — what to review and how to report |
| 10 | `10_SOURCE_app_lib_store.md` | 163 KB | Full source: routes, server logic, state (45 files) |
| 11 | `11_SOURCE_components.md` | 272 KB | Full source: React components (33 files) |
| 12 | `12_CONFIG.md` | 10 KB | Build, routing, styling, deployment config |

Total ≈ 500 KB ≈ 130,000 tokens. Fits in one conversation on any current long-context model.

## What is deliberately NOT here

- `node_modules/`, `.next/` build output — reproducible from `package.json`.
- The content datasets (`public/data.json` ≈ 520 KB, `public/research/` ≈ 12 MB of source
  documents). Their **shape** is documented in `04_DATA_MODEL.md`; the raw content is not a
  code-review input. Say so explicitly if a finding needs the actual data.
- The legacy pre-Next.js static site that still lives at the repository root
  (`index.html`, `graph.js`, `map.js` and ~150 accumulated markdown status files). It is
  **not** what is deployed at the URL under review — but see `05_LIVE_SITE_SNAPSHOT.md`,
  because it is still live at a second URL and that has consequences.
- Secrets. The pack was scanned; it contains only `process.env.*` references, no key values.
  One publishable (browser-safe) Supabase anon key does appear hardcoded as a fallback in
  `middleware.ts` — that is flagged as a finding, not a leak.

## Ground rules for the reviewing model

1. **Cite file and line.** Every finding must point at `path:line` from bundles 10–12.
   A finding you cannot anchor in the source is a hypothesis — label it as one.
2. **Do not invent files.** If something you expect (tests, CI, error boundaries) is absent
   from `03_FILE_MAP.md`, its absence *is* the finding.
3. **Separate what you verified from what you inferred.** The live-site observations in file
   05 are from a single fetch; treat them as evidence, not as a measured audit. You cannot
   run Lighthouse from inside this pack.
4. **Hebrew/RTL is a first-class constraint,** not an afterthought. The default locale is
   Hebrew and the default direction is RTL. Any UI suggestion must survive `dir="rtl"`.
