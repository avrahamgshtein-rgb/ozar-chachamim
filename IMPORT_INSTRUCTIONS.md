# 📦 Import Instructions — Ozar Chachamim to Supabase

**Status:** Files ready for import
- ✅ `sages.json` — 992 sage entries
- ✅ `research.json` — 18 research documents (matched)
- ⚠️ 36 Word files unmatched (can be manually mapped later)

---

## Step 1: Create Supabase Project

1. Go to **https://supabase.com**
2. Sign in / Create account (free tier)
3. Create new project: **ozar-chachamim**
4. Wait for project to be ready (~2 min)
5. Go to **Settings → API** and copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

Store these in Vercel environment variables later.

---

## Step 2: Create Database Tables

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Create new query
3. Copy entire contents of **`supabase-schema-v2.sql`** into the editor
4. Click **Run** button
5. ✅ Should see "Success" with 12 operations

This creates:
- `sages` table (992 rows)
- `research_content` table (18 rows)
- RLS policies (security)
- Indexes (performance)

---

## Step 3: Import Sage Data

### Option A: Use Python CLI (recommended)

```bash
cd ozar-chachamim
pip install supabase
python3 import_to_supabase.py
```

This will:
- Read `sages.json`
- Insert all 992 rows into `sages` table
- Report success/errors

### Option B: Manual CSV Import (via Supabase UI)

1. In Supabase, go to **Table Editor**
2. Click `sages` table
3. Click **Upload CSV**
4. Generate CSV from sages.json:
   ```bash
   python3 << 'EOF'
   import json
   import csv
   with open('sages.json', 'r', encoding='utf-8') as f:
       sages = json.load(f)
   with open('sages.csv', 'w', newline='', encoding='utf-8') as f:
       writer = csv.DictWriter(f, fieldnames=sages[0].keys())
       writer.writeheader()
       writer.writerows(sages)
   EOF
   ```
5. Upload `sages.csv` to Supabase UI

---

## Step 4: Import Research Content

Similar to Step 3:

```bash
python3 import_to_supabase.py --research-only
```

Or manually:
1. Go to `research_content` table in Supabase
2. Generate CSV from `research.json`
3. Upload

---

## Step 5: Verify Import

In Supabase **Table Editor**:

```sql
SELECT COUNT(*) FROM sages;      -- Should be 992
SELECT COUNT(*) FROM research_content;  -- Should be 18
```

---

## Step 6: Setup Environment Variables (Vercel)

1. Go to **Vercel Dashboard** → Your project
2. Go to **Settings → Environment Variables**
3. Add:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   ```
4. **Re-deploy** your site (Vercel will auto-redeploy on next git push)

---

## Step 7: Update index.html

Modify the script section to:

```javascript
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Load sages from Supabase instead of embedded SAGES_DATA
async function loadSages() {
  const { data, error } = await supabase.from('sages').select('*');
  if (error) {
    console.error('Failed to load sages:', error);
    return [];
  }
  return data;
}

// On app boot:
let SAGES_DATA = [];
loadSages().then(sages => {
  SAGES_DATA = sages;
  renderGrid();  // re-render cards with new data
});
```

---

## Unmatched Word Files (36)

These files have different names in Excel and need manual mapping:

```
( רבנו שמעון בן צמח דוראן (הרשב_ץ.docx
הבנקאי שהנגיש את המשנה- פנחס קהתי...
המגיד משנה- דמותו, פועלו...
... (and 33 more)
```

**Later task:** 
1. Check Excel for the original name of each sage
2. Create manual mapping JSON
3. Re-run import with mapping
4. Insert remaining 36 research entries

---

## Troubleshooting

### "table sages does not exist"
- Check that SQL script ran successfully in Step 2
- Verify you're connected to correct project

### "anon key not allowed to insert"
- Check RLS policies in Supabase
- Verify `insert` policy allows public writes (or set user auth)

### "import fails with encoding errors"
- Ensure Python is running in UTF-8 mode
- Try: `PYTHONIOENCODING=utf-8 python3 import_to_supabase.py`

---

## Next Steps (After Import)

1. ✅ Refactor `index.html` to fetch from Supabase
2. ✅ Add pagination (show 20 per page)
3. ✅ Add search (by name, tags, period)
4. ✅ Deploy to Vercel
5. ✅ Test end-to-end

See `CLAUDE.md` for updated architecture.
