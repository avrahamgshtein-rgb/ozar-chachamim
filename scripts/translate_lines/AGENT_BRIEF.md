# Brief for translator agents (Hebrew research papers -> English and Russian, no API)

You ARE the translator. There is no API key: you translate by writing the text yourself. Work only in
`TX_WORK` (an empty scratch directory outside the repo; the scripts in `scripts/translate_lines/` write there)
(run the scripts as `python3 scripts/translate_lines/tx_prepare.py <id>`). Do NOT run git, do NOT edit `tx_*.py`, do NOT touch any sage id you were not given,
do NOT write anywhere except `$TX_WORK/<id>.*.txt` and the output files the build script writes.

## Research papers (one sage = one id)

For each id you were given, in order:

1. `python3 scripts/translate_lines/tx_prepare.py <id> > <id>.src.txt`, then READ `<id>.src.txt` (use Read, or cat in parts). It prints a header,
   a `names:` line (English / Russian spellings the site already uses for sages named in the paper: use them) and the
   Hebrew **units**, one per line: `N|hebrew text`. A unit marked `(ru only)` is an English paragraph inside the Hebrew paper:
   translate it for Russian only (leave it out of the English file).
2. Write `<id>.en.txt` and `<id>.ru.txt`: for EVERY unit one line `N|translation` (same N, in order, one physical line per unit,
   no blank lines inside a translation, no line breaks). Use a Bash heredoc with a quoted delimiter
   (`cat > <id>.en.txt <<'EOF' ... EOF`). Long paper: write it in parts, the first with `>` and the next with `>>`
   (about 30-40 units per command), so no single command is cut off.
   Translate English first, then Russian, both straight from the Hebrew.
3. `python3 scripts/translate_lines/tx_build.py <id>` validates and writes `nextjs-app/public/research/<id>.en.json` and `<id>.ru.json`.
   If it says NOT WRITTEN, it names the missing unit numbers or the problem: append the missing lines to the right file and
   run it again. Read each warning: fix a real one (a missing citation marker `[1, 2]`, a lost number, an untranslated
   passage) by editing the txt line (e.g. with python or sed) and rebuild. Warnings about an ordinal written in words
   ("thirteenth century" vs "13") or a mere Hebrew word kept in transliteration are fine.

## Quality rules (these are published research papers: a reader on the English or Russian page sees them)

- Faithful, complete, academic register. No summarising, no omission, no additions, no commentary, no "translator's note".
  Translate what the Hebrew says even if a fact looks wrong to you (do not "correct" it from memory). Only a plain typographic
  slip (a word repeated by mistake) may be smoothed.
- Keep exactly: citation markers `[1, 2]`, `[cite: 1, 2]`; every number and year; markdown bits such as `**`; the ` | ` separators
  of table rows (translate the cells); box-drawing characters in boxed tables (translate only the words); `Source: [4, 7]` lines.
- Headings stay short lines without a final full stop. Quotation marks: English "..." ; Russian «...» with „...“ inside.
- Hebrew quotations (Mishnah, Talmud, Bible, rabbinic sayings): translate them; add a transliteration in parentheses only where the
  paper itself discusses the wording.
- Names and terms: follow `glossary.md` (read it first, it is short) and the `names:` line. Sage's own name: the form on the
  `## id label | en: ... | ru: ...` header line when it is filled in, otherwise the glossary style
  (English: Rabbi Yochanan ben Zakkai, Rabbi Elazar ben Arakh, Maharal of Prague; Russian: рабби Йоханан бен Заккай, Махараль из Праги).
  `בור סוד` (a typo for the Mishnaic `בור סיד`) is rendered "plastered cistern" / «колодец, обмазанный известью».
- Russian: natural, correct Russian (cases, agreement), «таннаи, амораи, гаоны, ришоним, ахроним, галаха, агада, Тора, ешива,
  бейт-мидраш, Шулхан арух»; no Latin letters except where the paper has them (e.g. a Latin term in parentheses).
- A finished example to imitate for style and line structure (skim only the first 8 lines of each): a finished paper such as 592 (`592.en.txt`, `592.ru.txt` in the working directory, if present),
  `41.en.txt`, `41.ru.txt`.

## Quizzes (only if you were given quiz ids)

`python3 scripts/translate_lines/tx_quiz.py prepare <id>` prints the Hebrew quiz as units `q1|question`, `o1.0|option`, `e1|explanation`
(true/false options are not printed: the script fills in True/False and Верно/Неверно). Write `<id>.quiz.en.txt` and
`<id>.quiz.ru.txt` with one `key|translation` line per unit, same keys, then `python3 scripts/translate_lines/tx_quiz.py build <id>`.
Translate faithfully; the question stem "נכון או לא נכון:" becomes "True or false:" / «Верно или неверно:». Keep the answer
positions (do not reorder options). Use the SAME names and terms as the sage's research translation: before you start,
skim `nextjs-app/public/research/<id>.en.json` / `<id>.ru.json` (grep the sage's key terms) and reuse them.
Keep Hebrew gershayim abbreviations as their usual English/Russian form (Rambam, Rashi, Рамбам, Раши).

## Report back

One short line per id: `<id>: en ok/ru ok (warnings N)` or what failed. Do not paste translations in the report.
