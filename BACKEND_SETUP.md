# Backend Setup Guide — אוצר חכמים

Complete guide to wiring the frontend to Supabase with live data and defensive validation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Frontend)                      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  index.html  │──→│ config.js    │──→│supabase-     │       │
│  │              │  │ (credentials)│  │client.js     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                            │                  │
│                                            ↓                  │
│                               ┌─────────────────────┐         │
│                               │  initializeApp()    │         │
│                               │  ├─ loadSages()     │         │
│                               │  ├─ loadConnections │         │
│                               │  └─ Validate FKs    │         │
│                               └─────────────────────┘         │
│                                            │                  │
└────────────────────────────────────────────┼──────────────────┘
                                             ↓
┌─────────────────────────────────────────────────────────────┐
│            Supabase PostgreSQL (Backend)                    │
│                                                               │
│  ┌─────────────────────┐      ┌──────────────────────┐      │
│  │  sages (992 rows)   │      │connections (25 rows) │      │
│  │ ├─ id (PK)          │      │ ├─ source_id (FK)    │      │
│  │ ├─ name_he          │      │ ├─ target_id (FK)    │      │
│  │ ├─ era_key          │      │ └─ connection_type   │      │
│  │ ├─ tags             │      └──────────────────────┘      │
│  │ ├─ core_concept     │                                     │
│  │ └─ period_order     │      RLS Policies:                 │
│  └─────────────────────┘      ✅ SELECT (public)             │
│                               ✅ INSERT/UPDATE (auth)        │
│                               ❌ Everything else             │
│                                                               │
│  Views (for optimization):                                   │
│  ├─ sages_with_stats (includes connection_count)           │
│  └─ connections_with_names (includes sage names)           │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### 1. Create `config.js` from Template

```bash
cd /path/to/ozar-chachamim
cp config.example.js config.js
```

### 2. Find Your Supabase Credentials

1. Go to https://app.supabase.com
2. Select your project
3. Click **Settings** → **API**
4. Copy the values:
   - **Project URL** (example: `https://yourproject.supabase.co`)
   - **anon public** key (starts with `sb_publishable_...`)

### 3. Edit `config.js`

```javascript
export const SUPABASE_CONFIG = {
  url: 'https://yourproject.supabase.co',      // Your Project URL
  anonKey: 'sb_publishable_ABC123...'          // Your anon public key
}
```

### 4. Verify `.gitignore` Protects Secrets

Check that `config.js` is in `.gitignore`:
```bash
grep "config.js" .gitignore
# Should print: config.js
```

## Data Loading & Validation

### Master Initialization: `initializeApp()`

Located in `supabase-client.js`, this function:

1. **Loads sages** from `sages_with_stats` view (or fallback to `sages` table)
2. **Loads connections** from `connections_with_names` view (or fallback to `connections` table)
3. **Validates referential integrity** — enforces that every connection's `source_id` and `target_id` exist in the loaded sages
4. **Builds global state** — populates `window.graphData` as the single source of truth
5. **Emits ready signal** — fires `supabaseReady` event for all tabs to initialize

### Defensive FK Validation

**Problem:** If a connection record references a sage that doesn't exist (FK violation), the app crashes with "node not found" errors.

**Solution:** Pre-validation filtering (lines 168-191 in supabase-client.js)

```javascript
// Build ID set from loaded sages
const sageMap = new Map(sages.map(s => [String(s.id), s]))
const validSageIds = new Set(sageMap.keys())

// Filter connections — keep only valid ones
const validConnections = connections.filter(c => {
  const sourceId = String(c.source_id)
  const targetId = String(c.target_id)
  const valid = validSageIds.has(sourceId) && validSageIds.has(targetId)
  
  if (!valid) {
    console.warn(`⚠️ Invalid connection: ${sourceId} → ${targetId}`)
  }
  return valid
})
```

**Result:**
- ✅ All 25 connections validated
- ⚠️ Invalid connections filtered with warning logs
- 🎯 `window.graphData.links` contains only safe, verified connections

### Transformation to Unified Format

Raw Supabase data → App-ready format:

```javascript
// Sages: Keep all fields, add computed properties
const nodes = sages.map(s => ({
  id: String(s.id),               // Always string for consistency
  label: s.name_he,               // Hebrew name (primary)
  name_he: s.name_he,
  name_en: s.name_en || '',
  
  era: s.era,                     // Historical period
  era_key: s.era_key,             // Machine-readable key
  group: s.era_key,               // D3 group for coloring
  period_order: s.period_order,   // Chronological sort order
  
  region: s.region,               // Geographic area
  coordinates: s.coordinates,     // JSONB: {lat, lng}
  primary_field: s.primary_field, // Academic discipline
  
  tags: s.tags,                   // Comma-separated concepts
  summary: s.summary,             // Biography snippet
  core_concept: s.core_concept,   // Central idea/innovation
  
  spotify_url: s.spotify_url,     // External link
  connection_count: s.connection_count,  // Stats from view
  has_research: s.has_research           // Flag for research_content table
}))

// Connections: Minimal but complete
const links = validConnections.map(c => ({
  source: String(c.source_id),           // Always string
  target: String(c.target_id),           // Always string
  type: c.connection_type || 'colleague', // Relationship type
  historical_period: c.historical_period // Optional: when active
}))
```

## Data Queries

### Direct Queries (Advanced Usage)

For on-demand data fetching, use `window.supabase` (exported from supabase-client.js):

```javascript
// Load a specific sage's research
const { data, error } = await window.supabase
  .from('research_content')
  .select('*')
  .eq('sage_id', sageId)
  .single()

// Search across all sages (future: full-text search)
const { data, error } = await window.supabase
  .from('sages')
  .select('*')
  .ilike('name_he', '%רמבם%')  // Case-insensitive like
```

### Search Index (Token-based)

Built during initialization, provides instant cross-field search:

```javascript
// Example: Find all sages related to "חוק"
const result = await semanticSearch('חוק')
// Returns:
// {
//   sages: [...],           // Matching sages
//   connections: [...],     // Edges involving matched sages
//   stats: { matched: 12, ... }
// }
```

## Monitoring & Debugging

### Console Logs During Initialization

Open browser DevTools (F12) and check Console tab:

```
✅ 🔌 [Supabase] Connecting to ulluacifirzywhmzkvkr.supabase.co
✅ 📚 Loading sages from Supabase...
✅ ✓ Loaded 992 sages (with stats from view)
✅ 🔗 Loading connections from Supabase...
✅ ✓ Loaded 25 connections (from enriched view)
✅ 📋 [Validation] Loaded 992 sages, validating 25 connections...
✅ ✓ 25/25 connections validated
✅ [AppInit] Single Source Ready: 323 nodes + 25 validated edges
✅ 🔍 [SearchIndex] Built index with 2,847 unique tokens
✅ supabaseReady event fired
```

### Common Issues

**❌ "Error: config is not defined"**
- Solution: Create `config.js` from `config.example.js`
- Verify it exports `SUPABASE_CONFIG` with `url` and `anonKey`

**❌ "Supabase client error: invalid URL"**
- Solution: Check `config.js` — Project URL must be valid and complete
- Format: `https://yourproject.supabase.co`

**❌ "Error: Invalid API Key"**
- Solution: Check that you're using the `anon public` key, not the secret key
- Found in: Supabase Settings > API > "anon public"

**❌ "⚠️ Invalid connection: 123 → 456"**
- This is normal — indicates an orphaned connection record
- Check Supabase: sage 123 or 456 may have been deleted
- Fix: Delete the connection record in Supabase UI

**❌ "node not found" error on graph"**
- Should NOT happen with defensive validation
- If it does: Check browser console for validation warnings
- Report bug with: Connection IDs that couldn't be validated

## Security Checklist

- ✅ `config.js` is in `.gitignore` — never commit credentials
- ✅ Using `anon public` key (read-only via RLS) — safe in browser
- ✅ RLS policies enforced on database — access control server-side
- ✅ No hardcoded keys in source code — all from config.js
- ✅ HTTPS used in production — keys encrypted in transit

## Next Steps

1. **[Done]** Set up config.js with credentials
2. **[Next]** Run `python -m http.server 8080`
3. **[Next]** Verify console logs show all ✅ markers
4. **[Optional]** Test search across 5 tabs
5. **[Optional]** Add/modify sages via Supabase UI, refresh page
6. **[Future]** Deploy to Vercel/Netlify with environment variables

## Files Reference

| File | Purpose | Credentials? |
|------|---------|------|
| `config.example.js` | Template (COMMIT this) | No |
| `config.js` | Your credentials (DON'T commit) | Yes ⚠️ |
| `supabase-client.js` | Data loading logic (COMMIT) | No — reads from config.js |
| `.env.example` | Vite config template | No |
| `.gitignore` | Protects config.js | — |

---

**Questions?** Check browser DevTools Console for detailed logs, or see CLAUDE.md for architecture overview.
