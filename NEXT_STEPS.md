# שלבים הבאים - Ozar Chachamim Phase 1

## הדברים שצריך לעשות:

### 1️⃣ Supabase Setup (עכשיו)
- [ ] עבור ל-supabase.com ו-sign up (בחינם)
- [ ] צור project בשם "ozar-chachamim"
- [ ] בSQL Editor, הדבק את הסכימה מ-`supabase-schema.sql`
- [ ] Copy את `Project URL` ו-`anon key` מ-Settings → API

### 2️⃣ Add Auth to index.html (עם Claude)
```bash
cd ozar-chachamim
claude
```

תגיד:
```
I want to add Supabase authentication to index.html.
I have Supabase URL and anon key (from Step 1).
Add: login form + history tracking + bookmark button.
```

### 3️⃣ Deploy to Vercel
- [ ] Push to GitHub: `git push`
- [ ] Vercel redeploys automatically
- [ ] Add environment variables in Vercel dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4️⃣ Test
- [ ] Sign up with test email
- [ ] View a few sages (should save history)
- [ ] Bookmark a sage
- [ ] Log out and log back in (history persists ✅)

---

## Supabase Credentials (save somewhere safe)

```
Project URL: _________________
Anon Key: _________________
```

---

Estimated time: **1-2 hours** (mostly waiting for Supabase to spin up)
