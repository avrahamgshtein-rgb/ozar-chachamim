# 🧪 Ozar Chachamim - Comprehensive Verification Checklist

**Date:** 2026-06-02  
**Server:** http://localhost:8080  
**Status:** All systems ready for testing

---

## 📋 TEST PHASES

### **PHASE 1: Infrastructure & Data Loading**
- [ ] Server responds (HTTP 200)
- [ ] index.html loads completely
- [ ] Supabase client connects (check console: "✓ [AppInit]")
- [ ] All 323 sages loaded from Supabase
- [ ] All 25 connections (links) validated
- [ ] Search index built (console: "🔍 [SearchIndex] Built index")

**How to verify:**
1. Open http://localhost:8080 in browser
2. Open DevTools (F12)
3. Check Console for initialization messages:
   - ✅ "✓ [AppInit] Ready: 323 nodes + 25 edges"
   - ✅ "🔍 [SearchIndex] Built index with X unique tokens"

---

### **PHASE 2: Task A - Data Layer Validation**
- [ ] `window.graphData` contains nodes and links
- [ ] All node IDs are strings
- [ ] All links have valid source/target IDs
- [ ] No "node not found" errors in console
- [ ] `window.graphData.sageMap` exists and has 323 entries

**How to verify:**
```javascript
// In DevTools Console:
console.log('Nodes:', window.graphData.nodes.length);
console.log('Links:', window.graphData.links.length);
console.log('SageMap size:', window.graphData.sageMap.size);
window.graphData.links.forEach(l => {
  if (!window.graphData.sageMap.has(String(l.source))) {
    console.warn('Invalid source:', l.source);
  }
});
```

**Expected Output:**
```
Nodes: 323
Links: 25
SageMap size: 323
(No warnings)
```

---

### **PHASE 3: Task B - D3 Graph Enhancements**

#### 3a. Graph Rendering
- [ ] Graph view (tab 1) shows all 323 sages as colored circles
- [ ] Sages colored by era:
  - 🟠 Orange (Second Temple)
  - 🟢 Green (Tannaim)
  - 🔴 Red (Amoraim)
  - 🟣 Purple (Rishonim)
  - 🟤 Brown (Acharonim)
  - 🩷 Pink (Modern)
- [ ] No error messages about missing colors

#### 3b. Curved Links
- [ ] Links are **curved** (not straight lines)
- [ ] Links have **arrow markers** at endpoints
- [ ] Link colors match connection types:
  - Teal: Student relationships (thicker)
  - Grey: Influence
  - Red: Oppose
  - Cyan: Colleague
  - Yellow: Predecessor

#### 3c. Chronological Layout
- [ ] Sages arranged left→right by historical era
- [ ] Ancient sages (Second Temple) on LEFT
- [ ] Modern sages on RIGHT
- [ ] Sages don't clump into random blob

**How to verify:**
1. Click Graph tab
2. Open DevTools > Console
3. Check for messages:
   - ✅ "✓ Graph rendered with chronological layout"
   - ✅ "✓ Links validated: X/25 valid"
4. Visually inspect:
   - Links should curve (not straight)
   - Arrows visible at link ends
   - Colors match legend (bottom-left)

---

### **PHASE 4: Task C - Map Integration & Auto-Zoom**

#### 4a. Map Rendering
- [ ] Map tab shows OpenStreetMap tiles
- [ ] 323 colored circle markers visible
- [ ] Legend shows era colors (bottom-left)
- [ ] Map centered on Middle East/Mediterranean

#### 4b. Migration Paths
- [ ] Dashed polylines show sage migration routes
- [ ] Migration paths have intermediate waypoints
- [ ] ~18 sages with migration paths visible
- [ ] Migration arrows point to destination

#### 4c. Search Auto-Zoom
- [ ] **CRITICAL TEST:** Search for "רבי" (Rabbi)
  - Should match many sages
  - Map should **auto-fit to show all results**
  - Matching markers should **enlarge and brighten**
  - Non-matching markers should **fade to 35% opacity**

- [ ] **Single Result Test:** Search for "בעל שם טוב"
  - Map should **flyTo** the single location (smooth zoom)
  - Marker should **enlarge to 14px**
  - Camera zoom level = 12

- [ ] **Clear Search Test:** Delete search text
  - All markers return to default style
  - Map pans back to default [31.5, 35.2], zoom 4
  - Migration lines return to normal opacity

**How to verify:**
1. Click Map tab
2. Search for "רבי" in header search box
3. Observe:
   - Map should pan/zoom automatically ✅
   - Matching markers should be bright & large ✅
   - Non-matching should be faded ✅
4. Clear search
5. Observe:
   - Map returns to default view ✅
   - All markers reset ✅

---

### **PHASE 5: Task D - Semantic Search & Cross-Tab Filtering**

#### 5a. Multi-Field Search
- [ ] Searching name (e.g., "מאימוני") finds sage
- [ ] Searching concept (e.g., "חוק") finds relevant sages
- [ ] Searching era (e.g., "תנאים") finds all Tannaim
- [ ] Searching field (e.g., "הלכה") finds sages in field
- [ ] Searching region (e.g., "בבל") finds Babylonian sages

#### 5b. Cross-Tab Highlighting
- [ ] **Graph Tab:** Matching sages = full opacity, others = 5% opacity
- [ ] **Graph Links:** Links to matching sages highlighted
- [ ] **Map Tab:** Markers highlighting synced with search
- [ ] **Traditions Tab:** Cards filtered by matching sages
- [ ] **Ideas Tab:** Cards filtered by matching sages

#### 5c. Search Statistics
- [ ] Search stats display near search box
- [ ] Shows format: "X of Y sages match (Z%)"
- [ ] Updates in real-time as user types

**How to verify:**
1. Type "חוק" (law/halakha) in search box
2. Check all tabs:
   - Graph: matching nodes bright, others faded ✅
   - Map: matching markers enlarged, others faded ✅
   - Traditions: relevant cards visible, others faded ✅
3. Check search stats display ✅
4. Clear search - all tabs return to normal ✅

---

### **PHASE 6: Task E - Research Document Integration**

#### 6a. Research Display
- [ ] Click any sage node in graph
- [ ] Sidebar opens with sage profile
- [ ] Sidebar shows sections in this order:
  1. Biography
  2. Core Concept (if exists)
  3. Statistics
  4. **RESEARCH DOCUMENT** ← New section
  5. Spotify Search
  6. PDF Export / Bookmark buttons
  7. Related Sages

#### 6b. Research Content
- [ ] Research section shows:
  - File name (e.g., "Research Document")
  - Word count (e.g., "400 words")
  - Content preview (first ~400 characters)
  - Hebrew text is RTL (right-to-left) ✅
- [ ] "Read Full Research" button links to research-view.html

#### 6c. Research Text Quality
- [ ] Text is readable (no encoding errors)
- [ ] Hebrew characters display correctly
- [ ] Scrollable if content exceeds 200px height
- [ ] No XSS/injection issues

**How to verify:**
1. Click Graph tab
2. Click any sage node
3. Sidebar opens
4. Scroll down to find Research Document section
5. Verify:
   - Section is blue-bordered (#2196F3) ✅
   - Shows word count & filename ✅
   - Text is Hebrew RTL ✅
   - Preview is visible ✅
   - "Read Full Research" button present ✅

---

### **PHASE 7: Performance & Responsiveness**

#### 7a. Load Times
- [ ] Page loads in < 3 seconds
- [ ] All 323 sages visible after load
- [ ] No "Failed to load" errors
- [ ] Console has no 500+ errors

#### 7b. Interaction Speed
- [ ] Clicking sage node opens sidebar instantly
- [ ] Searching filters graph in < 500ms
- [ ] Map zoom animations smooth (1.5s)
- [ ] Tab switching instant

#### 7c. Browser Console
- [ ] No red error messages
- [ ] No undefined variable errors
- [ ] No "node not found" errors
- [ ] No CORS errors
- [ ] All Supabase queries successful

**How to verify:**
1. Open DevTools > Console
2. Refresh page
3. Look for error count (red badge)
4. Should show 0 errors ✅
5. Should show only info (blue ℹ️) and log messages ✅

---

### **PHASE 8: Edge Cases & Error Handling**

#### 8a. Edge Cases
- [ ] Search for non-existent sage (e.g., "xyz123")
  - Should show "0 of 323 sages match"
  - Graph shows all sages faded
- [ ] Search with special characters (e.g., "!@#$")
  - Should handle gracefully (no error)
- [ ] Very long search query (100+ characters)
  - Should still work

#### 8b. Device Responsiveness
- [ ] F12 > Toggle Device Toolbar
- [ ] Test at 375px (mobile)
- [ ] Test at 768px (tablet)
- [ ] Test at 1024px (desktop)
- [ ] All tabs accessible
- [ ] Search box functional on all sizes

---

## 🎯 SUMMARY CHECKLIST

### Critical (Must Pass)
- [ ] ✅ Supabase loads 323 sages
- [ ] ✅ Data validation passes (0 invalid links)
- [ ] ✅ Graph renders with curved links & colors
- [ ] ✅ Map shows all markers
- [ ] ✅ Search highlights nodes across all tabs
- [ ] ✅ Map auto-zooms on search results
- [ ] ✅ Research document displays in sidebar
- [ ] ✅ No console errors

### Important (Should Pass)
- [ ] ✅ Chronological layout (left→right)
- [ ] ✅ Link arrow markers visible
- [ ] ✅ Migration paths visible
- [ ] ✅ RTL Hebrew rendering
- [ ] ✅ Search stats display
- [ ] ✅ Marker highlighting on search

### Nice-to-Have (Optional)
- [ ] ✅ Smooth animations
- [ ] ✅ Mobile responsiveness
- [ ] ✅ Fast interactions

---

## 📝 TEST RESULTS TEMPLATE

```
TEST SESSION: [DATE/TIME]
TESTER: [NAME]
BROWSER: [Chrome/Firefox/Safari + VERSION]

PHASE 1 (Infrastructure): ✅ PASS / ❌ FAIL
  Issues: [list any issues]

PHASE 2 (Data Layer): ✅ PASS / ❌ FAIL
  Issues: [list any issues]

PHASE 3 (D3 Graph): ✅ PASS / ❌ FAIL
  Issues: [list any issues]

PHASE 4 (Map & Auto-Zoom): ✅ PASS / ❌ FAIL
  Issues: [list any issues]

PHASE 5 (Semantic Search): ✅ PASS / ❌ FAIL
  Issues: [list any issues]

PHASE 6 (Research Integration): ✅ PASS / ❌ FAIL
  Issues: [list any issues]

PHASE 7 (Performance): ✅ PASS / ❌ FAIL
  Issues: [list any issues]

PHASE 8 (Edge Cases): ✅ PASS / ❌ FAIL
  Issues: [list any issues]

OVERALL: ✅ PASS / ⚠️ PARTIAL / ❌ FAIL

COMMENTS:
[Any additional observations]
```

---

## 🚀 NEXT STEPS (After Verification)

1. ✅ If all phases PASS:
   - Deploy to Vercel/GitHub Pages
   - Setup custom domain
   - Enable analytics

2. ⚠️ If some phases PARTIAL:
   - Document issues
   - Prioritize fixes
   - Re-test after fixes

3. ❌ If critical phase FAILS:
   - Debug Supabase connection
   - Check browser console
   - Review implementation

---

**Good luck! 🧪**
