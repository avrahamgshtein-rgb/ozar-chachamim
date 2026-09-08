# Backlog

Deferred, non-blocking. Carried over from Stages 3–4 (frozen 2026-09-08, commit `7b49def`).

## Stage 4 — 3D time layers

- **Period labels clip at narrow widths.** The counter-rotated plate labels are
  occluded by the Geography panel below ~900 px, and cut off on mobile.
- **No coastline basemap.** Plates draw a generated graticule. Adding an
  attributed Natural Earth land outline would give real geographic reference;
  it needs a licensed asset committed to the repo, not a hand-written one.
- **No controller-level test.** `popstate` restoration and delayed data loading
  are covered in `lib/geoLayers.ts` and `lib/urlState.ts` only; nothing drives
  `AppShell` itself.

## Data

- **8 unresolved locations** in the gazetteer (`lib/locationCoords.ts`):
  `גריידיץ`, `רוגצ'וב/דווינסק`, `גלותי, בינלאומי`, `תלמסאן, אלג׳יריה`, `שילה`,
  `ארץ כנען`, `סגד, הונגריה; ברגן־בלזן; ניו יורק`, `בריטניה`.
  These render as "unplaceable" rather than being given invented coordinates.
- **Provenance gap in `4c22744`.** That commit added 87 nodes to the root
  `data.json` while its message describes only four TypeScript files. The CSV
  covers ids 1–383, so those nodes have no CSV row. 28 of them surfaced as
  audit drift and were reconciled in `7b49def`; the rest have not been
  reviewed. Worth a deliberate curation pass — not an automated one.

## Stage 5 — reading and discovery

- **Server-rendered lang/dir is wrong for en/ru.** The document ships
  `lang="he" dir="rtl"` for every locale; en/ru are corrected before paint by a
  blocking script, so there is no visible flip, but the pre-JS markup is wrong.
  The fix is moving `<html>` into `app/[locale]/layout.tsx`, which first needs
  the non-locale routes (`/`, `_not-found`) given their own shell.
- **Research-page loading is unmeasured.** `outputFileTracingIncludes` now ships
  ~12 MB of research into that route's serverless bundle. Production TTFB was
  0.78 s then 0.37/0.38 s — too few samples to separate cold start from noise.
  Do not claim a speed improvement until this is measured properly. What is
  established: round trips to first research text went 2 → 1.
- **Two decorative chevrons remain below AA** (2.76 against a 3.0 target for
  non-text UI). All text-level failures are resolved.

## Stage 6 — assistant

- **Quota concurrency and reconciliation are NOT resolved.** Stage 6 inspected
  the RPCs and changed no schema. That `confirm_authenticated_question` and
  `release_authenticated_question` both filter on `state = 'reserved'` makes
  each transition single-shot; it does not by itself establish safety under
  concurrent requests, nor does it reconcile reservations abandoned when a
  process dies between reserve and confirm. Still open:
  - no sweeper for reservations left in `state = 'reserved'` when a request is
    killed mid-flight (the new provider timeout narrows this window but does
    not close it — a platform-level kill still strands the row)
  - concurrent reserve calls for the same user have not been load-tested
    against the period accounting
  - no reconciliation job comparing `usage_reservations` against
    `usage_periods.questions_reserved`
  Treat these as open regardless of the Stage 6 timeout work.
- **`SUPABASE_SERVICE_ROLE_KEY` is not available to the production
  deployment**, so the chat API returns 500 before any provider call. Confirmed
  in production: `GET /api/chat` returns 200 without an anon cookie and a bare
  500 with one, which is the only branch that constructs the service-role
  client. Fix is an environment variable, not code.

## Tooling

- **`tsx` is invoked through `npx`.** Should become a devDependency with an
  `npm test` script so the suites run without a network fetch.

## Resolved

- ~~Sage 563 carried two research documents belonging to other sages~~ —
  removed in Stage 5; the documents remain at their correct homes
  (`331.json`, `444.json`).
