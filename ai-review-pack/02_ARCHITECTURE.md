# 02 — Architecture

All paths are relative to `nextjs-app/`. The `@/` import alias maps to that same root.

---

## 1. Routing and the rendering model

Next.js 15 **App Router**. Everything is under `app/`.

```
app/
├── layout.tsx                    root layout — fonts, global metadata, theme bootstrap script
├── page.tsx                      "/" → redirect(`/${DEFAULT_LOCALE}`)
├── globals.css                   Tailwind layers + CSS custom properties (theming)
├── icon.tsx                      generated favicon (ImageResponse)
├── sitemap.ts                    generated sitemap.xml
├── global-error.tsx              root error boundary
├── auth/callback/route.ts        Supabase OAuth / magic-link callback
├── api/
│   ├── chat/route.ts             POST: RAG chat  ·  GET: quota check   (runtime: nodejs)
│   └── research/[id]/route.ts    GET: per-sage research documents      (runtime: nodejs)
└── [locale]/                     he | en | ru
    ├── layout.tsx                validates locale, wraps in LocaleProvider
    ├── page.tsx                  the main canvas — renders <AppShell>
    ├── error.tsx                 locale-scoped error boundary
    ├── icon.tsx
    ├── about/page.tsx
    ├── auth/login/page.tsx
    ├── auth/signup/page.tsx
    └── sage/[id]/
        ├── page.tsx              per-sage detail page — SERVER-RENDERED
        └── loading.tsx           streaming skeleton
```

### Where the server/client boundary falls

This is the load-bearing fact of the whole architecture:

- **`app/[locale]/page.tsx` (the main view) is a Server Component that renders exactly one
  thing: `<AppShell>`, which is `'use client'`.** The only server work it does is
  `fetchSageStats()` for a count. Everything the visitor sees on the home page — graph, map,
  table, timeline, search, filters — is rendered in the browser, after the JS bundle loads,
  after the data fetches resolve.
- **`app/[locale]/sage/[id]/page.tsx` (the detail pages) is genuinely server-rendered.** It
  reads sages from `lib/serverData.ts` (statically imported JSON, no network), emits real
  `<h1>`, real prose, `generateMetadata()` with per-sage title/description/canonical/hreflang,
  and a `Person` JSON-LD block. These pages are the app's SEO surface.
- There is **no `generateStaticParams()` on the sage route**, so those pages are rendered on
  demand rather than pre-built.

### Middleware — `middleware.ts`

Runs on every non-asset request and does two jobs:

1. **Locale routing.** If the first path segment isn't `he`/`en`/`ru`, it reads
   `Accept-Language` and issues a `NextResponse.redirect` to `/{locale}{pathname}`.
   Matching is a naive substring test: `acceptLanguage.toLowerCase().includes(locale)`.
2. **Supabase session refresh.** Uses the `@supabase/ssr` `createServerClient` cookie
   pattern and calls `supabase.auth.getUser()` so Server Components see a fresh token.

The Supabase URL and publishable anon key are **hardcoded as `??` fallbacks** in this file.

---

## 2. Data flow

Three sources, layered, merged at runtime. The merge is implemented twice.

### Client path — `components/layout/AppShell.tsx`, bootstrap `useEffect`

```
1. Promise.all([ fetchSages(), fetchConnections() ])        → Supabase
2. if (connections < 100 || sages < 300)                    → guard
       fetchLocalGraphData()  → GET /data.json              → 422 nodes, 1624 links
       if (local.connections > connections) replace both
3. for each of:  /data-ancient.json
                 /data-supplement.json
                 /data-supplement-2.json
                 /data-research-links.json
       merge nodes whose id is not already present; append ALL links
4. GET /data-patch.json → shallow-merge field patches onto matching sages
5. fetchContentOverlay(locale) → /i18n/sages.{en,ru}.json → applyOverlay()
6. setData(sages, connections, sages.length, initialLastUpdate)
```

Everything after step 1 is a sequential `await` chain of separate HTTP round-trips, executed
in the browser, before the graph can draw.

### Server path — `lib/serverData.ts`

Same layering, different mechanism: the JSON files are **statically imported** (bundled into
the serverless function, because `public/` is not readable via `fs` at runtime on Vercel), then
merged into a module-level `Map` cache. Used by the sage detail page and by RAG retrieval.
The file's own header comment acknowledges it duplicates `AppShell.tsx`'s merge, "so
server-side consumers see the same full set the client renders."

Research documents take a third path: `getResearchDocs()` in the same module *does* use
`fs/promises` against `public/research/`, and `app/api/research/[id]/route.ts` does the same.

### Supabase access — `lib/supabase.ts`

Reads two views, not tables: `sages_with_stats` and `connections_with_names`. Both row mappers
(`mapSageRow`, and the inline connection mapper) accept **two competing column vocabularies**
— `location`/`field`/`bio` *or* `region`/`primary_field`/`summary`, `source_id` *or* `source`,
`era`/`period`/`era_key` — with `??` chains, plus an `ERA_MAP` that normalises display strings
(`'Second Temple'`) into keys (`'second-temple'`). This is schema drift encoded as defensive
mapping.

`fetchSageConnections()` fetches the connection rows, then calls `fetchSageById()` **inside a
`for` loop**, one round-trip per neighbour.

---

## 3. State — `store/useAppStore.ts` (212 lines, Zustand)

A single global store holding data, selection, UI flags and filters together:

| group | fields |
|---|---|
| data | `sages`, `connections`, `sageMap`, `isLoaded`, `totalSages`, `lastUpdate` |
| selection | `selectedSageId`, `selectedSage` |
| UI | `theme`, `activeTab`, `isDrawerOpen`, `isSearchOpen`, `isFiltersOpen`, `isComparatorOpen`, `comparatorSages` |
| filters | `filters`, `filteredSages`, `availableFields` |

**Filtering is eager, not derived.** Every `toggle*Filter` / `setSearchQuery` action re-runs
`applyFilters(sages, newFilters)` over the full array and writes the result into
`filteredSages`. There is no selector-level memoization; every subscriber re-renders on every
keystroke. Search matching uses `normalizeHe()` + `fuzzyIncludes()` from `lib/search.ts` to make
Hebrew matching nikud-, quote- and final-letter-insensitive.

Theme lives in the store *and* in `localStorage` (`ozar-theme`) *and* in a
`strategy="beforeInteractive"` inline `<script>` in `app/layout.tsx` that sets
`documentElement.dataset.theme` before first paint to prevent a flash.

---

## 4. Visualization layer

All six visual tabs are `next/dynamic` imports with `ssr: false` and a `<VizSkeleton>`
fallback, declared at the top of `AppShell.tsx`. Tab switching is handled in `CanvasArea`:

- **`graph` and `map` stay mounted permanently**, toggled with `block`/`hidden` classes, so the
  D3 simulation and the Leaflet instance survive tab switches.
- **The other four unmount** when you leave them.

`components/viz/NetworkGraph.tsx` (811 lines) is the largest file in the codebase and runs its
D3 force simulation on the main thread.

**Verified dead code:** the repository also contains a complete off-main-thread force
simulation — `lib/workers/d3-force-worker.ts` (114 lines), `lib/hooks/useD3ForceWorker.ts`
(91 lines) — and a separate `lib/optimizedForceSimulation.ts` (128 lines). A grep across
`app/`, `components/`, `lib/` and `store/` finds **no importer for any of the three**. 333
lines of performance infrastructure are built and unused.

---

## 5. Internationalization

Hand-rolled, no i18n library.

- `lib/i18n.ts` — `LOCALES`, `DEFAULT_LOCALE = 'he'`, `getDirection()` (`he` → `rtl`),
  a `UI` dictionary of ~24 interface strings × 3 locales, and a `tr(locale, he, en, ru?)`
  inline helper for strings that live outside the dictionary.
- `lib/types.ts` — `ERA_LABELS`, `CONNECTION_LABELS`, `REGION_LABELS`, `TAB_META` all carry
  their own per-locale label maps.
- `components/providers/LocaleProvider.tsx` (21 lines) — sets `html[lang]` and `html[dir]`
  **on the client, after hydration**. The root `<html>` in `app/layout.tsx` carries
  `suppressHydrationWarning` and no `lang`/`dir` of its own.
- Content (sage bios, concepts) is translated through the overlay described above; untranslated
  sages fall back to `name_en` for the label, or to Hebrew.

---

## 6. AI chat — RAG pipeline

`app/api/chat/route.ts` (260 lines, `runtime: 'nodejs'`).

```
POST /api/chat
  ├─ auth check (Supabase)
  ├─ authenticated?  → usage_periods quota (question_limit / questions_used / questions_reserved)
  └─ anonymous?      → anonymous_sessions row keyed by a hashed cookie token
                       default trial = 3 questions, 7-day cookie
  ↓
lib/rag/entityExtraction.ts   question → up to 3 matched sages
  ↓
lib/rag/buildContext.ts       per sage, in parallel:
                                · getResearchDocs()  → first 3,000 chars
                                · fetchSefariaTopic()   (external)
                                · fetchWikipediaSummary() (external)
                              + getSageConnections()
  ↓
lib/rag/systemPrompt.ts       trilingual instruction block enforcing grounded answers
                              ("answer ONLY from the provided context; never fabricate")
  ↓
lib/rag/claude.ts             Claude Messages API, ANTHROPIC_API_KEY server-side,
                              estimateCost()
```

`GET /api/chat` is a read-only quota probe so the widget can show "X questions left" without
creating a session row. The default anonymous allowance (`3`) is hardcoded in the route with a
comment noting it must be kept in sync with a `DEFAULT` in the SQL migration.

Auth clients are split three ways: `lib/supabase-auth/client.ts` (browser),
`server.ts` (RSC/route handlers, cookie-aware), `serviceRole.ts` (privileged, throws unless
`SUPABASE_SERVICE_ROLE_KEY` is set).

---

## 7. Styling and theming

Tailwind with a custom palette expressed as **CSS custom properties**, so a
`data-theme="light"` attribute on `<html>` swaps the whole scheme:

- `ink.50 … ink.950` — greyscale, defined as `rgb(var(--ink-N-rgb) / <alpha-value>)`
- `gold.100 … gold.600` — accent
- `era.*` — seven era colours, duplicated in `ERA_COLORS` in `lib/types.ts`
- `region.*` — ten region colours, duplicated in `REGION_COLORS` in `lib/types.ts`
- fonts: `serif` → Frank Ruhl Libre, `sans` → Heebo (both loaded via `next/font/google` with
  Hebrew subsets and `display: swap`)
- custom `glass` / `glass-lg` / `gold-glow` shadows, four keyframe animations including
  `slide-in-end` (direction-aware drawer entry)

`app/globals.css` is 257 lines of custom-property definitions and utility classes.

---

## 8. Observability

- `lib/analytics.ts` — `trackEvent()` plus seven typed helpers. It logs to console in
  development and otherwise pushes to `window.dataLayer` **if that global exists**. Nothing in
  the app installs GTM or a `dataLayer`.
- `.env.example` documents a `NEXT_PUBLIC_SENTRY_DSN`, but no Sentry SDK is in
  `package.json` and no Sentry code exists in the source.
- Vercel Analytics is described in `.env.example` as "auto-enabled"; the
  `@vercel/analytics` package is **not** a dependency.
- `app/global-error.tsx` (121 lines) and `app/[locale]/error.tsx` (117 lines) are the only
  error boundaries.

---

## 9. What is absent

Stated plainly, because absence is reviewable:

Each item below was checked against the source, not assumed.

- **No tests.** No test runner in `package.json`; no `*.test.*`, `*.spec.*` or `__tests__`
  anywhere in the app.
- **CI builds but does not verify.** `.github/workflows/deploy.yml` runs `npm ci` and
  `npm run build`, then `npx vercel --prod`. It never runs `npm run type-check` (the script
  exists) and never lints. It also deploys via the CLI on every push to `main`, alongside
  whatever Vercel's own Git integration does for the two linked projects.
- **ESLint is disabled during builds** — `next.config.ts`: `eslint: { ignoreDuringBuilds: true }`.
- **No `metadataBase`** anywhere in `app/`, so Open Graph and canonical URLs resolve relatively.
- **No `generateStaticParams()` on `sage/[id]`** — the only one in the app is in
  `[locale]/layout.tsx`, for the three locales.
- **No `next/image`** — zero occurrences across `app/`, `components/`, `lib/`. `public/images`
  is 836 KB served raw. (`next.config.ts` does configure a `remotePatterns` entry for the
  Supabase storage host, which nothing uses.)
- **No analytics package.** Neither `@vercel/analytics` nor `@vercel/speed-insights` is in
  `package.json`, and nothing defines `window.dataLayer` — so every `trackEvent()` call in
  `lib/analytics.ts` is a no-op in production.
- **No Sentry**, despite `NEXT_PUBLIC_SENTRY_DSN` in `.env.example`.
- **No rate limiting** on `/api/chat` beyond the per-session quota counters.
- **No `loading.tsx` on the main route** — only on `sage/[id]`.
