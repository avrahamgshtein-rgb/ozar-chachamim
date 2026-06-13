# Claude Code Prompt: Network Graph Redesign (Connected Papers Style)

## Goal
Redesign Tab 1 (רשת קשרים / Network Graph) to match Connected Papers (connectedpapers.com) layout and functionality.

## Context (Read these first)
- **graph.js** — Main D3.js visualization (650 lines, SageNetwork class)
- **index.html** — Tab structure, sidebar, graph container
- **styles-graph.css** — Color mappings, responsive CSS
- **CLAUDE.md** — Constraints and output budget (500 lines max new code)

Key colors used:
```
second-temple: #8e44ad (Purple)
tannaim: #e74c3c (Red)
amoraim: #e67e22 (Orange)
geonim: #f1c40f (Yellow)
rishonim: #27ae60 (Green)
acharonim: #2980b9 (Blue)
modern: #1abc9c (Turquoise)
```

## What to build (in order, test each before committing)

### 1. Search Bar (Priority: HIGH)
**Location:** Top of graph container (above the SVG)
**Functionality:**
- Real-time filter by sage name (Hebrew + English)
- Update graph opacity: matching sages = 100%, others = 20%
- Clear button to reset
- Show count: "Filtered: N sages"

**Implementation:**
- Add HTML search bar to graph container in `index.html`
- Create `filterNodesBySearch()` function in graph.js
- Update node opacity on input change
- Add console log: `🔍 Search: "Rambam" → 3 results`

### 2. Connection Highlighting on Hover (Priority: HIGH)
**Functionality:**
- When hovering node: highlight connected nodes in bright color
- Non-connected nodes: reduce opacity to 20%
- Show connection type label on edges (teacher/student/etc.)
- Smooth transition (150ms)

**Implementation:**
- Enhance existing mouseover handlers in graph.js
- Create `highlightConnections(nodeId)` function
- Create `unhighlightConnections()` function
- Update edge rendering to show connection type
- Test on 3+ different nodes

### 3. Improved Node Styling (Priority: MEDIUM)
**Changes:**
- Increase node radius: 24px → 28px (base size)
- Add soft shadow: `filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"`
- Add glow on hover: radius 28px → 32px with smooth transition
- Better text labels: 14px Frank Ruhl Libre, bold

**Implementation:**
- Update `drawNodes()` to add shadow filter
- Add `:hover` effect with D3 transitions
- Verify on mobile (test RTL text support)

### 4. Edge Colors by Connection Type (Priority: MEDIUM)
**Connection types:**
- `teacher`: darker line (#333)
- `student`: medium line (#666)
- `colleague`: dashed line
- `influence`: dotted line
- others: light line (#ccc)

**Implementation:**
- Add `stroke-dasharray` based on connection type
- Update `drawLinks()` to use type-specific styling
- Test with Supabase data (25+ connections)

### 5. Zoom Controls (Priority: LOW - Already exists)
**Status:** Zoom buttons (+/-/reset) already implemented
**Enhancement:** Verify they work smoothly with new features
- Test bounds: 0.5x to 3x zoom
- Test on mobile

## Constraints
- **Do NOT refactor entire graph.js** — Keep SageNetwork class structure intact
- **Do NOT change:**
  - `_initializeGraph()` core logic
  - Supabase data loading (selectNode remains unchanged)
  - PDF export function (exportSagePDF)
  - Other 4 tabs (map, traditions, ideas, timeline)
  - Force simulation parameters
- **Add as isolated functions** — search, highlighting, styling should be modular
- **Test each feature independently** before moving to next

## Definition of Done

### Code ✅
- [ ] Search bar added to graph container
- [ ] `filterNodesBySearch()` function works (console logs show matches)
- [ ] `highlightConnections()` function works (opacity changes visible)
- [ ] Edge colors applied by connection type
- [ ] Node shadows and glow effects visible
- [ ] No breaking changes to existing simulation

### Testing ✅ (in browser on localhost:8080)
- [ ] F12 console: no errors, feature logs present
- [ ] Search: type "Rambam" → nodes filtered, count shows
- [ ] Hover: node glows, connected nodes bright, others fade
- [ ] Zoom: +/- buttons work smoothly
- [ ] Hebrew text: renders correctly RTL
- [ ] Mobile: test on viewport < 768px

### Version Control ✅
- [ ] Feature branch: `git checkout -b feature/network-redesign`
- [ ] Commits:
  1. `feat: add search bar and filtering`
  2. `feat: implement connection highlighting on hover`
  3. `feat: improve node styling with shadows and glow`
  4. `feat: add edge colors by connection type`
- [ ] Each commit tested independently
- [ ] Pushed to origin

### User Verification ✅
- [ ] Open http://localhost:8080
- [ ] Test all 4 features on desktop + mobile
- [ ] Verify matches Connected Papers reference
- [ ] Ready for Vercel deploy

## Reference Implementation Notes

### Search Bar HTML (add to index.html)
```html
<div id="graphContainer">
  <div class="graph-controls">
    <input type="text" id="graphSearch" placeholder="Search sages..." class="search-input">
    <span id="searchCount" class="search-count"></span>
    <button id="clearSearch" class="clear-btn">✕</button>
  </div>
  <svg id="graph"></svg>
</div>
```

### CSS (add to styles-graph.css)
```css
.graph-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.search-count {
  font-size: 12px;
  color: #666;
}

.clear-btn {
  padding: 4px 8px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}
```

### Graph.js pseudocode
```javascript
filterNodesBySearch(query) {
  // Update this.searchQuery
  // Set node opacity based on match
  // Update edge opacity
  // Show count
  // Log: 🔍 Search filtered: N sages
}

highlightConnections(nodeId) {
  // Find all connected nodes
  // Highlight them in bright color
  // Fade non-connected to 20% opacity
  // Show edge labels with type
}

unhighlightConnections() {
  // Reset all nodes to full opacity
  // Hide edge labels
}
```

## Estimated Token Cost
- Search + filtering: 800 tokens
- Connection highlighting: 1,200 tokens
- Node styling: 600 tokens
- Edge colors: 500 tokens
- Testing + fixes: 900 tokens
- **Total: ~4,000 tokens (fits in budget)**

## Next Steps After Completion
1. Deploy to Vercel (auto-triggers from git push to main)
2. Test live at https://ozar-chachamim.vercel.app
3. Gather user feedback
4. Plan Phase 2: Search by era/field/region, connection labels on edges
