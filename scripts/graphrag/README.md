# GraphRAG — Complex Query Engine

Masterplan Phase 5 §10 / GraphRAG spec doc. Answers research questions by
combining the connection graph with semantic retrieval over bios + research.

## Components

| File | Role |
|---|---|
| `../../supabase-graphrag.sql` | pgvector table `sage_embeddings`, `match_sage_chunks` RPC, `find_connection_chain` + `sage_neighborhood` graph RPCs |
| `embed.py` | Indexer: embeds bios/core concepts/research chunks (Voyage AI `voyage-multilingual-2`, dim 1024) → upserts to Supabase |
| `query.py` | Agentic query engine: Claude tool-use loop over graph tools (local data.json) + semantic search (pgvector) |

## Setup

```bash
# 1. Database (once): paste supabase-graphrag.sql into the Supabase SQL Editor
# 2. Index:
pip install voyageai requests anthropic
set VOYAGE_API_KEY=...
set SUPABASE_URL=https://<project>.supabase.co
set SUPABASE_SERVICE_KEY=...
python embed.py --research

# 3. Query:
set ANTHROPIC_API_KEY=...
set SUPABASE_ANON_KEY=...
python query.py "אילו חכמים הושפעו מהרמב\"ם אך חיו בצפון אפריקה בתקופת גירוש ספרד?"
```

`query.py` works graph-only without the Voyage/Supabase variables — the
`semantic_search` tool then reports itself unconfigured and the agent answers
from the connection graph alone.

## Notes

- Embedding dim is 1024 (`voyage-multilingual-2`, strong Hebrew). Changing
  embedder ⇒ change `vector(1024)` in the SQL and `VOYAGE_MODEL`.
- `find_connection_chain` assumes `connections(source_id, target_id,
  connection_type)` — adjust column names to your schema if needed.
- The agent cites sages + tool evidence and is instructed never to invent
  facts; insufficient data → explicit statement.
