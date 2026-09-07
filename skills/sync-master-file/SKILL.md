---
name: sync-master-file
description: Synchronize the Ozar Chachamim canonical graph into the public Next.js dataset and verify local and live parity. Use for master-data changes, new sages or connections, alias updates, or any request to refresh data.json or check Supabase drift.
---

# Sync Master File

1. Work from the repository root and inspect `git status --short`; preserve unrelated changes.
2. Run `node scripts/audit-data-sync.mjs --check`. Stop on duplicate IDs, orphan links, or missing canonical IDs.
3. Run `node scripts/sync-public-data.mjs` without `--write` and review the reported node/link counts.
4. Only when the user asked to update generated data, run `node scripts/sync-public-data.mjs --write`.
5. Re-run the local audit. Then run `node scripts/verify-supabase-canonical.mjs --check` when network access is available.
6. Never modify the live database from this skill. Generate and review a migration separately, and obtain explicit approval before schema or production changes.

Success means 409 canonical nodes and 1,634 unique links at the current baseline, with zero duplicates, zero orphans, and zero live drift. Treat later intentional baseline changes as valid only when all checks agree.
