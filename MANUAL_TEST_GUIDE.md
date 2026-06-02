# 🧪 Manual Testing Guide - Ozar Chachamim

**URL:** http://localhost:8080  
**Status:** Dev server running ✅

---

## 📱 Quick Start

1. **Open Browser:** Chrome/Firefox/Safari
2. **Navigate to:** http://localhost:8080
3. **Open DevTools:** F12 (Console tab)

---

## ✅ TEST 1: Infrastructure Check (2 min)

### Step 1: Page Load
- [ ] Page loads without errors
- [ ] Title shows: "אוצר חכמים — Network of Jewish Sages"
- [ ] Header visible with 5 tabs

### Step 2: Check Console for Initialization
Open DevTools Console (F12) and look for these messages:

```
✅ Expect to see:
[index.html] Initializing Supabase backend...
✓ [AppInit] Ready: 323 nodes + 25 edges
🔍 [SearchIndex] Built index with X unique tokens
✅ [index.html] Task D: semanticSearch available globally
```

**Copy this into Console to verify:**
```javascript
console.log('Sages:', window.graphData.nodes.length);
console.log('Links:', window.graphData.links.length);
console.log('SageMap:', window.graphData.sageMap.size);
```

**Expected Output:**
```
Sages: 323
Links: 25
SageMap: 323
```

---

## ✅ TEST 2: D3 Graph & Curved Links (3 min)

### Step 1: Click "רשת קשרים" (Graph Tab - First Tab)

### Step 2: Visual Inspection
- [ ] Graph fills the window with circular nodes
- [ ] Nodes are colored by era (see legend bottom-left):
  - 🟠 Orange = Second Temple
  - 🟢 Green = Tannaim
  - 🔴 Red = Amoraim
  - 🟣 Purple = Rishonim
  - 🟤 Brown = Acharonim
  - 🩷 Pink = Modern
- [ ] **CURVED LINKS**: Lines connecting nodes are **curved** (not straight) ✅
- [ ] **ARROW MARKERS**: Small arrows visible at ends of links ✅
- [ ] Sages arranged left→right (ancient on left, modern on right)

### Step 3: Hover Effects
- Click any node to open sidebar (should show sage profile)
- Sidebar shows:
  1. Name
  2. Era, Region, Field
  3. Biography
  4. Core Concept (if available)
  5. Statistics
  6. **RESEARCH DOCUMENT** ← New ✅
  7. Spotify button
  8. PDF Export button
  9. Related Sages

**Verify Research Section:**
- [ ] Blue border (#2196F3)
- [ ] Shows word count
- [ ] Shows file name
- [ ] Shows content preview (Hebrew, RTL)
- [ ] "Read Full Research" button

---

## ✅ TEST 3: Semantic Search & Cross-Tab Highlighting (5 min)

### Step 3.1: Test Multi-Field Search
In the header search box, type each query:

**Test 1: Search by Name**
- Type: `רמב״ם` (Rambam)
- Expected: Should find sage(s) with that name
- Graph nodes: Matching nodes bright, others faded
- Result count shown: "1 of 323 sages match"

**Test 2: Search by Concept**
- Type: `חוק` (law/halakha)
- Expected: Should find sages who authored concepts with "חוק"
- Graph nodes: Multiple matching nodes highlighted
- Result count shows percentage

**Test 3: Search by Era**
- Type: `תנאים` (Tannaim era)
- Expected: Should find all sages from Tannaim period
- Graph nodes: ~50+ nodes highlighted

**Test 4: Search by Region**
- Type: `בבל` (Babylon)
- Expected: Should find Babylonian sages
- Graph nodes: Highlighted matching sages

### Step 3.2: Test Cross-Tab Filtering
With search "רבי" active:

1. **Graph Tab:**
   - [ ] Matching sages = 100% opacity (bright)
   - [ ] Non-matching sages = 5% opacity (faded)
   - [ ] Links connected to matching nodes = highlighted

2. **Traditions Tab:**
   - [ ] Click "מסורות" tab
   - [ ] Cards with matching sages = 100% opacity
   - [ ] Other cards = 20% opacity (faded)

3. **Ideas Tab:**
   - [ ] Click "רעיונות" tab
   - [ ] Same filtering behavior as Traditions

4. **Search Stats:**
   - [ ] Near search box: "X of 323 sages match (Y%)"
   - [ ] Updates in real-time as you type

---

## ✅ TEST 4: Map Auto-Zoom Integration (5 min) ⭐ CRITICAL

**This is the most important enhancement!**

### Step 4.1: Single Sage Search
1. Clear search box (if text exists)
2. Type: `בעל שם טוב` (Baal Shem Tov)
3. **OBSERVE:**
   - [ ] Search shows: "1 of 323 sages match"
   - [ ] Map tab **automatically shows this sage's location** with proper zoom
   - [ ] Marker is **large (14px radius)** and **bright**

### Step 4.2: Multiple Sage Search
1. Clear search
2. Type: `רבי` (Rabbi - matches many sages)
3. **OBSERVE:**
   - [ ] Search shows: "X of 323 sages match"
   - [ ] Map **auto-zooms to show ALL matching sages** in one frame
   - [ ] Matching markers are **enlarged (14px) and bright**
   - [ ] Non-matching markers are **faded (35% opacity)**
   - [ ] Migration paths **brighten** for matching sages

### Step 4.3: Marker Highlighting
While search is active ("רבי"):
1. Click "גיאוגרפיה" (Map tab)
2. **OBSERVE:**
   - [ ] Markers matching current search are **bright and large**
   - [ ] Non-matching markers are **faded (dimmed)**
   - [ ] Map is **zoomed appropriately** to show all results

### Step 4.4: Clear Search Reset
1. Clear the search box completely
2. **OBSERVE:**
   - [ ] All markers return to **default size (10px)** ✅
   - [ ] All markers return to **default opacity (70%)**
   - [ ] Map **pans back** to default center [31.5, 35.2]
   - [ ] Map **zooms back** to level 4
   - [ ] Search stats disappear

---

## ✅ TEST 5: Migration Paths (2 min)

### Step 5.1: View Migration Lines
1. Click "גיאוגרפיה" (Map tab)
2. **OBSERVE:**
   - [ ] Dashed polylines connecting locations
   - [ ] ~18 sages have migration paths
   - [ ] Intermediate waypoints visible (e.g., Egypt → Greece → Spain)
   - [ ] Arrow pointing to destination

### Step 5.2: Migration Line Highlighting
1. Search for a sage with migration path (e.g., `אליעזר`)
2. Click Map tab
3. **OBSERVE:**
   - [ ] Migration line **brightens** (opacity 80%)
   - [ ] Associated markers **enlarge**
   - [ ] Non-matching paths **fade** (opacity 20%)

---

## ✅ TEST 6: Performance & Stability (2 min)

### Step 6.1: DevTools Console Check
1. Open DevTools (F12)
2. Go to Console tab
3. Look for error count (red badge)
4. **Expected:** 0 errors ❌ should show errors

### Step 6.2: Interaction Speed
- [ ] Clicking sage = sidebar opens < 500ms
- [ ] Searching = graph updates < 300ms
- [ ] Map zoom = smooth 1.5s animation
- [ ] Tab switching = instant

### Step 6.3: Load Times
- [ ] Page fully loaded: < 3 seconds
- [ ] All 323 sages visible: < 2 seconds
- [ ] Map markers rendered: < 2 seconds

---

## ✅ TEST 7: PDF Export (1 min)

### Step 7.1: Export PDF
1. Click any sage in graph
2. Sidebar opens
3. Scroll to "הדפס / Export PDF" button (red button)
4. Click button
5. **OBSERVE:**
   - [ ] New tab opens with print-ready HTML
   - [ ] Shows sage profile with all data
   - [ ] Includes research content (if available)
   - [ ] Includes migration path (if available)
   - [ ] Press Ctrl+P (or Cmd+P) to save as PDF

---

## ✅ TEST 8: Edge Cases (2 min)

### Test Case 1: No Results
- Search for: `xyz12345` (non-existent)
- **Expected:**
  - [ ] Shows "0 of 323 sages match"
  - [ ] Graph all nodes faded
  - [ ] Map shows all locations faded

### Test Case 2: Special Characters
- Search for: `!@#$%^&*()`
- **Expected:**
  - [ ] No error
  - [ ] Shows "0 of 323 sages match"

### Test Case 3: Long Query
- Search for: `this is a very long search query that should still work`
- **Expected:**
  - [ ] No error
  - [ ] Search performs normally

---

## 📊 Test Summary Template

```
═══════════════════════════════════════════════════════════════
OZAR CHACHAMIM - VERIFICATION TEST RESULTS
═══════════════════════════════════════════════════════════════

Date: [TODAY]
Tester: [NAME]
Browser: [CHROME/FIREFOX/SAFARI] Version: [X.X]
Server: http://localhost:8080

TEST RESULTS:
═══════════════════════════════════════════════════════════════

✅ TEST 1 - Infrastructure:          [PASS/FAIL]
✅ TEST 2 - Graph & Curved Links:   [PASS/FAIL]
✅ TEST 3 - Semantic Search:         [PASS/FAIL]
✅ TEST 4 - Map Auto-Zoom:           [PASS/FAIL] ⭐ CRITICAL
✅ TEST 5 - Migration Paths:         [PASS/FAIL]
✅ TEST 6 - Performance:             [PASS/FAIL]
✅ TEST 7 - PDF Export:              [PASS/FAIL]
✅ TEST 8 - Edge Cases:              [PASS/FAIL]

═══════════════════════════════════════════════════════════════

OVERALL RESULT:     [PASS / PARTIAL / FAIL]
SUCCESS RATE:       [X/8 tests passed]

CRITICAL ISSUES:
[List any critical failures]

NON-CRITICAL ISSUES:
[List any minor issues]

NOTES:
[Any observations or comments]

═══════════════════════════════════════════════════════════════
```

---

## 🐛 Troubleshooting

### Issue: "Failed to load graph data"
**Solution:**
1. Check DevTools Console
2. Look for Supabase errors
3. Verify SUPABASE_URL and SUPABASE_ANON_KEY in supabase-client.js
4. Refresh page (Ctrl+Shift+R)

### Issue: No nodes visible
**Solution:**
1. Wait 3-5 seconds for data to load
2. Check Console for "✓ Loaded 323 sages"
3. If still empty, check Network tab for failed requests

### Issue: Map doesn't zoom on search
**Solution:**
1. Ensure Map tab was clicked at least once
2. Check Console for "mapManager" initialization message
3. Verify map instance exists: `console.log(mapManager.mapInstance)`

### Issue: Graph has straight lines instead of curves
**Solution:**
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Check DevTools > Console for D3 errors

### Issue: Hebrew text shows as ???
**Solution:**
1. Check page encoding: View > Character Encoding > UTF-8
2. Refresh page
3. Try different browser

---

## 🎯 Quick Checklist (Yes/No)

- [ ] Page loads without errors
- [ ] 323 sages visible in graph
- [ ] Links are curved, not straight
- [ ] Arrow markers on links
- [ ] Map shows colored markers
- [ ] Search updates graph in real-time
- [ ] Map auto-zooms on search
- [ ] Markers highlight on search
- [ ] Research document shows in sidebar
- [ ] PDF export works
- [ ] No console errors
- [ ] All 5 tabs functional
- [ ] Mobile responsive (test at 375px)

---

**If all checks pass: ✅ READY FOR DEPLOYMENT**

**If some checks fail: ⚠️ Document issues and prioritize fixes**
