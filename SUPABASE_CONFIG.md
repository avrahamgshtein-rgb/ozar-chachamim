# Configure index.html with Supabase Credentials

After you create your Supabase project and import the data, follow these steps:

## Step 1: Get Your Credentials

In Supabase:
1. Go to **Settings → API**
2. Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
3. Copy **anon public key** (e.g., `eyJ...`)

## Step 2: Update index.html

Open `index.html` and find this section (around line 369-373):

```javascript
/* ─── SUPABASE ─── */
const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace with your actual values:

```javascript
/* ─── SUPABASE ─── */
const SUPABASE_URL = 'https://abcdef123456.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## Step 3: Test Locally

```bash
python -m http.server 8000
# Open http://localhost:8000
```

Should show:
- ⏳ "טוען מידע..." loading message briefly
- Then 992 sage cards with pagination (20 per page)
- Search + filter working
- All 3 views (grid, network, geo)

## Step 4: Deploy to Vercel

Option A: **If using environment variables** (recommended):

1. Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**
2. Add:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://abcdef123456.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   ```
3. Update `index.html` to read from env:
   ```javascript
   const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
   const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
   ```
4. Push to GitHub → auto-redeploy

Option B: **If hardcoding in HTML**:

1. Update credentials in `index.html` (as above)
2. Commit and push to GitHub
3. Vercel auto-deploys

## Features After Configuration

✅ **Grid View** — 992 sages with pagination (20/page)  
✅ **Search** — By name, tags, period, location  
✅ **Period Filter** — בית שני, תנאים, ראשונים, אחרונים, עת חדשה  
✅ **Network View** — Force graph with teacher/student edges  
✅ **Geo View** — 11 geographic regions with sage lists  
✅ **Modal** — Deep research async loading (from DATA/ folder)  
✅ **User History** — Coming soon (Phase 1 auth + Supabase integration)

## Fallback Mode

If Supabase is not configured or fails to connect:
- App falls back to embedded 44 sages (development/testing)
- All features still work
- No error messages, seamless experience

## Troubleshooting

**"טוען מידע..." hangs forever**
- Check browser console (F12) for errors
- Verify SUPABASE_URL and SUPABASE_KEY are correct
- Check CORS in Supabase (Settings → API → CORS)
- Verify sages table exists and has data

**"לא נמצאו חכמים" (no sages found)**
- Check that import_to_supabase.py completed successfully
- In Supabase SQL: `SELECT COUNT(*) FROM sages;` should be 992

**Cards show empty fields**
- Check that all columns exist in Supabase schema
- Run: `SELECT * FROM sages LIMIT 1;` to verify data

---

Next: [[site-redesign-v2]] updated with DB-driven 992 sages + research content
