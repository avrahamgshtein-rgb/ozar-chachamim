# Vercel Dashboard Configuration — Step-by-Step

This guide shows you the exact clicks and inputs needed to deploy on Vercel.

---

## Step 1: Sign Up / Log In

**Visit:** https://vercel.com

**Click:**
- If you don't have an account: **"Sign Up"** → Select **"Continue with GitHub"**
- If you have an account: **"Log In"** → Select **"Continue with GitHub"**

**Result:** You're logged into Vercel and see the dashboard with "Welcome" and "+ New Project" button

---

## Step 2: Create New Project

**Current page:** Vercel dashboard

**Click:** **"+ New Project"** (top right)

**Result:** Page shows "Select a Git Repository"

---

## Step 3: Find Your Repository

**Current page:** "Select a Git Repository"

You'll see a list of your GitHub repositories.

**Find:** `ozar-chachamim` in the list

**Click:** The `ozar-chachamim` repository

**Result:** Page shows import settings and project name

---

## Step 4: Configure Project Settings

**Current page:** "Import Project"

Verify these are already set:

| Setting | Expected Value | ✓ |
|---------|----------------|---|
| **Framework Preset** | (none - static site) | |
| **Build Command** | `npm run build` | |
| **Output Directory** | `public` (if shown) | |

**Note:** These might already be filled in. Don't change them unless they're wrong.

**Click:** Continue to next section (scroll down)

---

## Step 5: Add Environment Variables ⭐ CRITICAL

**Current page:** Still on Import dialog (scroll down if needed)

**Section:** "Environment Variables"

You need to add TWO variables. Here's how:

### Variable 1: VITE_SUPABASE_URL

**In the form, type:**

| Field | Value |
|-------|-------|
| **Name** | `VITE_SUPABASE_URL` |
| **Value** | Your Supabase project URL |

**How to get the Value:**

1. Open new tab: https://app.supabase.com
2. Log in to Supabase
3. Click your project name (left sidebar)
4. Go to **Settings** (gear icon, bottom left)
5. Click **"API"** (in left sidebar)
6. Look for section "Project API keys"
7. Copy the line that says **"Project URL"**
   - It looks like: `https://abc123xyz.supabase.co`
8. Paste it into the **Value** field in Vercel
9. Click **"Add"** button

### Variable 2: VITE_SUPABASE_ANON_KEY

**In the form, type:**

| Field | Value |
|-------|-------|
| **Name** | `VITE_SUPABASE_ANON_KEY` |
| **Value** | Your Supabase anon public key |

**How to get the Value:**

1. Still on Supabase Settings > API page
2. Look for section "Project API keys"
3. Find the key labeled **"anon public"**
   - It's a long string starting with `eyJ...`
4. Click the copy icon next to it
5. Go back to Vercel tab
6. Paste it into the **Value** field
7. Click **"Add"** button

**Result after both variables:**

You should see two rows in the Environment Variables section:

```
Name: VITE_SUPABASE_URL
Value: https://abc123xyz.supabase.co

Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (long string)
```

---

## Step 6: Deploy

**Current page:** Import dialog with both environment variables added

**Review:**
- [ ] Project name: `ozar-chachamim` (or your preference)
- [ ] Framework: (blank for static site)
- [ ] Build Command: `npm run build`
- [ ] Environment Variables: Both variables added

**Click:** **"Deploy"** button (blue, bottom right)

**Result:** Vercel starts building your project

---

## Step 7: Monitor the Build

**Current page:** Deployment page with build logs

You'll see:

```
Building... [████████░░░░░░░░░░] 40%
Building... [████████████████░░░░░] 85%
Build Complete ✓
```

**Watch for:**
- ✅ Build succeeds (shows checkmark)
- ✅ Deployment completes
- ❌ No errors in the log

**If build fails:**
- Look at the error message
- Usually: missing environment variable
- Fix: Edit environment variables and redeploy

**Result:** You see a screen that says "Congratulations!" with your production URL

---

## Step 8: Get Your Production URL

**Current page:** Deployment success screen

Your URL appears prominently. It looks like:

```
https://ozar-chachamim-abc123.vercel.app
```

**Bookmark this URL** — this is your live site!

---

## Step 9: Test the Live Site

**Click:** Your production URL

**Open the page and verify:**

- [ ] Page loads (no 404 errors)
- [ ] Graph tab shows sages
- [ ] Map shows markers
- [ ] Search works
- [ ] Click a sage → sidebar opens
- [ ] Research content displays
- [ ] No red errors in console (F12)

**If something's wrong:**
1. Press F12 to open browser console
2. Look for error messages
3. Common causes:
   - Supabase URL or key is wrong → Update in Vercel
   - Supabase project is paused → Check at supabase.com
   - Database is empty → Load data in Supabase

---

## (Optional) Step 10: Add Custom Domain

If you own a domain like `ozar-chachamim.com`:

**In Vercel dashboard:**

1. Click your project
2. Go to **Settings** tab
3. Click **"Domains"** (left sidebar)
4. Type your domain name
5. Click **"Add"**
6. Follow the DNS setup instructions

**Result:** Your site is also available at your custom domain

---

## After Deployment

### Environment Variables Need Updating?

If you rotate Supabase keys:

**In Vercel dashboard:**

1. Click your project
2. Go to **Settings** tab
3. Click **"Environment Variables"** (left sidebar)
4. Click the variable you want to change
5. Edit the **Value** field
6. Click **"Save"**
7. Vercel automatically redeploys with new credentials

### Rollback to Previous Version?

If something breaks in production:

**In Vercel dashboard:**

1. Click your project
2. Go to **Deployments** tab
3. Find the previous working deployment
4. Click **"..." (three dots)**
5. Select **"Promote to Production"**
6. Site instantly rolls back (no rebuild needed)

---

## Reference: What the Variables Do

### VITE_SUPABASE_URL
- **What it is:** Address of your Supabase server
- **Format:** `https://projectname.supabase.co`
- **Used by:** supabase-client.js to connect to database
- **Secret?** No — it's part of the URL you visit anyway

### VITE_SUPABASE_ANON_KEY
- **What it is:** Public API key for browser access
- **Format:** Long string starting with `eyJ...`
- **Used by:** Supabase client to authenticate requests
- **Secret?** Technically no, but don't share it widely. It's public by design (meant for browser), but it identifies YOUR project.

### Why Two Variables?

The build script (`build.js`) reads these two variables and:
1. Generates a config.js file with them
2. This config.js is only created during build (not in git)
3. It's injected into the production build
4. The browser loads it and connects to your database

---

## Troubleshooting the Dashboard

### Can't Find the Environment Variables Section?

**If the form looks different:**
- You might be on the wrong step
- Go back and click "Import" for the `ozar-chachamim` repo again
- Or:
  1. Click your project
  2. Go to **Settings** tab
  3. Look for **"Environment Variables"** on the left

### Environment Variables Aren't Being Saved?

- Make sure you click **"Add"** after typing each value
- Refresh the page
- Try again

### Build Failed with "Cannot find module"?

- This won't happen with our setup (no npm modules)
- If you see it: click the project, go to **Settings → Environment Variables**, verify both variables are present

### The "Deploy" Button is Grayed Out?

- You need at least one environment variable (or none)
- Make sure both variables are added
- Click somewhere else first, then back to see if button becomes clickable

---

## Copy-Paste Checklist

**Exact values to copy from Supabase → Vercel:**

### From Supabase (https://app.supabase.com)

**Your Project → Settings → API**

```
Your Project URL: 
https://__________________.supabase.co

anon public key:
eyJ________________________________________________________________
```

### To Vercel (https://vercel.com)

**Environment Variables section:**

```
Variable 1:
  Name:  VITE_SUPABASE_URL
  Value: https://__________________.supabase.co

Variable 2:
  Name:  VITE_SUPABASE_ANON_KEY
  Value: eyJ________________________________________________________________
```

---

## What Happens Behind the Scenes

When you click "Deploy":

1. **Vercel receives** your two environment variables
2. **Vercel clones** your code from GitHub
3. **Vercel runs** `npm run build`
4. **build.js script:**
   - Reads VITE_SUPABASE_URL from environment
   - Reads VITE_SUPABASE_ANON_KEY from environment
   - Creates `config.js` with these values
   - Validates all assets exist
   - Outputs to `public/` directory
5. **Vercel deploys:**
   - Uploads files to global CDN
   - Generates HTTPS certificate
   - Assigns you a URL
   - Sets up routing (SPA support)
6. **Your site is live!**
   - Users access it from anywhere in the world
   - Vercel's CDN serves it from the nearest server
   - Your app connects to Supabase for data

---

## Success Indicators

You know it worked when:

✅ Vercel dashboard shows green "Ready" status
✅ You can visit your production URL without errors
✅ All 323 sages load on the graph
✅ Search works
✅ Sidebar opens when you click a sage
✅ Research content displays
✅ No red errors in browser console (F12)

---

## Common Mistakes

### ❌ Mistake 1: Wrong Variable Names

**Wrong:**
```
Name: SUPABASE_URL (missing VITE_ prefix)
Name: SUPABASE_KEY (should be VITE_SUPABASE_ANON_KEY)
```

**Right:**
```
Name: VITE_SUPABASE_URL
Name: VITE_SUPABASE_ANON_KEY
```

**Fix:** Edit the variables in Vercel Settings → Environment Variables

### ❌ Mistake 2: Copied the Secret Key Instead of Anon Key

**Supabase dashboard shows multiple keys. Make sure you copy:**
- ✅ The "**anon public**" key (allowed in browser)
- ❌ NOT the "**service_role**" key (admin only, never expose!)

**How to tell:**
- Anon key: Shorter, you see it on the public dashboard
- Service role key: Longer, hidden under a "Reveal" button, for backend only

### ❌ Mistake 3: Extra Spaces or Special Characters

**Example:** `https://project.supabase.co ` (extra space at end)

This will cause connection failures.

**Fix:** Double-check there are no spaces before/after the values

---

## Need Help?

### During Deployment

Check the Vercel build log:

1. Click your project
2. Click the deployment that failed
3. View the build log
4. Search for "error" in red text
5. That's usually the issue

### After Deployment

**If the site doesn't load:**
1. Open browser console (F12)
2. Look for error messages
3. Common ones:
   - "Cannot read property 'url' of undefined" → config.js not loaded
   - "Supabase connection failed" → wrong credentials
   - "RLS policy violation" → Supabase RLS needs fixing

---

## You're Ready! 🚀

You have everything you need. Just follow Steps 1-8, and your site will be live in minutes.

**Questions?** See the full guide: `DEPLOYMENT.md`

