---
name: dedupe-sages
description: Audit possible duplicate Ozar Chachamim sage identities and maintain the reviewed alias mapping. Use when names, IDs, supplements, Drive research assignments, or Supabase rows appear duplicated or conflicting.
---

# Dedupe Sages

1. Run `node scripts/audit-semantic-duplicates.mjs` to generate candidates; treat similarity as evidence, never as an automatic merge decision.
2. Compare dates, locations, works, labels, research records, and existing connections for each candidate.
3. Read `data/sage-id-aliases-2026-07-21.json` before proposing any mapping. Preserve the canonical ID already used by the public graph unless evidence requires a reviewed migration.
4. Do not merge homonyms or relatives. Record only mappings supported by biographical identity.
5. After an approved mapping change, run `node scripts/sync-public-data.mjs` as a dry run, then use `--write` only when requested.
6. Finish with `node scripts/audit-data-sync.mjs --check` and verify zero duplicate IDs and zero orphan links.

Never rewrite research ownership or live Supabase tables without a reviewed manifest and explicit approval.
