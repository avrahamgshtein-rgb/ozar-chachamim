# -*- coding: utf-8 -*-
"""
Character Factory (מפעל הדמויות) — Ozar Chachamim, Masterplan Phase 3 §7.

Agentic pipeline: raw research text → structured, academically-moderated
site data + multi-asset outputs, with a human-in-the-loop review step.

Pipeline stages
  1. EXTRACT    — structured JSON (name, era, location, central idea, bio,
                  connections) aligned with data.json schema
  2. MODERATE   — academic moderation engine: removes superlatives
                  ("greatest", "legendary"), enforces objective,
                  evidence-based phrasing
  3. ASSETS     — LinkedIn post + Daf Mekorot (source sheet, Markdown)
  4. TRANSLATE  — EN + RU overlay fragments (public/i18n/sages.<loc>.json)
  5. REVIEW     — CLI approval before anything is merged

Usage
  set ANTHROPIC_API_KEY=sk-ant-...          (or export on mac/linux)
  python factory.py path/to/research.txt
  python factory.py research.txt --id 500   # explicit new sage id
  python factory.py research.txt --merge    # after approval, also merge into
                                            # nextjs-app/public/data.json and
                                            # the i18n overlay files

Outputs (always) → scripts/character-factory/output/<slug>/
  sage.json, connections.json, overlay.en.json, overlay.ru.json,
  linkedin.md, daf-mekorot.md

Privacy: input files are read locally and sent only to the Claude API.
No research text is written anywhere except the local output folder.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    import anthropic
except ImportError:
    sys.exit("Missing SDK:  pip install anthropic --break-system-packages")

ROOT       = Path(__file__).resolve().parents[2]           # repo root
DATA_JSON  = ROOT / "nextjs-app" / "public" / "data.json"
I18N_DIR   = ROOT / "nextjs-app" / "public" / "i18n"
OUT_DIR    = Path(__file__).resolve().parent / "output"
MODEL      = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5")

VALID_PERIODS = ["second-temple", "tannaim", "amoraim", "geonim",
                 "rishonim", "acharonim", "modern"]
VALID_TYPES   = ["student", "teacher", "colleague", "influence",
                 "oppose", "predecessor", "contemporary", "family"]

EXTRACT_PROMPT = """You are the extraction stage of the "Character Factory" for Ozar Chachamim,
a scholarly knowledge base of Jewish sages. Extract structured data from the
research text below.

Return ONLY a JSON object (no markdown fence) with exactly these fields:
{
  "label":        "<full Hebrew name, e.g. רבי משה בן מיימון (הרמב\\"ם)>",
  "name_en":      "<English name>",
  "period":       "<one of: second-temple|tannaim|amoraim|geonim|rishonim|acharonim|modern>",
  "location":     "<primary location, Hebrew (e.g. ספרד, בבל, ירושלים)>",
  "field":        "<primary field(s), Hebrew, comma-separated (e.g. הלכה, פילוסופיה)>",
  "birth_year":   <int or null>,
  "death_year":   <int or null>,
  "bio":          "<2-3 sentence Hebrew biography>",
  "core_concept": "<one-sentence Hebrew statement of the sage's central idea>",
  "migration_path": {"from": "<place>", "to": "<place>", "intermediate": ["..."]} or null,
  "connections": [
    {"other_name": "<Hebrew name of related sage>", "type": "<student|teacher|colleague|influence|oppose|predecessor|contemporary|family>", "evidence": "<short justification from the text>"}
  ]
}

Rules:
- Use ONLY facts present in the research text. Never invent dates or relationships.
- If a field is unknown, use null (or [] for connections).
- period must match the sage's lifetime; use the canonical keys exactly.

RESEARCH TEXT:
"""

MODERATE_PROMPT = """You are the Academic Moderation Engine of Ozar Chachamim. Rewrite the JSON
below so every text field meets elite academic standards:

- Remove superlatives and hagiography: "הגדול ביותר", "אגדי", "greatest",
  "legendary" → replace with specific, evidence-based descriptions
  (what he wrote, ruled, founded, influenced — and where that is attested).
- Objective tone; no devotional language; keep honorifics that are part of
  the name itself (e.g. רבי, הרב).
- Keep the same JSON structure and keys exactly. Keep Hebrew fields Hebrew.
- Do not add facts that are not implied by the original.

Return ONLY the corrected JSON object.

JSON:
"""

ASSETS_PROMPT = """From the sage JSON below, produce two Markdown assets in Hebrew.
Return ONLY a JSON object: {"linkedin": "<markdown>", "daf_mekorot": "<markdown>"}

1. "linkedin" — a LinkedIn post (120-180 words, Hebrew): engaging but factual,
   one core idea of the sage and why it matters today, ending with 2-3 hashtags
   (e.g. #אוצר_חכמים).
2. "daf_mekorot" — a source sheet (דף מקורות) for a 45-minute yeshiva lesson:
   title, 5-minute intro framing, 3-4 numbered primary sources to study
   (name the works — only works actually attributable to this sage), study
   questions for chavruta, and a 10-minute discussion question. Use Markdown
   headings.

SAGE JSON:
"""

TRANSLATE_PROMPT = """Translate the "label" and "bio" of the sage JSON below into {lang}.
Halakhic/historical terms must use accepted academic renderings
(e.g. "Amoraim", not "Speakers"; Russian: «галаха», «таннаи»).
Return ONLY: {{"label": "...", "bio": "..."}}

SAGE JSON:
"""


def ask_claude(client, prompt: str, text: str, max_tokens: int = 2000) -> str:
    msg = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt + text}],
    )
    return msg.content[0].text.strip()


def parse_json(raw: str) -> dict:
    raw = re.sub(r"^```(json)?|```$", "", raw.strip(), flags=re.M).strip()
    return json.loads(raw)


def slugify(name_en: str, label: str) -> str:
    base = name_en or label
    s = re.sub(r"[^a-zA-Z0-9]+", "-", base.lower()).strip("-")
    return s or "sage"


def load_data():
    with open(DATA_JSON, encoding="utf-8") as f:
        return json.load(f)


def resolve_connections(extracted: list, nodes: list) -> tuple[list, list]:
    """Match connection names against existing sages; FK validation."""
    resolved, unresolved = [], []
    for conn in extracted or []:
        name = (conn.get("other_name") or "").strip()
        ctype = conn.get("type")
        if ctype not in VALID_TYPES:
            unresolved.append({**conn, "reason": f"invalid type {ctype!r}"})
            continue
        match = next((n for n in nodes if name and (name == n["label"] or name in n["label"] or n["label"] in name)), None)
        if match:
            resolved.append({"target_id": match["id"], "target_label": match["label"],
                             "type": ctype, "evidence": conn.get("evidence", "")})
        else:
            unresolved.append({**conn, "reason": "no matching sage in data.json"})
    return resolved, unresolved


def review(sage: dict, resolved: list, unresolved: list) -> bool:
    print("\n" + "=" * 62)
    print("PROPOSED SAGE ENTRY (post-moderation)")
    print("=" * 62)
    print(json.dumps(sage, ensure_ascii=False, indent=2))
    print("-" * 62)
    print(f"Connections resolved against data.json: {len(resolved)}")
    for c in resolved:
        print(f"  ✓ {c['type']:<12} → [{c['target_id']}] {c['target_label']}")
    if unresolved:
        print(f"Unresolved (will be skipped): {len(unresolved)}")
        for c in unresolved:
            print(f"  ✗ {c.get('other_name')} — {c['reason']}")
    print("-" * 62)
    return input("Approve this entry? [y/N] ").strip().lower() == "y"


def merge_into_site(sage_node: dict, links: list, overlays: dict):
    data = load_data()
    if any(n["id"] == sage_node["id"] for n in data["nodes"]):
        sys.exit(f"Refusing to merge: id {sage_node['id']} already exists in data.json")
    data["nodes"].append(sage_node)
    data["links"].extend(links)
    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"✅ merged into {DATA_JSON.relative_to(ROOT)} "
          f"({len(data['nodes'])} nodes, {len(data['links'])} links)")

    for loc, entry in overlays.items():
        path = I18N_DIR / f"sages.{loc}.json"
        overlay = json.load(open(path, encoding="utf-8")) if path.exists() else {}
        overlay[sage_node["id"]] = entry
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(overlay, f, ensure_ascii=False, indent=2)
        print(f"✅ overlay updated: {path.relative_to(ROOT)}")


def main():
    ap = argparse.ArgumentParser(description="Character Factory — research text → site data")
    ap.add_argument("input", help="path to raw research text file (utf-8)")
    ap.add_argument("--id", help="new sage id (default: max existing numeric id + 1)")
    ap.add_argument("--merge", action="store_true",
                    help="after approval, merge into data.json + i18n overlays")
    args = ap.parse_args()

    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Set ANTHROPIC_API_KEY first.")
    text = Path(args.input).read_text(encoding="utf-8")
    client = anthropic.Anthropic()
    data = load_data()
    nodes = data["nodes"]

    print(f"[1/5] Extracting structured data ({MODEL})...")
    sage = parse_json(ask_claude(client, EXTRACT_PROMPT, text))
    if sage.get("period") not in VALID_PERIODS:
        print(f"  ⚠ invalid period {sage.get('period')!r} — set one of {VALID_PERIODS}")

    print("[2/5] Academic moderation pass...")
    sage = parse_json(ask_claude(client, MODERATE_PROMPT, json.dumps(sage, ensure_ascii=False)))

    print("[3/5] Generating assets (LinkedIn + Daf Mekorot)...")
    assets = parse_json(ask_claude(client, ASSETS_PROMPT,
                                   json.dumps(sage, ensure_ascii=False), max_tokens=3000))

    print("[4/5] Translating (EN, RU)...")
    overlays = {}
    for loc, lang in (("en", "English"), ("ru", "Russian")):
        overlays[loc] = parse_json(ask_claude(
            client, TRANSLATE_PROMPT.format(lang=lang),
            json.dumps({"label": sage["label"], "bio": sage["bio"]}, ensure_ascii=False)))

    new_id = str(args.id or (max((int(n["id"]) for n in nodes if str(n["id"]).isdigit()), default=0) + 1))
    resolved, unresolved = resolve_connections(sage.pop("connections", []), nodes)
    sage_node = {"id": new_id, **{k: v for k, v in sage.items() if v not in (None, "", [])}}
    links = [{"source": new_id, "target": c["target_id"], "type": c["type"],
              "evidence_source": c["evidence"][:120]} for c in resolved]

    print("[5/5] Human review")
    if not review(sage_node, resolved, unresolved):
        print("Aborted — nothing written.")
        return

    slug = slugify(sage.get("name_en", ""), sage["label"])
    out = OUT_DIR / slug
    out.mkdir(parents=True, exist_ok=True)
    (out / "sage.json").write_text(json.dumps(sage_node, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "connections.json").write_text(json.dumps(links, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "linkedin.md").write_text(assets["linkedin"], encoding="utf-8")
    (out / "daf-mekorot.md").write_text(assets["daf_mekorot"], encoding="utf-8")
    for loc, entry in overlays.items():
        (out / f"overlay.{loc}.json").write_text(
            json.dumps({new_id: entry}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ assets written to {out.relative_to(ROOT)}")

    if args.merge:
        merge_into_site(sage_node, links, overlays)
    else:
        print("Tip: re-run with --merge to write into data.json + i18n overlays.")


if __name__ == "__main__":
    main()
