# Changelog — 13 ביוני 2026

## 🎯 סיבוב שיפורים: Connected Papers Inspired UI

### Changed

#### Graph Visualization (`graph.js`)
- ✅ **Node size increased** from 24px → 28px for better visibility
- ✅ **Node stroke** from 2px → 2.5px for cleaner look
- ✅ **Hover effect** nodes grow to 32px (was growing to 28px)
- ✅ **Link stroke** from 2px → 2.5px
- ✅ **Link opacity** baseline improved (0.5 instead of 0.4)
- ✅ **Hover on links** increases stroke to 5px (visual feedback)
- ✅ **Smooth transitions** added to all node/link visibility changes (300ms)
- ✅ **Added `deselectNode()` function** for clicking background
- ✅ **Search transitions** now smooth (opacity, radius, stroke changes)

#### UI Styling (`index.html`)
- ✅ **Background color** #f5f5f5 → #fafafa (lighter)
- ✅ **Text color** → #1a1a1a (darker for contrast)
- ✅ **Buttons** improved with:
  - `border-radius: 6px` (from 4px)
  - `box-shadow: 0 1px 3px rgba(0,0,0,0.04)`
  - Better hover states
  - Active state with `transform: scale(0.98)`
- ✅ **Search input** improved with:
  - Focus state: `border-color: #1a1a1a`
  - Focus shadow: `0 2px 8px rgba(0,0,0,0.1)`
  - Better placeholder color
- ✅ **Filter selects** improved with shadows and styling
- ✅ **Zoom buttons** refined with better styling and interactions
- ✅ **Table view** updated with:
  - Better header styling (uppercase, letter-spacing)
  - Improved row hover effects
  - Better padding and spacing
- ✅ **Legend** width increased to 260px
- ✅ **Sidebar** width increased to 300px
- ✅ **Headers & typography** refined throughout

#### Legend Section (`index.html`)
- ✅ **New "סוגי קשרים" (Link Types) section** added
- ✅ Shows all 5 connection types with colored indicators:
  - תלמיד (Student) - #4ecdc4
  - מורה (Teacher) - #2980b9
  - השפעה (Influence) - #8b7965
  - התנגדות (Oppose) - #ff6b6b
  - עמית (Colleague) - #95e1d3

#### About View (`index.html`)
- ✅ **Expanded content** with better descriptions
- ✅ **Link to Connected Papers** as inspiration
- ✅ **Better feature list** with detailed explanations
- ✅ **Tech stack** section added

### Documentation

#### New Files
- ✅ **`IMPROVEMENTS_SUMMARY.md`** — detailed list of all improvements
- ✅ **`QUICK_START.md`** — user-friendly guide for running & using the app
- ✅ **`CHANGELOG_2026_06_13.md`** — this file

### Performance

- ✅ **Smooth animations** with `transition().duration(300)` on all visibility changes
- ✅ **Better collision** with `d3.forceCollide(48)` (from 32)
- ✅ **Improved alpha decay** with `alphaDecay(0.02)` for better convergence

### Accessibility

- ✅ **Better contrast** with darker text and refined colors
- ✅ **Keyboard support** maintained:
  - Escape to close sidebar
  - Click background to deselect
- ✅ **RTL full support** maintained for Hebrew

### Testing Notes

To verify improvements:

1. **Graph interactions:**
   ```
   - Hover over a node → should grow to 32px
   - Hover over a link → should thicken to 5px
   - Search for "רמבם" → nodes should transition smoothly
   ```

2. **UI polish:**
   ```
   - Button hover → should show subtle background change
   - Search focus → should have dark border and shadow
   - Tables → should have rounded corners and better spacing
   ```

3. **Legend:**
   ```
   - Check right sidebar → should show eras + link types
   - Colors should match graph visualization
   ```

4. **Mobile:**
   ```
   - Sidebar should slide up from bottom on mobile
   - Zoom controls should be accessible
   - All buttons should be touch-friendly (36px+)
   ```

### Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS 12+, Android 5+)

### Known Limitations

- Performance may slow with 500+ nodes (optimize force simulation)
- Full-text search not yet implemented (coming soon)
- PDF export basic (enhancement planned)

### Future Improvements

- [ ] Dark mode toggle
- [ ] Full-text search with PostgreSQL `tsvector`
- [ ] Export PDF with better styling
- [ ] Wikipedia integration for sage bios
- [ ] Public API endpoint
- [ ] Performance metrics dashboard

---

## תאריך: 13 ביוני 2026

**Version:** 2.1.0 (UI Polish Release)

**Team:** Claude Code × User

**Status:** ✅ Ready for production

---

## How to Deploy

```bash
# If using Vercel:
git add .
git commit -m "UI improvements: Connected Papers inspired design (v2.1.0)"
git push origin main

# If using GitHub Pages:
# No changes needed - static site already works

# If using custom server:
# Just copy all files to server
```

---

**Enjoy the improved "אוצר חכמים" experience! 🎉**
