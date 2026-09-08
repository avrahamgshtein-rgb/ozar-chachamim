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

## Tooling

- **`tsx` is invoked through `npx`.** Should become a devDependency with an
  `npm test` script so the suites run without a network fetch.

## Resolved

- ~~Sage 563 carried two research documents belonging to other sages~~ —
  removed in Stage 5; the documents remain at their correct homes
  (`331.json`, `444.json`).
