# 🚀 Local Testing - START HERE

**Status:** Everything is ready to test locally RIGHT NOW

---

## Step 1: Start Local Server (60 seconds)

### On Mac/Linux:
```bash
cd ~/Desktop/ozar-chachamim
python -m http.server 8080
```

### On Windows:
```bash
cd C:\Users\[YourName]\Desktop\ozar-chachamim
python -m http.server 8080
```

**Result:** You should see:
```
Serving HTTP on 0.0.0.0 port 8080 (http://0.0.0.0:8080/) ...
```

---

## Step 2: Open in Browser

**Visit:** http://localhost:8080

**Must do:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

---

## Step 3: Test Each Feature (2 minutes)

### ✅ Test 1: Connection Strength Slider
1. Look at OPTIONS PANEL (under header)
2. Find "🔗 Connection Strength:" slider
3. Drag slider from 0% to 50%
4. Expected: Graph links fade slightly, console shows "🔗 Connection Strength: 50%"

### ✅ Test 2: Visual Density Buttons
1. Find "🎨 Density:" buttons (Sparse / Normal / Dense)
2. Click "Dense"
3. Expected: Nodes grow larger, button highlights blue

### ✅ Test 3: Layout Switching
1. Find "📐 Layout:" buttons (Force / Concentric / Circular)
2. Click "Concentric"
3. Expected: Nodes rearrange into circles, button highlights blue

### ✅ Test 4: Labels Toggle
1. Find "👁️ Display:" with Labels button
2. Click button
3. Expected: Node labels disappear/reappear

### ✅ Test 5: Reset Button
1. Click "🔄 Reset" button (bottom right)
2. Expected: All filters clear, controls return to defaults

### ✅ Test 6: Dark Mode
1. Click "🌙 Dark Mode" toggle
2. Expected: Page darkens, all new controls styled for dark

### ✅ Test 7: Language Switching
1. Look for language buttons in header (עברית / English / Русский)
2. Click "English"
3. Expected: All labels update to English, page direction stays LTR
4. Click "עברית"
5. Expected: Hebrew labels, RTL layout, still works

---

## Step 4: Browser Console Check (1 minute)

**Open Developer Tools:**
- Press `F12` on Windows/Linux
- Press `Cmd+Option+I` on Mac

**Go to Console tab**

**You should see messages like:**
```
✅ 🔌 [Supabase] Connecting to...
✅ 📚 Loading sages from Supabase...
✅ 🔗 Loading connections from Supabase...
✅ [AppInit] Single Source Ready: 323 nodes + 25 validated edges
```

**When you interact with controls, you should see:**
```
🔗 Connection Strength: 50%
🎨 Visual Density: Dense
📐 Layout: Concentric
👁️ Labels: OFF
🔄 Clearing all filters...
```

**Check for errors:** Look for any **RED** messages. If you see red errors, take a screenshot and report them.

---

## Step 5: Test Mobile Responsiveness (1 minute)

**In browser DevTools (F12):**
1. Click toggle device toolbar icon (looks like phone)
2. Select "iPhone 12" or similar
3. Test that:
   - Options panel wraps properly
   - Buttons still clickable
   - Slider works on touch
   - Text readable

---

## If Everything Works ✅

1. **Close server** (Press Ctrl+C in terminal)
2. **Commit changes:**
   ```bash
   git add -A
   git commit -m "feat: Advanced controls - complete implementation

   - Connection strength slider (0-100%)
   - Visual density controls (Sparse/Normal/Dense)
   - Layout options (Force/Concentric/Circular)
   - Labels toggle
   - Reset button
   - Multilingual support (Hebrew/English/Russian)
   - Dark mode integration
   - localStorage persistence

   ✅ Tested locally - all features working"
   
   git push origin main
   ```

3. **Vercel deploys automatically** (2-3 minutes)

4. **Test live:**
   - Visit: https://ozar-chachamim.vercel.app
   - Repeat tests above to verify live site works

---

## If Something Breaks 🐛

### Problem: Slider doesn't exist or crashes

**Debug in console (F12):**
```javascript
// Check if slider element exists
document.getElementById('strength-slider')

// Should show: <input type="range" ...>
```

If undefined, then the HTML wasn't updated. 

**Solution:** Hard refresh (Ctrl+Shift+R) again.

### Problem: Clicking button does nothing

**Debug in console:**
```javascript
// Test the function manually
window.setDensity(2)
// Should print: 🎨 Visual Density: Normal

// If error "function not found", then JavaScript wasn't loaded
```

**Solution:** 
1. Hard refresh again
2. Check Network tab (F12) - ensure index.html fully loaded
3. Restart server

### Problem: Graph doesn't update

**Debug in console:**
```javascript
// Check if graph data loaded
window.graphData
// Should show object with nodes and links

// Check if network object exists
window.sageNetwork
// Should show SageNetwork object
```

### Problem: Translations not working

**Debug in console:**
```javascript
// Check current language
console.log(currentLanguage)

// Should show 'he', 'en', or 'ru'

// Test translation function
t('strength_slider')
// Should show translated text
```

**Solution:** Click language button again to trigger update.

---

## Quick Debugging Checklist

If you have ANY issues, run these checks in console (F12):

```javascript
// 1. Check all functions exist
window.filterByStrength && window.setDensity && window.setLayout && window.toggleLabels && window.clearAllFilters
// Should return: true

// 2. Test each function
window.filterByStrength(50)
window.setDensity(3)
window.setLayout('concentric')
window.toggleLabels()
window.clearAllFilters()

// 3. Check state variables
connectionStrengthFilter  // should be 0-100
visualDensity             // should be 1, 2, or 3
currentLayout             // should be 'force', 'concentric', or 'circular'
showLabelsFlag            // should be true/false

// 4. Check graph data
window.graphData?.nodes?.length   // should be ~364
window.graphData?.links?.length   // should be ~25+

// 5. Check localStorage
localStorage.getItem('language')  // should be 'he', 'en', or 'ru'
localStorage.getItem('darkMode')  // should be 'true' or 'false'
localStorage.getItem('basicsMode') // should be 'true' or 'false'
```

---

## Performance Check

**While testing, note these metrics:**

| Action | Expected Time | Notes |
|--------|---------------|-------|
| Move slider | Instant | < 50ms |
| Click density button | Instant | < 100ms |
| Click layout button | 1-2 sec | Animation time |
| Click reset | Instant | < 150ms |
| Switch language | Instant | Instant |
| Toggle dark mode | Instant | < 100ms |

If anything takes > 3 seconds, note it.

---

## After Successful Local Testing

### Next: Deploy to Vercel

```bash
# (From step 5 above)
git push origin main

# Wait 2-3 minutes for Vercel to build & deploy
# Then visit: https://ozar-chachamim.vercel.app
# Hard refresh and test everything again
```

### Then: Verify Live Site

1. Visit: https://ozar-chachamim.vercel.app
2. Hard refresh: Ctrl+Shift+R
3. Repeat ALL tests above on live site
4. Check F12 console for errors
5. Test on mobile
6. If all works → Project complete! ✅

---

## Timeline

| Step | Time | Notes |
|------|------|-------|
| Start server | 1 min | `python -m http.server 8080` |
| Test features | 5 min | Go through 7 tests |
| Console check | 2 min | F12 verification |
| Mobile test | 2 min | DevTools device toolbar |
| **Total local test** | **~10 min** | Should work perfectly |
| Commit & push | 2 min | `git push origin main` |
| Vercel deploy | 3 min | Auto builds & deploys |
| Verify live | 3 min | Test on production |
| **Total time** | **~20 min** | From start to live ✅ |

---

## What You're Testing

✅ **Connection Strength Slider** - Filters by link strength (0-100%)
✅ **Visual Density** - Adjusts node/edge sizing
✅ **Layout Options** - Switches between 3 layout algorithms
✅ **Labels Toggle** - Show/hide node labels
✅ **Reset Button** - Clears all filters
✅ **Dark Mode** - Integrated styling
✅ **Multilingual** - 3 full languages
✅ **localStorage** - Settings persist

---

## Success Criteria (Final Check)

- [ ] All 7 features work on localhost
- [ ] No red errors in console
- [ ] Graph responds to all controls
- [ ] Translations complete (all 3 languages)
- [ ] Mobile responsive
- [ ] Settings persist on refresh
- [ ] Dark mode looks good
- [ ] Ready to push to Vercel

---

## Commands Reference

```bash
# Start server
python -m http.server 8080

# Stop server
Ctrl+C

# Commit changes
git add -A
git commit -m "message"

# Push to Vercel
git push origin main

# Clear browser cache
Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)

# Open DevTools
F12 (or Cmd+Option+I on Mac)
```

---

## That's it! 🎉

You have everything needed to test locally and deploy to Vercel.

**Start with:** `python -m http.server 8080`

Then visit: **http://localhost:8080**

Hard refresh: **Ctrl+Shift+R**

Test everything, and if it works → push to Vercel!

---

**Questions?** Check F12 console for error messages → they'll tell you what's wrong.

**Ready?** Open terminal and start the server! 🚀
