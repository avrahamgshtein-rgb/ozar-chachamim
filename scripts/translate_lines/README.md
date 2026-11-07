# Line-aligned translation of the research papers, without the API

`scripts/character-factory/translate_research.py` translates a paper through the Claude API. When there is no key, the
papers were translated by hand (by the assistant itself, in parallel by sub-agents) with this set of scripts. Same output
files (`nextjs-app/public/research/<id>.en.json`, `<id>.ru.json`, quizzes `nextjs-app/public/quiz/<id>.en.json`, `.ru.json`),
same rule as the API script: **an existing translation is never replaced** (list the files that existed before a run in `$TX_WORK/protected.txt`, one name per line, and `tx_build.py` will not rebuild them).

Working files go to `$TX_WORK` (default `/tmp/ozar-translate-lines`), never into the repo.

1. `python3 scripts/translate_lines/tx_prepare.py <id> > $TX_WORK/<id>.src.txt` prints the Hebrew paper as numbered unique units
   `N|text` plus a `names:` line with the English/Russian forms the site already uses for the sages named in the paper.
   Lines that need no translation (URLs, source entries, lines with no Hebrew, empty lines) are not units: the build copies them.
   A unit marked `(ru only)` is Latin prose inside the Hebrew paper (English copies it, Russian translates it). A paper stored
   twice with different line breaks is detected and translated once.
2. Write `$TX_WORK/<id>.en.txt` and `<id>.ru.txt`: one `N|translation` line per unit, no line breaks inside a translation.
   Follow `glossary.md` and `AGENT_BRIEF.md` (the brief given to the translator agents).
3. `python3 scripts/translate_lines/tx_build.py <id>` checks that every unit is present and that citation markers, numbers and
   table separators survived, then writes the JSON with the Hebrew line structure exactly (`lib/researchParse.ts` parses the
   plain text line by line, so the layout must match). `tx_verify.py <ids>` re-checks files already written; `tx_status.py`
   prints the coverage.
4. Quizzes: `tx_quiz.py prepare <id>` → write `<id>.quiz.en.txt` / `<id>.quiz.ru.txt` → `tx_quiz.py build <id>`; then
   `python3 scripts/build_quiz.py --index` and `npm test` (the quiz label must stay the Hebrew roster label in every language).

A translation says what the Hebrew paper says, including its slips; nothing is corrected from memory. Typos in the Hebrew
source are better fixed in the Hebrew paper first, then re-translated.

## A new document for a sage whose paper already exists (`TX_RES`, `tx_append.py`)

When a sage already has a paper (and its English and Russian files) and a second document is appended to `<id>.json`, only the
new document is translated, so the existing translations stay byte-identical:

1. put the new document alone, as a one-element array, in a scratch folder: `$SCRATCH/<id>.json`;
2. run the whole toolchain with `TX_RES=$SCRATCH TX_WORK=$WORK` (`tx_prepare.py`, `tx_api.py submit/collect`, `tx_build.py`,
   `tx_verify.py`): everything is read from and written to the scratch folder (do not list the repo's files in `protected.txt`:
   they are not in the scratch folder, and the list would only block the rebuild there);
3. `TX_RES=$SCRATCH python3 tx_append.py <id>` checks (no write) and `--write` appends the translated document to the repo's
   `<id>.en.json` and `<id>.ru.json`. It refuses unless the repo's Hebrew paper is the old documents plus exactly that document,
   the English and Russian files hold the old documents only (in the files' own formatting), the translation is line-aligned,
   and the old documents would not change by a byte. Afterwards `tx_verify.py <id>` (without `TX_RES`) checks the whole file.
