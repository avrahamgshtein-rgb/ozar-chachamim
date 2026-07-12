# -*- coding: utf-8 -*-
"""
GraphRAG indexer — Masterplan Phase 5 §10.

Builds embeddings for every sage (bio + core concept + research passages)
and upserts them into the Supabase `sage_embeddings` table
(see supabase-graphrag.sql).

Embedder: Voyage AI (voyage-multilingual-2, dim 1024 — strong Hebrew support).

Usage
  pip install voyageai requests
  set VOYAGE_API_KEY=...
  set SUPABASE_URL=https://<project>.supabase.co
  set SUPABASE_SERVICE_KEY=...        # service role — writes bypass RLS

  python embed.py                # index bios + core concepts
  python embed.py --research     # also index public/research/<id>.json files
  python embed.py --dry-run      # count chunks, no API calls
"""

import argparse
import json
import os
import sys
from pathlib import Path

ROOT         = Path(__file__).resolve().parents[2]
DATA_JSON    = ROOT / "nextjs-app" / "public" / "data.json"
RESEARCH_DIR = ROOT / "nextjs-app" / "public" / "research"
MODEL        = os.environ.get("VOYAGE_MODEL", "voyage-multilingual-2")
CHUNK_CHARS  = 1500   # research texts are chunked to this size
BATCH        = 64


def build_chunks(include_research: bool):
    data = json.loads(DATA_JSON.read_text(encoding="utf-8"))
    chunks = []  # (sage_id, source, chunk_idx, content)
    for n in data["nodes"]:
        sid = str(n["id"])
        if n.get("bio"):
            chunks.append((sid, "bio", 0, f"{n['label']}: {n['bio']}"))
        if n.get("core_concept"):
            chunks.append((sid, "core_concept", 0, f"{n['label']}: {n['core_concept']}"))
    if include_research and RESEARCH_DIR.exists():
        for f in sorted(RESEARCH_DIR.glob("*.json")):
            sid = f.stem
            try:
                docs = json.loads(f.read_text(encoding="utf-8"))
            except Exception:
                continue
            for doc in docs if isinstance(docs, list) else []:
                text = doc.get("content", "")
                for i in range(0, len(text), CHUNK_CHARS):
                    chunks.append((sid, "research", len([c for c in chunks
                                   if c[0] == sid and c[1] == "research"]),
                                   text[i:i + CHUNK_CHARS]))
    return chunks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--research", action="store_true", help="also index research files")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    chunks = build_chunks(args.research)
    print(f"chunks to index: {len(chunks)}")
    if args.dry_run:
        for sid, src, idx, content in chunks[:5]:
            print(f"  [{sid}/{src}/{idx}] {content[:70]}...")
        return

    import requests
    import voyageai

    for var in ("VOYAGE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"):
        if not os.environ.get(var):
            sys.exit(f"Set {var} first.")

    vo = voyageai.Client()
    sb_url = os.environ["SUPABASE_URL"].rstrip("/")
    headers = {
        "apikey":        os.environ["SUPABASE_SERVICE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_KEY']}",
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates",
    }

    done = 0
    for i in range(0, len(chunks), BATCH):
        batch = chunks[i:i + BATCH]
        emb = vo.embed([c[3] for c in batch], model=MODEL, input_type="document").embeddings
        rows = [{"sage_id": sid, "source": src, "chunk_idx": idx,
                 "content": content, "embedding": vec}
                for (sid, src, idx, content), vec in zip(batch, emb)]
        r = requests.post(
            f"{sb_url}/rest/v1/sage_embeddings?on_conflict=sage_id,source,chunk_idx",
            headers=headers, json=rows, timeout=60)
        if r.status_code >= 300:
            sys.exit(f"Supabase upsert failed ({r.status_code}): {r.text[:300]}")
        done += len(rows)
        print(f"  upserted {done}/{len(chunks)}")

    print("✅ index complete")


if __name__ == "__main__":
    main()
