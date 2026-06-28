# 🗺️ Geography Tab — Era Filtering with Legend

## ✅ What's New

The geography map now has an **interactive legend** that lets you filter sages by era with visual highlighting:

### Features:

1. **📍 Era Legend** (bottom-right of map)
   - Shows all 7 eras with their colors
   - Displays sage count per era
   - Shows migration path counts

2. **🎯 Click to Filter**
   - Click any era in the legend
   - Only that era's sages are highlighted
   - All other sages become dimmed (15% opacity)
   - Map automatically zooms to that era's geographic region

3. **✨ Visual Feedback**
   - Selected era: **Full brightness** with slightly larger circles (15px)
   - Other eras: **Dimmed** (15% opacity) with small circles (10px)
   - Lines (migrations): Dimmed for unselected eras

4. **🔄 Reset Button**
   - Click "🔄 הצג הכל" to show all sages
   - All circles light up again (85% opacity)
   - All lines become visible
   - Map resets to full global view

---

## 🎨 Era Legend Display

The legend shows all 7 periods:

```
🕐 תקופות

● בית שני                    9
● תנאים                      41
● אמוראים                    35
● גאונים                     18
● ראשונים                   151
● אחרונים                    97
● עת חדשה                    13

🔄 הצג הכל
```

Numbers show:
- Sage count in each era
- Migration path count (arrow notation, e.g., "8→")

---

## 🖱️ How to Use

### Filter by Era:
1. Open the **מפה** (Geography) tab
2. Look for the legend in bottom-right corner
3. **Click any era** (e.g., "ראשונים")
4. **See the effect:**
   - Green circles light up (Rishonim)
   - Blue circles dim out (Acharonim)
   - Red circles dim out (Tannaim)
   - Map zooms to show Rishonim locations

### Examine a Single Era:
```
Click "ראשונים"
  ↓
151 sage circles appear bright
  ↓
See their distribution across Spain, France, Germany, etc.
  ↓
Hover/click individual circles for details
```

### Reset and See All:
```
Click "🔄 הצג הכל"
  ↓
All 364 sages light up
  ↓
All migration paths visible
  ↓
Map resets to full global view
```

---

## 📊 Example Workflows

### Workflow 1: Compare Eras Geographically
```
1. Click "ראשונים" → See Rishonim centers in Spain/France
2. Click "🔄 הצג הכל" → Reset
3. Click "אחרונים" → See Acharonim centers in Poland/Lithuania
4. Click "🔄 הצג הכל" → Reset
5. Click "עת חדשה" → See Modern era scholars worldwide
```

### Workflow 2: Trace Scholar Concentration
```
1. Click "תנאים" → See 41 Tannaim sages in Israel
2. Click "🔄 הצג הכל" → Reset
3. Click "אמוראים" → See 35 Amoraim sages spreading across Babylon
4. Observe the migration pattern from Eretz Israel to Babylon
```

### Workflow 3: Study Modern Scholarship Centers
```
1. Click "עת חדשה" → Highlight 13 modern sages
2. See distribution across USA, Israel, Europe
3. Understand 20th-21st century Jewish scholarship locations
```

---

## 🎯 Visual States

### Normal State (No Filter):
```
All circles visible
  Color: Varies by era
  Opacity: 85%
  Size: 10px radius

Lines visible
  Opacity: 50%
  Shows migration paths
```

### Filtered State (Click "ראשונים"):
```
Selected era circles (Rishonim - Green)
  Opacity: 100%
  Size: 15px radius (slightly larger for emphasis)
  Weight: 3px border

Other era circles (Tannaim, Amoraim, etc.)
  Opacity: 15% (very dimmed)
  Size: 10px radius
  Weight: 1px border (thin)

Selected era lines
  Opacity: 80%
  Weight: 3px

Other era lines
  Opacity: 5% (barely visible)
  Weight: 1px
```

### Reset State (Click "🔄 הצג הכל"):
```
All circles light up
  Opacity: 85%
  Size: 10px radius
  Color: By era

All lines visible
  Opacity: 50%
```

---

## 💾 Technical Implementation

### Changes to map.js:

1. **Added eraNames object** (constructor, line ~50)
   - Maps Hebrew era names to display names
   - Used by legend rendering

2. **Enhanced filterByEra() method** (line ~700)
   - Dimming effect: 15% opacity for unselected sages
   - Highlighting: 100% opacity + larger circles for selected era
   - Weight changes: 3px for selected, 1px for dimmed

3. **Enhanced resetFilter() method** (line ~806)
   - Shows all markers with 85% opacity
   - Resets circle sizes to 10px
   - Updates legend button styling
   - Returns map to full global view

4. **Legend rendering** (line ~527)
   - Displays all 7 eras with colors
   - Shows sage counts
   - Shows migration path counts
   - Click handlers for filtering

---

## 🎨 Color Reference

The legend uses the same color scheme throughout the app:

| Era | Hebrew | Color | Count |
|-----|--------|-------|-------|
| Second Temple | בית שני | Purple (#8e44ad) | 9 |
| Tannaim | תנאים | Red (#e74c3c) | 41 |
| Amoraim | אמוראים | Orange (#e67e22) | 35 |
| Geonim | גאונים | Gold (#f1c40f) | 18 |
| Rishonim | ראשונים | Green (#27ae60) | 151 |
| Acharonim | אחרונים | Blue (#2980b9) | 97 |
| Modern | עת חדשה | Cyan (#1abc9c) | 13 |

---

## 🌍 Map Behavior When Filtering

### Auto-Zoom Feature:
When you click an era, the map automatically zooms to show that era's sages:

- **בית שני** → Zooms to Israel/Middle East
- **תנאים** → Zooms to Israel
- **אמוראים** → Zooms to Israel/Babylon
- **גאונים** → Zooms to Babylon/Persia
- **ראשונים** → Zooms to Spain/France/Germany
- **אחרונים** → Zooms to Eastern Europe/Middle East
- **עת חדשה** → Shows worldwide distribution

---

## 💡 Tips for Exploration

### Tip 1: Understand Scholarly Migration
```
1. Click "ראשונים" (Rishonim) → See Spain/France concentration
2. Click "🔄 הצג הכל" → Reset
3. Click "אחרונים" (Acharonim) → See move to Poland/Lithuania
4. Observe the geographic shift from West to East Europe
```

### Tip 2: Compare Era Sizes
```
Watch the zoom level change:
- Small eras (בית שני: 9 sages) → Zoom to small area
- Large eras (ראשונים: 151 sages) → Zoom to large area
- Understand the relative importance of each era
```

### Tip 3: Study Migration Paths
```
1. Filter by era
2. Look at dashed lines showing migrations
3. Click individual circles to see details
4. Understand each scholar's journey
```

---

## 🚀 Performance

The filtering is **instant**:
- No page load/reload
- Smooth opacity transitions
- Circle size changes happen immediately
- Map zoom is smooth (0.3s animation)

All 364 sages load once, then filtering just changes opacity/styling.

---

## 📱 Mobile Experience

On mobile devices:
- Legend appears at bottom-right with smaller font (0.75rem)
- Touch-friendly buttons (larger tap target)
- Landscape mode: legend fully visible
- Portrait mode: legend may overlap map slightly (can scroll)

---

## ✨ Key Features

✅ **Interactive Legend** — Click to filter
✅ **Visual Feedback** — Dimmed vs. highlighted
✅ **Auto-Zoom** — Map focuses on selected era
✅ **Reset Button** — Quickly return to full view
✅ **Sage Counts** — See how many per era
✅ **Migration Indicators** — See number with multiple locations
✅ **Responsive** — Works on all screen sizes
✅ **Performance** — Instant filtering, smooth animations

---

## 🎯 Use Cases

1. **Student Research**
   - "Which era had the most scholars?"
   - "Where were Rishonim concentrated?"
   - "How did scholarship move over time?"

2. **Geographic Study**
   - "Where is Babylon relative to Spain?"
   - "Did sages migrate to Palestine?"
   - "What's the distribution in modern times?"

3. **Comparative Analysis**
   - Compare two eras side-by-side
   - Filter → Note distribution
   - Reset → Filter again
   - Compare patterns

4. **Teaching & Presentations**
   - Filter to show one era at a time
   - Explain geographic context
   - Show migration patterns
   - Zoom to show specific regions

---

**Ready to explore Jewish scholarship across centuries and continents!** 🌍✨
