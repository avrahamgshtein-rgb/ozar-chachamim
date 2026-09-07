# 05 — Live Site Snapshot

Observations made on **2026-09-07** by fetching the deployed pages. These are single-fetch
observations, not a measured audit — no Lighthouse run, no field data, no device testing.
Treat them as evidence to reason from and as leads to verify, not as benchmark results.

---

## 1. Two live deployments of the same project

| URL | What answers | Vercel project |
|---|---|---|
| `https://ozar-chachamim-app.vercel.app` | the **Next.js app** — this pack's subject | `nextjs-app` |
| `https://ozar-chachamim.vercel.app` | the **legacy static site** (`index.html` + `graph.js`) | `ozar-chachamim` |

Both were fetched and both returned a working application. The legacy site's title is
"אוצר חכמים — Network of Jewish Sages" and its About text reports "approximately 365 sages,
452 documented relationships" — i.e. an older dataset.

**This has three consequences the review must weigh:**

1. **`app/sitemap.ts` hardcodes `const baseUrl = 'https://ozar-chachamim.vercel.app'`** —
   the *other* deployment. Every URL in the Next.js app's `sitemap.xml` therefore points at
   the legacy site.
2. **`public/robots.txt` points its `Sitemap:` directive at
   `https://ozar-chachamim.vercel.app/sitemap.xml`** — same problem, and the legacy static
   site has no `sitemap.xml` route at all.
3. Two indexable deployments of the same content, on the same org, with no canonical
   relationship declared between them and no `metadataBase` in the Next.js app.

Establish first which URL is intended to be *the* site. Everything else in the SEO axis
depends on that answer.

## 2. Home page (`/he`) — what the crawler receives

Fetched and parsed. What is present in the served HTML:

- `<title>` — `אוצר חכמים — גרף הידע של חכמי ישראל | אוצר חכמים`. Note the **title template
  applied to itself**: `app/layout.tsx` sets `template: '%s | אוצר חכמים'` and
  `app/[locale]/layout.tsx` sets a `default` of `${t.appTitle} — ${t.appSubtitle}`, and the
  two compose into a doubled brand name.
- `<meta name="description">` — present, Hebrew, reasonable.
- `og:type`, `og:locale`, `twitter:card: summary`, `theme-color: #0a0806` — present.
- An `<h1>` reading `אוצר חכמים`.
- Filter UI labels and tab names — these are in the HTML because they are static strings in
  client components that Next.js still renders to markup during SSR of the client tree.

What is **not** present: any sage name, any biography, any connection, any of the 422
records. The knowledge graph itself is fetched in the browser after hydration (see
`02_ARCHITECTURE.md` §2), so the home page is, to a crawler, a navigation chrome with no
content behind it.

- `lang`/`dir` are **not** on the server-rendered `<html>`. `app/layout.tsx` renders
  `<html suppressHydrationWarning>` with no `lang` and no `dir`;
  `components/providers/LocaleProvider.tsx` sets both on the client after hydration. Until
  then the document has no declared language or direction.

## 3. Sage detail page (`/he/sage/1`) — the SEO surface

Fetched `https://ozar-chachamim-app.vercel.app/he/sage/1` (בן סירא).

Working as designed:
- Per-sage `<title>`: `בן סירא | אוצר חכמים`
- Real `<h1>`: `בן סירא`
- Server-rendered metadata chips (field, era), external links (Sefaria, Wikipedia,
  National Library of Israel), `Person` JSON-LD, `canonical` and `hreflang` alternates.

The gap:
- **The research documents — the long-form content that gives these pages their substance —
  are not server-rendered.** The page was captured mid-load showing `טוען מחקר…`
  ("loading research"). `components/sages/ResearchSection.tsx` is a client component that
  fetches `/api/research/[id]` after mount. So the ~12 MB of curated scholarly text across
  351 documents is invisible to crawlers, invisible in a no-JS context, and arrives one
  round-trip late for readers.
- This sage had **no `bio` prose** in the rendered output, consistent with
  `04_DATA_MODEL.md` §2: nodes loaded from `data.json` carry `bio` only when the source file
  has it, and never carry `birth_year`, `death_year`, `region` or `coordinates` at all.

## 4. Loading path — what happens between request and first useful pixel

Reconstructed from the source, not measured. Worth confirming with a real trace:

```
request /he
  → middleware: locale check (+ Supabase auth.getUser() round-trip on EVERY request)
  → RSC: fetchSageStats()  — a Supabase count query, awaited before any HTML is sent
  → HTML + JS bundle
  → hydrate
  → AppShell useEffect:
      Promise.all([fetchSages(), fetchConnections()])        Supabase, 2 requests
      → guard fails (Supabase is sparse)  →  GET /data.json  520 KB
      → GET /data-ancient.json                               sequential
      → GET /data-supplement.json                            sequential
      → GET /data-supplement-2.json                          sequential
      → GET /data-research-links.json                        sequential
      → GET /data-patch.json                                 sequential
      → GET /i18n/sages.{locale}.json    (en/ru only)        sequential
  → setData()  →  NetworkGraph dynamic chunk loads  →  D3 force simulation starts (main thread)
```

That is up to **nine sequential client round-trips** — several of which are likely discarded
work — before the default view can begin drawing, plus a main-thread force simulation over
422 nodes and 1,624 links. On a mid-range phone this is the critical path to first
interaction. The `<VizSkeleton>` covers it visually, which is good, but does not shorten it.

Also on the critical path: `middleware.ts` calls `await supabase.auth.getUser()` on every
page request, including for visitors who have never signed in.

## 5. Open questions the pack cannot answer

State these back if a finding depends on one:

1. Which of the two URLs is the intended canonical site?
2. Is Supabase currently populated, or is production effectively always on the `data.json`
   fallback? (The guard's magic numbers and the code comments suggest the latter.)
3. Is `/api/chat` live in production, and is `ANTHROPIC_API_KEY` set on the `nextjs-app`
   Vercel project? The chat widget renders unconditionally in `AppShell`.
4. Does the GitHub Actions `deploy.yml` CLI deploy race Vercel's own Git integration for
   the two linked projects?
5. What are the actual Core Web Vitals? Nothing in the app reports them (no
   `@vercel/analytics`, no Sentry, `window.dataLayer` never defined), so there is currently
   **no production telemetry at all**.
