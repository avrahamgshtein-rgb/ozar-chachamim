# Character Factory — מפעל הדמויות

Agentic pipeline (Masterplan Phase 3 §7): raw research text → structured,
academically-moderated site data + multi-asset outputs, with human review
before anything touches the site.

## Pipeline

```
research.txt
   │ 1. EXTRACT   (Claude) → schema-aligned JSON (data.json format)
   │ 2. MODERATE  (Claude) → academic tone, superlatives removed
   │ 3. ASSETS    (Claude) → linkedin.md + daf-mekorot.md
   │ 4. TRANSLATE (Claude) → EN + RU overlay fragments
   ▼ 5. REVIEW    (you)    → y/N in the terminal
output/<slug>/…            → always written after approval
data.json + public/i18n/   → only with --merge
```

## Usage

```bash
pip install anthropic
set ANTHROPIC_API_KEY=sk-ant-...        # Windows (or export on mac/linux)

cd scripts/character-factory
python factory.py my-research.txt              # review + write assets only
python factory.py my-research.txt --merge      # also merge into the site
python factory.py my-research.txt --id 501     # explicit sage id
```

Model defaults to `claude-sonnet-4-5`; override with `CLAUDE_MODEL`.

## Safety rails (per CLAUDE.md)

- **FK validation** — connections are matched against existing sages in
  `data.json`; unmatched names are listed and skipped, never invented.
- **Duplicate guard** — `--merge` refuses an id that already exists.
- **Valid values** — period/connection types checked against the canonical keys.
- **Human-in-the-loop** — nothing is written before explicit `y` approval;
  `--merge` is opt-in on top of that.
- **Privacy** — research text goes only to the Claude API; outputs stay in
  the local `output/` folder.

## Extending translations

The overlay fragments in `output/<slug>/overlay.{en,ru}.json` match the format
of `nextjs-app/public/i18n/sages.<locale>.json` — copy entries there manually,
or use `--merge` to do it automatically.
