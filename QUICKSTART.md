# Quick Start — אוצר חכמים Supabase Setup

## 🚀 Get Running in 5 Minutes

### Step 1: Create Config
```bash
cp config.example.js config.js
```

### Step 2: Get Credentials
1. Go to https://app.supabase.com
2. Select your project
3. Settings → API
4. Copy:
   - Project URL: `https://yourproject.supabase.co`
   - anon public key: `sb_publishable_...`

### Step 3: Edit config.js
```javascript
export const SUPABASE_CONFIG = {
  url: 'https://yourproject.supabase.co',      // Paste Project URL
  anonKey: 'sb_publishable_ABC123...'          // Paste anon public key
}
```

### Step 4: Run Server
```bash
python -m http.server 8080
```

### Step 5: Open Browser
```
http://localhost:8080
```

### Step 6: Verify Console (F12)
Look for these ✅ messages:
```
✅ 🔌 [Supabase] Connecting to yourproject.supabase.co
✅ 📚 Loading sages from Supabase...
✅ ✓ Loaded 992 sages
✅ 🔗 Loading connections from Supabase...
✅ ✓ Loaded 25 connections
✅ ✓ 25/25 connections validated
✅ [AppInit] Single Source Ready: 323 nodes + 25 edges
✅ supabaseReady event fired
```

**If you see all ✅ above: SUCCESS! 🎉**

---

## 📁 Key Files

| File | Purpose | Edit? |
|------|---------|-------|
| `config.example.js` | Template | ❌ NO |
| `config.js` | YOUR credentials | ⚠️ YES (keep secret) |
| `supabase-client.js` | Data loading | ❌ NO (use as-is) |

---

## 🔑 Security Reminders

✅ **Safe to share:**
- Project URL (it's public)
- Anon key (read-only, RLS protected)

❌ **NEVER share:**
- Secret key
- Service role key
- Master password

✅ **Always:**
- Keep `config.js` in `.gitignore`
- Never commit credentials
- Use HTTPS in production

---

## 🐛 Common Issues

### "config is not defined"
```bash
→ Run: cp config.example.js config.js
```

### "Invalid API Key"
```
→ Use ANON key (Settings > API > "anon public")
→ NOT the secret key
```

### "⚠️ Invalid connection"
```
→ This is normal — orphaned records in database
→ Check console for which connections were filtered
```

### "node not found" error
```
→ Report as bug — should not happen with validation
→ Include browser console logs
```

---

## 📖 For More Info

- **Setup Details:** See `BACKEND_SETUP.md`
- **Architecture:** See `CLAUDE.md` → Supabase Integration
- **Implementation:** See `IMPLEMENTATION_SUMMARY.md`

---

## ✅ Checklist

- [ ] Created `config.js` from example
- [ ] Pasted Supabase credentials
- [ ] Server running on localhost:8080
- [ ] Console shows all ✅ messages
- [ ] Can see graph with sages
- [ ] Can search across 5 tabs

**All checked? You're done! 🚀**

---

**Need help?** Check the console (F12) for detailed logs, or see BACKEND_SETUP.md for debugging guide.
