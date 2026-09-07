# -*- coding: utf-8 -*-
"""
Research corpus translator — Character Factory extension.

Translates the research documents in nextjs-app/public/research/<id>.json
into English and Russian: <id>.en.json / <id>.ru.json.
The site (ResearchSection) automatically prefers the localized file and
falls back to Hebrew when a translation doesn't exist yet.

Usage
  pip install anthropic
  set ANTHROPIC_API_KEY=sk-ant-...

  python translate_research.py --list             # show corpus + status
  python translate_research.py --summary          # compact queue counts
  python translate_research.py --ids 41,44        # translate specific sages
  python translate_research.py --all --limit 5    # translate a bounded batch
  python translate_research.py --all --lang ru    # one language only

Notes
  - Long documents are translated in ~6000-char chunks and re-joined.
  - Existing <id>.<lang>.json files are skipped (delete to force re-run).
  - Academic terminology enforced (Amoraim, галаха — not literal renderings).
"""

import argparse
import json
import os
import sys
from pathlib import Path

ROOT         = Path(__file__).resolve().parents[2]
RESEARCH_DIR = ROOT / "nextjs-app" / "public" / "research"
MODEL        = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5")
CHUNK        = 6000
LANGS        = {"en": "English", "ru": "Russian"}

PROMPT = """Translate the following Hebrew research text about a Jewish sage into {lang}.
Requirements:
- Elite academic register; faithful to the source, no additions or omissions.
- Halakhic/historical terms use accepted academic renderings
  ("Amoraim" not "Speakers"; Russian: «галаха», «таннаи», «ешива»).
- Book titles: transliterate + gloss on first mention, e.g. "Mishneh Torah".
- Keep paragraph breaks. Return ONLY the translated text.

TEXT:
"""


def translate_text(client, text: str, lang: str) -> str:
    parts = []
    for i in range(0, len(text), CHUNK):
        msg = client.messages.create(
            model=MODEL, max_tokens=8000,
            messages=[{"role": "user", "content": PROMPT.format(lang=lang) + text[i:i + CHUNK]}])
        parts.append(msg.content[0].text.strip())
    return "\n".join(parts)


def corpus():
    return sorted(f for f in RESEARCH_DIR.glob("*.json")
                  if "." not in f.stem)  # skip already-localized <id>.<lang>.json


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--summary", action="store_true")
    ap.add_argument("--ids", help="comma-separated sage ids")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--limit", type=int, help="maximum base files to process")
    ap.add_argument("--lang", choices=list(LANGS), help="single target language")
    args = ap.parse_args()

    files = corpus()
    langs = {args.lang: LANGS[args.lang]} if args.lang else LANGS

    if args.limit is not None and args.limit < 1:
        ap.error("--limit must be a positive integer")

    if args.summary:
        summary = {
            "base": len(files),
            **{
                code: sum((RESEARCH_DIR / f"{f.stem}.{code}.json").exists() for f in files)
                for code in LANGS
            },
        }
        summary["missing_en"] = summary["base"] - summary["en"]
        summary["missing_ru"] = summary["base"] - summary["ru"]
        print(json.dumps(summary, ensure_ascii=False))
        if not (args.ids or args.all):
            return

    if args.list or not (args.ids or args.all):
        print(f"research corpus: {len(files)} files in {RESEARCH_DIR}")
        for f in files:
            status = " ".join(
                f"[{l}:{'✓' if (RESEARCH_DIR / f'{f.stem}.{l}.json').exists() else '—'}]"
                for l in LANGS)
            print(f"  {f.stem:>8}  {status}")
        if not (args.ids or args.all):
            print("\nRun with --ids 41,44 or --all to translate.")
        return

    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Set ANTHROPIC_API_KEY first.")
    import anthropic
    client = anthropic.Anthropic()

    wanted = set(args.ids.split(",")) if args.ids else None
    todo = [f for f in files if wanted is None or f.stem in wanted]
    if args.limit is not None:
        todo = todo[:args.limit]
    print(f"translating {len(todo)} sage(s) × {list(langs)} with {MODEL}")

    for f in todo:
        docs = json.loads(f.read_text(encoding="utf-8"))
        if not isinstance(docs, list):
            continue
        for code, lang in langs.items():
            out = RESEARCH_DIR / f"{f.stem}.{code}.json"
            if out.exists():
                print(f"  {f.stem}.{code}: exists, skipping")
                continue
            translated = []
            for d in docs:
                print(f"  {f.stem}.{code}: translating '{d.get('title','')[:40]}...' "
                      f"({d.get('word_count','?')} words)")
                translated.append({
                    **d,
                    "title":   translate_text(client, d.get("title", ""), lang),
                    "content": translate_text(client, d.get("content", ""), lang),
                })
            out.write_text(json.dumps(translated, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"  ✅ {out.name}")

    print("done.")


if __name__ == "__main__":
    main()
