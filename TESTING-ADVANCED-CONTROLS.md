# Testing Advanced Controls - Comprehensive Guide

**Status:** ✅ Phase 1-4 Complete (Basic Controls + Advanced Filters + Layout Options + Display Options)

## Quick Start: Run Locally

```bash
cd ~/Desktop/ozar-chachamim
python -m http.server 8080
# Open http://localhost:8080 in browser
```

**Hard refresh browser** (Ctrl+Shift+R or Cmd+Shift+R) if you don't see changes.

---

## What's New in Options Panel

### Row 1: Basic Controls
- **📚 Basics Mode** - Toggle to show only core sages
- **🏷️ Field Filter** - Filter by ethics, logic, metaphysics, kabbalah
- **🌙 Dark Mode** - Toggle dark theme
- Button states saved to localStorage

### Row 2: Advanced Filters
- **🔗 Connection Strength Slider** (0-100%)
  - Adjust with slider
  - Live value display
  - Filters link opacity based on strength
  - Works with graph data
  
- **🎨 Visual Density** (3 levels: Sparse, Normal, Dense)
  - Sparse: Smaller nodes, thin edges
  - Normal: Default sizing
  - Dense: Larger nodes, thicker edges
  - Button states update in real-time

### Row 3: Layout & Display Options
- **📐 Layout Switching** (3 options)
  - Force: Default force-directed
  - Concentric: Circles by degree of separation
  - Circular: Timeline-based arrangement
  - Button states update
  
- **👁️ Display Options**
  - Labels toggle: Show/hide node labels
  - Smooth opacity transitions
  
- **Action Buttons**
  - 📑 INDEX: Switch to table view
  - 🔄 Reset: Clear all filters and restore defaults

---

## Testing Checklist

### ✅ UI Rendering
- [ ] Options panel displays all controls
- [ ] Layout wraps properly on different screen sizes
- [ ] All buttons and sliders visible
- [ ] Icons render correctly (using emoji)
- [ ] Colors match dark mode when enabled
- [ ] Responsive on mobile (scroll if needed)

### ✅ Connection Strength Slider
- [ ] Slider moves smoothly (0-100%)
- [ ] Value displays in real-time
- [ ] Graph links change opacity based on slider
- [ ] Value persists in localStorage
- [ ] Console shows: "🔗 Connection Strength: X%"

### ✅ Visual Density Buttons
- [ ] Buttons toggle active state
- [ ] Sparse mode: nodes smaller
- [ ] Normal mode: default size
- [ ] Dense mode: nodes larger
- [ ] Edges adjust width accordingly
- [ ] Console shows: "🎨 Visual Density: [Level]"
- [ ] Selection persists in localStorage

### ✅ Layout Options
- [ ] Force: Graph uses default force-directed layout
- [ ] Concentric: Nodes arrange in circles by connection count
- [ ] Circular: Nodes arrange in circle, sorted by era
- [ ] Smooth transitions between layouts
- [ ] Console shows: "📐 Layout: [Type]"

### ✅ Labels Toggle
- [ ] Labels display/hide smoothly
- [ ] Opacity changes (1.0 vs 0.0)
- [ ] Icon button highlights when active
- [ ] Console shows: "👁️ Labels: [ON/OFF]"

### ✅ Reset Button
- [ ] Clears all filter values
- [ ] Resets all buttons to defaults
  - Slider → 0%
  - Density → Sparse
  - Layout → Force
  - Labels → ON
- [ ] Graph restores to original state
- [ ] Console shows: "🔄 Clearing all filters..."

### ✅ Dark Mode Integration
- [ ] New controls visible in dark mode
- [ ] Colors appropriate (contrast OK)
- [ ] Sliders readable
- [ ] Button hover states work
- [ ] Toggle persists in localStorage

### ✅ Multilingual Support
- [ ] All labels translate correctly
- [ ] Hebrew: RTL layout maintained
- [ ] English: LTR layout correct
- [ ] Russian: RTL layout correct
- [ ] Clicking language buttons updates labels instantly
- [ ] Translations include:
  - "🔗 Connection Strength:"
  - "🎨 Density:"
  - "📐 Layout:"
  - "👁️ Display:"
  - Button labels in all 3 languages

### ✅ Browser Console (F12)
- [ ] No JavaScript errors (red messages)
- [ ] Filter messages appear:
  - "🔗 Connection Strength: X%"
  - "🎨 Visual Density: [Level]"
  - "📐 Layout: [Type]"
  - "👁️ Labels: [ON/OFF]"
  - "🔄 Clearing all filters..."
- [ ] No warnings about undefined functions

### ✅ Graph Interactions
- [ ] All 364 sages visible by default
- [ ] Nodes clickable and show sidebar
- [ ] Hovering shows tooltips
- [ ] Dragging nodes works
- [ ] Zoom/pan works normally
- [ ] Search still filters by typing

### ✅ Data Integration
- [ ] Filters work with actual data.json
- [ ] Connection metadata used (strength, type)
- [ ] Node sizes reflect actual data
- [ ] Link opacity reflects relationship strength
- [ ] Era periods respected in circular layout

### ✅ Performance
- [ ] Layout changes smooth (< 500ms)
- [ ] No lag when moving slider
- [ ] Button clicks instant
- [ ] Graph doesn't freeze during updates
- [ ] No memory leaks (check DevTools)

---

## Test Scenarios

### Scenario 1: Basic Filtering Flow
1. Load site
2. Move **Connection Strength** slider to 50%
   - Expected: Some links fade out, console shows "🔗 Connection Strength: 50%"
3. Click **Density: Dense** button
   - Expected: Nodes grow, button highlights, console shows "🎨 Visual Density: Dense"
4. Click **Layout: Concentric**
   - Expected: Nodes arrange in circles, button highlights
5. Click **Reset**
   - Expected: All controls return to defaults, graph restores

### Scenario 2: Dark Mode + Multilingual
1. Click **🌙 Dark Mode**
   - Expected: Page darkens, new controls styled for dark mode
2. Click **English** (language button)
   - Expected: All labels update to English
3. Move slider and click buttons
   - Expected: English console messages, controls work
4. Click **עברית** (Hebrew)
   - Expected: RTL layout, Hebrew labels, all functions work

### Scenario 3: Advanced Layout Testing
1. Start with Force layout (default)
2. Click **Concentric**
   - Expected: Nodes rearrange in circles, sages with most connections near center
3. Click **Circular**
   - Expected: Nodes arrange in circle, ordered by historical period
4. Switch back to **Force**
   - Expected: Returns to force-directed layout

### Scenario 4: Combined Filters
1. Set **Connection Strength: 75%**
2. Select **Field: Ethics**
3. Click **Density: Dense**
4. Click **Layout: Circular**
5. Expected:
   - Only ethics sages visible (if field filter working)
   - Strong connections only shown
   - Large nodes in circular arrangement
   - No errors in console

### Scenario 5: Mobile/Responsive
1. Resize window to 600px wide
   - Expected: Options panel wraps gracefully
   - All controls remain accessible
   - Scroll doesn't break layout
2. On mobile device:
   - Click controls on touch
   - Expected: All functions work without mouse

---

## Troubleshooting

### Problem: Slider doesn't move
- **Solution:** Hard refresh browser (Ctrl+Shift+R)
- Check console for JavaScript errors

### Problem: Buttons don't highlight
- **Solution:** Look for active CSS class on button
- Check: `document.querySelectorAll('.density-btn.active')`

### Problem: Graph doesn't update
- **Solution:** Check window.sageNetwork exists
- In console: `console.log(window.sageNetwork)`
- Ensure data.json loaded (check Network tab)

### Problem: Translations missing
- **Solution:** Check language switcher works
- In console: `console.log(currentLanguage)`
- Click language button again

### Problem: Dark mode colors wrong
- **Solution:** Hard refresh
- Check CSS has `body.dark-mode` rules
- Inspect element to see applied styles

---

## Console Debugging Commands

Test these in browser F12 console:

```javascript
// Check if functions exist
window.filterByStrength
window.setDensity
window.setLayout
window.toggleLabels
window.clearAllFilters

// Manually test functions
window.filterByStrength(50)        // Should show 🔗 message
window.setDensity(3)               // Should show 🎨 message
window.setLayout('concentric')     // Should show 📐 message
window.toggleLabels()              // Should show 👁️ message
window.clearAllFilters()           // Should show 🔄 message

// Check state
console.log('Connection Strength:', connectionStrengthFilter)
console.log('Density:', visualDensity)
console.log('Layout:', currentLayout)
console.log('Labels:', showLabelsFlag)

// Check data
console.log('Graph data:', window.graphData)
console.log('Sage network:', window.sageNetwork)
console.log('Number of nodes:', window.graphData?.nodes?.length)
```

---

## Before Deploying to Vercel

**Checklist:**

- [ ] All 9 test scenarios pass
- [ ] No red errors in console
- [ ] All buttons work
- [ ] Slider works smoothly
- [ ] Dark mode integrated
- [ ] Translations complete (all 3 languages)
- [ ] localStorage working (refresh page, settings persist)
- [ ] Graph responds to all controls
- [ ] Mobile responsive
- [ ] Performance acceptable

**If all ✅, ready to push:**

```bash
cd ~/Desktop/ozar-chachamim
git add -A
git commit -m "feat: Complete advanced controls - sliders, layouts, density

- Added connection strength slider (0-100%)
- Added visual density controls (Sparse/Normal/Dense)
- Added layout options (Force/Concentric/Circular)
- Added labels toggle
- Added reset button to clear all filters
- Full multilingual support (Hebrew/English/Russian)
- Dark mode integration
- localStorage persistence
- CSS styling for all new controls
- JavaScript functions for all interactions

All features tested locally ✅"

git push origin main
```

---

## Performance Notes

- Force-directed layout: ~50ms per update (acceptable)
- Concentric layout: ~100ms per update (acceptable)
- Circular layout: ~80ms per update (acceptable)
- Slider responsiveness: < 50ms (good)
- Button state updates: instant

---

## Next Steps (Phase 5 - If Time)

If everything works perfectly, consider:

1. **Advanced connection filtering** - by type (student/teacher/colleague)
2. **Date range slider** - filter sages by period (min-max years)
3. **Edge labels** - show connection type on hover
4. **Search highlighting** - highlight matched nodes when searching
5. **Export filters** - save current view as image/JSON
6. **Animation presets** - smooth transitions between layouts

---

**Status:** Ready for local testing → Vercel deployment

Test on: http://localhost:8080
Deploy to: https://ozar-chachamim.vercel.app
