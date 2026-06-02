# Ozar Chachamim — Production Deployment Guide

## Overview

This guide walks you through deploying the אוצר חכמים (Ozar Chachamim) platform to Vercel, a global serverless deployment platform perfect for static sites with API backends.

**Estimated deployment time:** 10 minutes

---

## Prerequisites

✅ **Before you start, ensure you have:**

1. A Vercel account (free tier supports this project)
   - Sign up: https://vercel.com/signup

2. A Supabase project with populated data
   - Your Supabase project URL
   - Your Supabase anonymous public key
   - All 323 sages loaded into the database

3. A GitHub repository with this code
   - Must be public or Vercel must have access
   - Code should be on your default branch (main)

---

## Part 1: Prepare Your Code for Deployment

### Step 1.1: Verify the deployment files exist

These files configure how Vercel builds and serves your app:

```bash
# Check that these files exist in your project root:
ls -la vercel.json        # ✅ Routing & caching rules
ls -la package.json       # ✅ Build script definition
ls -la build.js           # ✅ Build script (generates config.js)
ls -la validate-config.js # ✅ Validation script
```

**Expected output:**

```
-rw-r--r-- vercel.json
-rw-r--r-- package.json
-rw-r--r-- build.js
-rw-r--r-- validate-config.js
```

### Step 1.2: Test the build locally (optional but recommended)

Before deploying to Vercel, test the build process locally:

```bash
# Set your Supabase credentials
export VITE_SUPABASE_URL="https://your-project.supabase.co"
export VITE_SUPABASE_ANON_KEY="your-anon-key-here"

# Run the build script
npm run build

# Validate the configuration
npm run validate
```

**Expected output:**

```
✅ [BUILD] Starting production build...
✅ Environment variables validated
✅ Generated config.js from environment variables
✅ All essential assets present
✨ Build complete! Ready for Vercel deployment.
```

### Step 1.3: Commit everything to git

```bash
git add -A
git commit -m "chore: add Vercel deployment configuration"
git push origin main
```

**Do NOT commit:**
- ❌ `config.js` (it's in .gitignore)
- ❌ `.env` files
- ❌ `node_modules/` (Vercel installs dependencies)

---

## Part 2: Connect Vercel to Your GitHub Repository

### Step 2.1: Log in to Vercel

1. Go to https://vercel.com
2. Click **"Log in"** (top right)
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

### Step 2.2: Import your project

1. Once logged in, click **"+ New Project"**
2. Find your `ozar-chachamim` repository
3. Click **"Import"**

Vercel will automatically detect:
- ✅ `vercel.json` (deployment settings)
- ✅ `package.json` (Node.js project)
- ✅ Build command: `npm run build`

### Step 2.3: Configure environment variables

**This is the critical step.** Your Supabase credentials go here:

1. **Still in the Import dialog**, scroll down to **"Environment Variables"**

2. **Add two variables:**

   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | `https://your-project.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `your-anon-key-here` |

3. **How to find your credentials:**

   a) Log in to https://app.supabase.com
   
   b) Select your project
   
   c) Go to **Settings > API**
   
   d) Copy:
      - **"Project URL"** → paste into `VITE_SUPABASE_URL`
      - **"anon public"** key → paste into `VITE_SUPABASE_ANON_KEY`

4. Click **"Deploy"** (bottom right)

---

## Part 3: Monitor the Deployment

### Step 3.1: Watch the build process

Vercel will now:

1. Clone your repository
2. Run `npm run build` (generates config.js from env vars)
3. Collect all static assets
4. Deploy to Vercel's global CDN

You'll see a build log in real-time. Look for:

```
✅ Build succeeded
✅ Config file generated
✅ Assets deployed to edge network
```

### Step 3.2: Verify the deployment

Once the build completes (usually 1-3 minutes):

1. Vercel will show your **Production URL**:
   ```
   https://ozar-chachamim.vercel.app
   ```

2. Click the link to visit your live site

3. **Test the key features:**
   - [ ] Page loads (no 404 errors)
   - [ ] Graph tab renders with sages
   - [ ] Map shows markers
   - [ ] Search works across all tabs
   - [ ] Clicking a sage opens sidebar
   - [ ] Research content displays
   - [ ] Mobile responsive (try narrowing browser)

---

## Part 4: Custom Domain (Optional)

If you want a custom domain instead of `vercel.app`:

1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Domains"**
3. Add your domain:
   - If it uses **Vercel DNS**: Follow the setup wizard
   - If you have an **external registrar**: Add the CNAME record they show

Example custom domain: `ozar-chachamim.com`

---

## Part 5: Ongoing Maintenance

### Redeploying updates

Every time you push to `main`, Vercel automatically redeploys:

```bash
git commit -am "feat: add new feature"
git push origin main

# Vercel will automatically:
# 1. Run npm run build
# 2. Generate new config.js from env vars
# 3. Deploy updated assets
```

### Updating Supabase credentials

If you ever need to rotate your Supabase keys:

1. Go to Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Update `VITE_SUPABASE_ANON_KEY` (or URL if changed)
5. Click **"Save"**
6. Vercel will **automatically redeploy** with new credentials

### Monitoring

Vercel provides built-in monitoring:

- **Analytics**: Edge function performance, traffic patterns
- **Logs**: Build logs, function execution logs
- **Activity**: Deployment history
- **Speed Insights**: Page load performance by geography

Access these in your project's **Analytics** tab.

---

## Troubleshooting

### Issue: Build fails with "config.js not found"

**Cause:** Environment variables not set
**Fix:** 
1. Go to Vercel → Project Settings → Environment Variables
2. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
3. Redeploy: Click **"Redeploy"** in Deployments

### Issue: "Cannot read property of undefined" in console

**Cause:** Supabase credentials are invalid or missing
**Fix:**
1. Open browser DevTools (F12)
2. Check console for exact error
3. Verify credentials in Supabase dashboard
4. Update environment variables in Vercel
5. Redeploy

### Issue: Graph doesn't load, "Supabase connection failed"

**Cause:** 
- Credentials are wrong
- Supabase project is paused
- Network/CORS issue
**Fix:**
1. Verify Supabase project is running (not paused)
2. Check credentials match exactly (copy-paste, no extra spaces)
3. Test locally: `VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run build`

### Issue: Page shows 404 after refresh on deep routes

**Cause:** SPA routing not configured
**Fix:** Verify `vercel.json` has rewrites section:
```json
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
```

---

## Security Checklist

✅ **Before going live, verify:**

- [ ] `config.js` is in `.gitignore` (never commit secrets)
- [ ] Environment variables are set in Vercel (not in code)
- [ ] Supabase RLS policies restrict data access properly
  - Anonymous users can only SELECT public tables
  - Authenticated users can modify bookmarks/history
- [ ] HTTPS is enabled (Vercel does this automatically)
- [ ] Rate limiting is configured (if expecting high traffic)

---

## Performance Optimization

Vercel + your setup is already optimized:

✅ **What we've done:**
- Static site deployment (instant response times)
- Global CDN (content served from nearest edge location)
- Cache headers configured:
  - HTML: no-cache (always fresh)
  - Assets (.js, .css): 1-year cache (immutable)
- Gzip compression enabled automatically

✅ **Expected performance:**
- Time to First Byte: <100ms
- Fully loaded: <2 seconds
- Lighthouse score: 90+

---

## Monitoring & Analytics

### View deployment metrics

1. Go to https://vercel.com
2. Click your project
3. Open **"Analytics"** tab
4. See:
   - Traffic patterns
   - Response times by region
   - Error rates
   - Popular routes

### Set up alerts (optional)

Vercel can notify you of:
- Build failures
- Excessive error rates
- Performance degradation

Configure in **Project Settings** → **Notifications**

---

## Rollback to previous deployment

If something breaks:

1. Go to **Deployments** tab
2. Find the previous working deployment
3. Click **"..." → "Promote to Production"**

This instantly rolls back without rebuilding.

---

## Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Verify deployment files exist | 1 min |
| 2 | Test build locally (optional) | 3 min |
| 3 | Commit & push to GitHub | 1 min |
| 4 | Create Vercel project | 2 min |
| 5 | Set environment variables | 2 min |
| 6 | Monitor deployment | 2 min |
| **Total** | **End-to-end deployment** | **~10-15 min** |

---

## Support

**If you encounter issues:**

1. Check Vercel logs: **Deployments** → click failed deployment → **Build Logs**
2. Verify Supabase is running: https://app.supabase.com
3. Test locally: Set env vars and run `npm run build`
4. Check browser console (F12) for client-side errors

**Resources:**
- Vercel docs: https://vercel.com/docs
- Supabase docs: https://supabase.com/docs
- Troubleshooting: https://vercel.com/support

---

## What's Next

After successful deployment:

1. **Set up a custom domain** (if you have one)
2. **Monitor analytics** to understand user behavior
3. **Plan Phase 6 features:**
   - Advanced full-text search
   - User personalization
   - Export/sharing functionality

---

**Congratulations! Your אוצר חכמים platform is now live! 🎉**

