# 📊 Database Migration Plan — Ozar Chachamim v2

**Goal:** Move from embedded data (44 sages) → Supabase (992 entries + research) + future scalability

---

## Schema Design

### Table 1: `sages`
```sql
CREATE TABLE sages (
  id BIGSERIAL PRIMARY KEY,
  sage_id TEXT UNIQUE,                -- matches Excel "מזהה"
  name_he TEXT NOT NULL,              -- Hebrew name
  name_en TEXT,                       -- English name (if available)
  chapter_type TEXT,                  -- "טקסט יסוד", etc.
  years TEXT,                         -- "1138-1204", "סביב 190 לפנה״ס", etc.
  area TEXT,                          -- area/region
  period_key TEXT,                    -- "בית שני", "ראשונים", etc.
  main_field TEXT,                    -- main topic/field
  tags TEXT,                          -- comma-separated tags
  summary TEXT,                       -- 2-3 line summary
  central_idea TEXT,                  -- key innovation/idea
  related_sages TEXT,                 -- comma-separated related IDs
  spotify_link TEXT,                  -- if available
  
  -- UI metadata
  origin_country TEXT,
  migration_path TEXT,
  geo_region TEXT,
  custom_tradition TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON sages(period_key, geo_region);
CREATE INDEX ON sages(name_he);
CREATE INDEX ON sages(sage_id);
```

### Table 2: `research_content`
```sql
CREATE TABLE research_content (
  id BIGSERIAL PRIMARY KEY,
  sage_id TEXT NOT NULL REFERENCES sages(sage_id) ON DELETE CASCADE,
  content TEXT,                       -- full research markdown/text
  source_file TEXT,                   -- original Word filename
  word_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(sage_id)
);

CREATE INDEX ON research_content(sage_id);
```

### Table 3: `search_index` (optional, for full-text search)
```sql
CREATE TABLE search_index (
  id BIGSERIAL PRIMARY KEY,
  sage_id TEXT NOT NULL REFERENCES sages(sage_id),
  search_vector TSVECTOR,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Migration Steps

### Step 1: Excel → JSON
- Read `site-data/חכמי ישראל.xlsx`
- Export all 992 rows to `sages.json`
- Map Excel columns → sage table columns

### Step 2: Word → Text
- Extract text from each .docx in `data/` folder
- Map filename → sage_id (fuzzy match)
- Convert to markdown
- Export to `research.json`

### Step 3: Create Supabase Tables
- Paste SQL into Supabase SQL editor
- Verify RLS policies (users can read all, auth users can view history)

### Step 4: Import Data
- Run import script: `sages.json` → sages table
- Run import script: `research.json` → research_content table
- Verify counts (should be 992 sages, ~40 research entries)

### Step 5: Refactor index.html
- Load sages from Supabase instead of embedded SAGES_DATA
- Add pagination (show 20 per page)
- Add search (by name, tags, period)
- Keep existing 3-view UI (grid, network, geo)

### Step 6: Test & Deploy
- Local: fetch a few entries, verify modal opens
- Vercel: deploy, test with live Supabase

---

## Data Mapping (Excel → Supabase)

| Excel Column | Supabase Column | Notes |
|---|---|---|
| מזהה | sage_id | unique ID |
| שם הדמות/הנושא | name_he | Hebrew name |
| סוג פרק | chapter_type | "טקסט יסוד", etc |
| שנים/תקופה | years | "1138-1204" or descriptive |
| אזור/מרחב | area | Geographic area |
| תקופה | period_key | Map to: "בית שני", "תנאים", "ראשונים", "אחרונים", "עת חדשה" |
| תחום עיקרי | main_field | "הלכה", "קבלה", etc |
| תגיות | tags | comma-separated |
| תקציר | summary | 2-3 lines |
| רעיון מרכזי | central_idea | key innovation |
| דמויות קשורות | related_sages | comma-separated IDs |
| קישור ספוטיפיי | spotify_link | podcast/audio link |

---

## File Output

After extraction:
```
ozar-chachamim/
├── sages.json              ← 992 entries
├── research.json           ← ~40 research documents
├── migration-log.txt       ← import status
└── ...
```

---

## Timeline

- **Today:** Design schema + extract data (Excel + Word)
- **Tomorrow:** Import to Supabase + refactor index.html
- **QA:** Test pagination, search, modal, 3 views
- **Deploy:** Push to Vercel

---

## Future Additions

Once this is live:
1. **Add new sage:** Just add row to `sages` table (via Supabase dashboard or API)
2. **Add research:** Insert into `research_content` table
3. **Add relationships:** Update `related_sages` field
4. **No code changes needed** ← full DB-driven approach
