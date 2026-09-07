---
name: translate-research
description: Inspect and process the English and Russian translation queue for Ozar Chachamim research JSON. Use when translating research, reporting localization coverage, retrying missing language files, or validating localized outputs.
---

# Translate Research

1. Run `scripts/character-factory/translate_research.py --summary` with an available Python runtime. The current baseline is 346 base files, with 2 English and 2 Russian localized files.
2. Confirm the requested target language and a bounded batch. Prefer `--all --lang en --limit 5` or explicit `--ids`; never launch the entire corpus accidentally.
3. Require `ANTHROPIC_API_KEY` in the process environment. Never print it, write it into source, or edit `.env` files.
4. Existing `<id>.en.json` and `<id>.ru.json` files are immutable by default and are skipped automatically.
5. After a batch, parse every new JSON file, compare entry counts and metadata keys with the Hebrew base, and inspect at least one title and paragraph per file for terminology and omissions.
6. Re-run `--summary` and report exactly how coverage changed.

Do not claim a translation batch ran when the provider library, API key, or network access is unavailable.
