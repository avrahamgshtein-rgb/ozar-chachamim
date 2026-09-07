---
name: research-aggregator
description: Reconcile newly added Google Drive or local research sources with the Ozar Chachamim corpus and canonical sage IDs. Use for new source ingestion, Drive-folder deltas, unmatched documents, or research ownership review; not for rescanning the already reconciled 423-document baseline.
---

# Research Aggregator

1. Establish the baseline from `data/DRIVE_RESEARCH_EMBEDDING_AUDIT_2026-07-21.md` and the existing manifests in `data/`.
2. Fetch only new or modified source files. Preserve Drive IDs, URLs, modified times, titles, and exact content.
3. Match by stable Drive ID first, then reviewed sage aliases, then normalized name and biographical evidence. Never assign solely from fuzzy similarity.
4. Mark ambiguous items for review; do not create a new sage or topic silently.
5. Produce an import manifest compatible with `scripts/import-drive-research.mjs` and run it without `--write`.
6. After review, use `--write` only when explicitly requested. Re-run the same manifest and require zero records to append.
7. Finish with `node scripts/index-research-content.mjs`, `node scripts/audit-data-sync.mjs --check`, and a concise count of imported, skipped, ambiguous, and unmatched items.

Never delete source files, rewrite existing research records, or change live Supabase data as part of aggregation.
