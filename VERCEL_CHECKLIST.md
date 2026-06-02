# Vercel Deployment Checklist

Quick reference for deploying אוצר חכמים to production.

---

## Pre-Deployment (Local)

- [ ] All code committed: `git status` shows clean
- [ ] vercel.json exists and configured
- [ ] package.json has build script
- [ ] build.js script exists
- [ ] .gitignore includes config.js and .env files
- [ ] Test build locally:
  ```bash
  VITE_SUPABASE_URL="..." VITE_SUPABASE_ANON_KEY="..." npm run build
  ```

---

## Vercel Dashboard Setup

### Access Vercel

- [ ] Create account at https://vercel.com (free tier)
- [ ] Connect GitHub account

### Import Project

- [ ] Click **"+ New Project"**
- [ ] Select `ozar-chachamim` repository
- [ ] Click **"Import"**

### Configure Environment Variables

**Add these two variables:**

1. **Variable Name:** `VITE_SUPABASE_URL`
   - **Value:** Your Supabase project URL
   - **Find at:** https://app.supabase.com → Your Project → Settings > API → "Project URL"
   - **Example:** `https://abc123xyz.supabase.co`

2. **Variable Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** Your Supabase anonymous public key
   - **Find at:** https://app.supabase.com → Your Project → Settings > API → "anon public"
   - **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (much longer)

- [ ] Verify both variables are set
- [ ] Click **"Deploy"**

---

## During Deployment

- [ ] Monitor build logs in Vercel dashboard
- [ ] Wait for completion (usually 1-3 minutes)
- [ ] Vercel shows production URL when ready

---

## Post-Deployment Testing

### Functionality

- [ ] Page loads without 404 errors
- [ ] Graph tab renders (sages visible)
- [ ] Map tab shows markers + migration paths
- [ ] Search works across all tabs
- [ ] Click a sage → sidebar opens
- [ ] Research content displays in sidebar
- [ ] "Read Full Research" button opens research-view.html
- [ ] Mobile responsive (test on narrow viewport)

### Browser Console (F12)

Look for:

- ✅ `🔌 [Supabase] Connecting to...` (connection successful)
- ✅ `📚 Loading sages from Supabase...` (data loading)
- ✅ `✓ [AppInit] Single Source Ready: 323 nodes` (all data loaded)

Should NOT see:

- ❌ `Cannot read property of undefined`
- ❌ `Supabase connection failed`
- ❌ 404 errors for assets

---

## Post-Deployment Actions

### Analytics

- [ ] Visit Vercel dashboard → Project → Analytics
- [ ] Monitor page load times, error rates, traffic patterns

### Custom Domain (Optional)

- [ ] Go to **Settings → Domains**
- [ ] Add your custom domain
- [ ] Configure DNS records

### Redeploy Settings

- [ ] Verify auto-redeploy on push is enabled
  - Settings → Git → "Deploy on push" should be ON

---

## If Something Goes Wrong

### Build fails

1. Check build logs: **Deployments** → failed build → **Build Logs**
2. Most likely: Missing or invalid environment variables
3. Fix: Go to **Settings → Environment Variables** → update values
4. Redeploy: Click **"Redeploy"** button

### Site shows blank or errors

1. Open browser console (F12)
2. Look for error messages
3. Likely causes:
   - Supabase credentials invalid → update env vars
   - Supabase project paused → check at supabase.com
   - Network issue → try from different network

### Graph doesn't load but page loads

1. Check Supabase project is running (green status)
2. Verify credentials haven't changed
3. Test query: Open https://your-url and check console

### Deep page refresh shows 404

1. Verify `vercel.json` has correct rewrites:
   ```json
   "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   ```
2. Commit and redeploy

---

## Rollback (If Needed)

If latest deployment is broken:

1. Go to **Deployments** tab
2. Find the previous working deployment
3. Click **"..." → "Promote to Production"**
4. Site instantly reverts (no rebuild needed)

---

## Environment Variables Reference

### What they're used for

- **VITE_SUPABASE_URL**: Tells the app where to find the database
- **VITE_SUPABASE_ANON_KEY**: Public authentication key for read-only access

### Security

✅ These variables are public by design (meant for browsers)
✅ Supabase RLS policies restrict what users can access
✅ Secrets are never exposed in source code

### If you need to rotate keys

1. Generate new keys in Supabase
2. Update in Vercel: **Settings → Environment Variables**
3. Vercel auto-redeploys with new credentials

---

## Performance Metrics (Expected)

After deployment, you should see:

- **Time to First Byte:** <100ms
- **Full Page Load:** <2 seconds
- **Lighthouse Score:** 90+
- **Core Web Vitals:** All green

Check in **Analytics** tab.

---

## Success Indicators

You know it's working when:

✅ Production URL is live
✅ All 323 sages load
✅ Search updates all tabs instantly
✅ Mobile view works (tabs scroll, sidebar slides)
✅ Research content displays
✅ No console errors
✅ Analytics show traffic

---

## Support Resources

- Vercel status: https://vercel.com/status
- Supabase status: https://status.supabase.com
- Troubleshooting: See DEPLOYMENT.md

---

**You've got this! 🚀**

