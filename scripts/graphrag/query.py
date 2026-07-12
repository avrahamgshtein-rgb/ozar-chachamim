# -*- coding: utf-8 -*-
"""
Agentic Query Engine — GraphRAG CLI, Masterplan Phase 5 §10.

Answers complex research questions by combining:
  * graph traversal over data.json (connections, periods, locations, fields)
  * semantic search over Supabase pgvector (bios + research passages)
  * Claude as the orchestrating agent (tool-use loop) that decomposes the
    question, calls the tools, and synthesizes a sourced answer.

Example questions (from the GraphRAG spec):
  "אילו חכמים הושפעו מהרמב"ם אך חיו בצפון אפריקה בתקופת גירוש ספרד?"
  "הצג את שרשרת הקבלה מהמהר"ל מפראג ועד לתלמידי הבעש"ט."
  "עקוב אחר נדידת מרכזי התורה בעקבות גזירות ת"ח ות"ט."

Usage
  pip install anthropic voyageai requests
  set ANTHROPIC_API_KEY=...
  # optional, enables semantic search over the research corpus:
  set VOYAGE_API_KEY=...  SUPABASE_URL=...  SUPABASE_ANON_KEY=...

  python query.py "שאלת המחקר שלך"
"""

import json
import os
import sys
from collections import deque
from pathlib import Path

try:
    import anthropic
except ImportError:
    sys.exit("pip install anthropic")

ROOT      = Path(__file__).resolve().parents[2]
DATA_JSON = ROOT / "nextjs-app" / "public" / "data.json"
MODEL     = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5")

DATA   = json.loads(DATA_JSON.read_text(encoding="utf-8"))
NODES  = {str(n["id"]): n for n in DATA["nodes"]}
LINKS  = DATA["links"]

# ── Tools ────────────────────────────────────────────────────────────────

def tool_search_sages(query="", period="", location="", field="", limit=15):
    """Filter sages by substring across name/period/location/field."""
    out = []
    for n in NODES.values():
        if period and n.get("period") != period:
            continue
        if location and location not in (n.get("location") or ""):
            continue
        if field and field not in (n.get("field") or ""):
            continue
        if query and query not in n.get("label", "") and query not in (n.get("bio") or ""):
            continue
        out.append({k: n.get(k) for k in ("id", "label", "period", "location", "field", "bio")})
        if len(out) >= limit:
            break
    return out


def tool_connections_of(sage_id):
    """All connections of a sage (both directions), with names."""
    res = []
    for l in LINKS:
        s, t = str(l["source"]), str(l["target"])
        if sage_id in (s, t):
            other = t if s == sage_id else s
            if other in NODES:
                res.append({"other_id": other, "other_label": NODES[other]["label"],
                            "type": l.get("type"), "direction": "out" if s == sage_id else "in"})
    return res


def tool_find_chain(from_id, to_id, max_depth=6):
    """BFS shortest chain between two sages over the connection graph."""
    adj = {}
    for l in LINKS:
        s, t = str(l["source"]), str(l["target"])
        adj.setdefault(s, []).append((t, l.get("type")))
        adj.setdefault(t, []).append((s, l.get("type")))
    q, seen = deque([[ (from_id, None) ]]), {from_id}
    while q:
        path = q.popleft()
        last = path[-1][0]
        if last == to_id:
            return [{"id": pid, "label": NODES.get(pid, {}).get("label", pid), "via": via}
                    for pid, via in path]
        if len(path) > max_depth:
            continue
        for nxt, typ in adj.get(last, []):
            if nxt not in seen:
                seen.add(nxt)
                q.append(path + [(nxt, typ)])
    return []


def tool_semantic_search(question, match_count=8):
    """pgvector search over bios + research (requires Voyage + Supabase env)."""
    if not all(os.environ.get(v) for v in ("VOYAGE_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY")):
        return {"error": "semantic search not configured (VOYAGE_API_KEY / SUPABASE_URL / SUPABASE_ANON_KEY)"}
    import requests
    import voyageai
    vec = voyageai.Client().embed(
        [question], model=os.environ.get("VOYAGE_MODEL", "voyage-multilingual-2"),
        input_type="query").embeddings[0]
    r = requests.post(
        f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/rpc/match_sage_chunks",
        headers={"apikey": os.environ["SUPABASE_ANON_KEY"],
                 "Authorization": f"Bearer {os.environ['SUPABASE_ANON_KEY']}",
                 "Content-Type": "application/json"},
        json={"query_embedding": vec, "match_count": match_count}, timeout=30)
    if r.status_code >= 300:
        return {"error": f"supabase rpc failed: {r.text[:200]}"}
    hits = r.json()
    for h in hits:
        h["sage_label"] = NODES.get(str(h["sage_id"]), {}).get("label", h["sage_id"])
    return hits


TOOLS = [
    {"name": "search_sages",
     "description": "Filter sages by Hebrew substring / period key / location / field. Period keys: second-temple, tannaim, amoraim, geonim, rishonim, acharonim, modern.",
     "input_schema": {"type": "object", "properties": {
         "query": {"type": "string"}, "period": {"type": "string"},
         "location": {"type": "string"}, "field": {"type": "string"},
         "limit": {"type": "integer"}}}},
    {"name": "connections_of",
     "description": "List all connections (teacher/student/influence/...) of a sage by id.",
     "input_schema": {"type": "object", "properties": {"sage_id": {"type": "string"}},
                      "required": ["sage_id"]}},
    {"name": "find_chain",
     "description": "Shortest chain of connections between two sage ids (BFS, max 6 hops).",
     "input_schema": {"type": "object", "properties": {
         "from_id": {"type": "string"}, "to_id": {"type": "string"}},
         "required": ["from_id", "to_id"]}},
    {"name": "semantic_search",
     "description": "Semantic (pgvector) search over sage bios and research passages. Use for conceptual questions.",
     "input_schema": {"type": "object", "properties": {"question": {"type": "string"}},
                      "required": ["question"]}},
]

DISPATCH = {
    "search_sages":    lambda a: tool_search_sages(**a),
    "connections_of":  lambda a: tool_connections_of(**a),
    "find_chain":      lambda a: tool_find_chain(**a),
    "semantic_search": lambda a: tool_semantic_search(**a),
}

SYSTEM = """You are the research agent of Ozar Chachamim, a knowledge graph of Jewish sages.
Decompose the user's research question into tool calls (graph search, chain finding,
semantic retrieval), then synthesize a rigorous, academic answer in the language of the
question. Cite your evidence: sage names + which tool result supports each claim.
If the data is insufficient, say so explicitly — never invent facts."""


def main():
    if len(sys.argv) < 2:
        sys.exit('Usage: python query.py "your research question"')
    question = sys.argv[1]
    client = anthropic.Anthropic()

    messages = [{"role": "user", "content": question}]
    for _ in range(12):  # agent loop budget
        resp = client.messages.create(model=MODEL, max_tokens=2500, system=SYSTEM,
                                      tools=TOOLS, messages=messages)
        if resp.stop_reason != "tool_use":
            print("\n" + "".join(b.text for b in resp.content if b.type == "text"))
            return
        messages.append({"role": "assistant", "content": resp.content})
        results = []
        for block in resp.content:
            if block.type == "tool_use":
                print(f"  ⚙ {block.name}({json.dumps(block.input, ensure_ascii=False)[:100]})")
                try:
                    out = DISPATCH[block.name](block.input)
                except Exception as e:  # tool errors go back to the agent
                    out = {"error": str(e)}
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": json.dumps(out, ensure_ascii=False)[:8000]})
        messages.append({"role": "user", "content": results})
    print("Agent loop budget exhausted.")


if __name__ == "__main__":
    main()
