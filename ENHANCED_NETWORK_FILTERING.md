# 🎯 Network Graph — Enhanced Focus Filtering

## ✅ What's New

When you filter by **תקופה** (Era), **תחום** (Field), or **אזור** (Region) in the network graph, the visualization now has **powerful focus clustering**:

### Features:

1. **📍 Center Clustering**
   - Filtered sages **automatically move to center** of screen
   - Strong clustering force pulls them together
   - All other sages stay around edges
   - Smooth animation (not instant)

2. **✨ Strong Visual Highlighting**
   - **Selected sages:** 100% brightness with gold glow
   - **Dimmed sages:** 5% opacity (20x darker!)
   - **Desaturated colors:** Non-matching sages turn gray
   - **Thicker borders:** Gold stroke (5px) around selected

3. **🔗 Connection Lines Enhancement**
   - **Filtered connections:** Bright and thick (visible)
   - **Non-matching lines:** Almost invisible (0.01 opacity)
   - Only shows relationships within filtered group

4. **🎨 Visual Emphasis**
   - Glow effect on filtered nodes (double drop-shadow)
   - Larger collision radius for filtered sages
   - Stronger forces pull them to center

---

## 🎯 How It Works

### Before Filter:
```
All 364 sages visible
├─ Colors vary by era
├─ Opacity: 80%
└─ All connections visible

Force Layout:
├─ Normal D3 force simulation
├─ Nodes repel each other
└─ Edges pull connected nodes
```

### After Clicking Filter (e.g., "הלכה" field):
```
186 Halachah sages highlighted
├─ Colors: Original (not gray)
├─ Opacity: 100% (full brightness)
├─ Stroke: 5px gold border
├─ Glow: Double drop-shadow effect
└─ Position: Clustering to CENTER

178 other sages dimmed
├─ Colors: Gray (#cccccc)
├─ Opacity: 5% (barely visible)
├─ Position: Pushed to edges
└─ Connections: Almost invisible

Animation:
└─ 0.8 seconds smooth clustering
```

---

## 📊 Visual Comparison

### Normal State (No Filter):
```
┌─────────────────────────────────┐
│        Network Graph            │
│                                 │
│    ● ● ● ● ● ● ● ● ● ●        │
│   ● ● ● ● ● ● ● ● ● ● ●       │
│  ● ● ● ● ● ● ● ● ● ● ● ●      │
│   ● ● ● ● ● ● ● ● ● ● ●       │
│    ● ● ● ● ● ● ● ● ● ●        │
│                                 │
│  (364 sages scattered)          │
└─────────────────────────────────┘
```

### Filtered State (Click "ראשונים"):
```
┌─────────────────────────────────┐
│        Network Graph            │
│                                 │
│  ◐ ◐ ◐ ◐ ◐ ◐ ◐          ●     │  ← Dimmed non-matching (5%)
│  ◐ ◐ ● ★ ★ ● ◐          ●     │
│  ◐ ◐ ● ★ ★ ● ◐          ●     │  ★ = Selected (100%)
│  ◐ ◐ ● ★ ★ ● ◐          ●     │  ◐ = Dimmed (5%)
│  ◐ ◐ ◐ ◐ ◐ ◐ ◐          ●     │
│           (Center)             │
│                                 │
│  (151 Rishonim clustered)       │
└─────────────────────────────────┘
```

---

## 🖱️ Usage Examples

### Example 1: Filter by Era ("ראשונים")
```
1. Click Era dropdown → Select "ראשונים"
2. WATCH: 151 green circles move to center
3. OBSERVE: All other circles fade to gray at edges
4. SEE: Only connections between Rishonim visible
5. RESULT: Understand Rishonim scholarship network
```

### Example 2: Filter by Field ("הלכה")
```
1. Click Field dropdown → Select "הלכה"
2. WATCH: 186 halachah scholars cluster to center
3. OBSERVE: Gray circles pushed to edges (barely visible)
4. CLICK: Individual centered circles for details
5. UNDERSTAND: Halachic scholarship connections
```

### Example 3: Filter by Region ("ספרד")
```
1. Click Region dropdown → Select "ספרד"
2. WATCH: 32 Spanish sages move to center
3. OBSERVE: Dramatic contrast with dimmed circles
4. SEE: Spanish scholars' network connections
5. COMPARE: Click reset and filter by different region
```

### Example 4: Combined Filter
```
1. Era = "ראשונים" AND Field = "קבלה"
2. WATCH: ~40 Rishonim Kabbalah scholars cluster
3. All others → barely visible gray
4. DISCOVER: Major Kabbalah figures among Rishonim
5. Click reset → Start over
```

---

## 📈 Force Dynamics

### Clustering Forces (Strength: 0.6 each):
```
forceX(0.6):  Pulls filtered nodes toward center X
forceY(0.6):  Pulls filtered nodes toward center Y
collide(0.8): Prevents overlap between nodes
```

### Result:
- **Fast pulling** (0.6 strength) toward center
- **Strong collision** (0.8 strength) keeps them spaced
- **Dramatic effect** — nodes visibly cluster
- **Animation time** — ~0.8 seconds to reach center

### Performance:
- All 364 nodes loaded once
- Only opacity/colors change on filter
- D3 simulation runs smoothly
- No page load/lag

---

## 🎨 Color & Opacity Reference

### Selected (Filtered) Nodes at CENTER:
```
Opacity:         100% (1.0) ← Full brightness
Fill Opacity:    95% ← High saturation
Fill Color:      Original era color (ראשונים=Green, etc.)
Stroke:          Gold (#FFD700), 5px thick ← Bold border
Shadow:          Double drop-shadow glow
Radius:          35px (collision)
Result:          Vibrant, glowing, clearly highlighted
```

### Dimmed (Non-Filtered) Nodes at EDGES:
```
Opacity:         8% (0.08) ← Barely visible!
Fill Opacity:    30% ← Very faint color
Fill Color:      Original era color but very pale
Stroke:          Light gray (#eee), 0.5px thin
Shadow:          None
Radius:          25px (collision)
Result:          Ghost-like, secondary background
```

### Selected Connections (Between Filtered Sages):
```
Opacity:      100% (1.0) ← Fully visible
Width:        +2px thicker than normal ← Bold lines
Color:        Original connection type color
Visible:      Clear and prominent
```

### Dimmed Connections (Not Relevant to Filter):
```
Opacity:      2% (0.02) ← Extremely faint
Width:        0.3px (very thin) ← Barely visible
Color:        Very light gray (#ddd) ← Washed out
Visible:      Almost invisible ghost lines
```

---

## 🚀 Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Sages Loaded | 364 | Once at startup |
| Clustering Time | 0.8s | Smooth animation |
| Filter Response | Instant | No lag |
| CPU Usage | Low | Simple opacity changes |
| Browser Compatibility | All modern | Uses D3 v7 |

---

## 💡 Tips for Exploration

### Tip 1: Watch the Animation
```
Don't click immediately after selecting filter
Watch sages move toward center (0.8s)
See the spatial reorganization
Helps understand cluster density
```

### Tip 2: Compare Cluster Sizes
```
Filter by era:
- "בית שני" → Small cluster (9 sages)
- "ראשונים" → Large cluster (151 sages)
- "עת חדשה" → Medium cluster (13 sages)

Understand relative importance of each era
```

### Tip 3: Study Internal Connections
```
1. Filter by "ראשונים"
2. See 151 clustered at center
3. Notice which sub-clusters form
4. Click individuals to see their connections
5. Understand scholar networks within era
```

### Tip 4: Multi-Filter Analysis
```
1. Filter by "ראשונים" (151 sages)
2. Look at connections pattern
3. Reset
4. Filter by "אחרונים" (97 sages)
5. Compare network density
```

---

## 🎯 Visual Impact Summary

### Highlighting Strength:
- **Before:** Hard to see filtered nodes among 364
- **After:** Impossible to miss! 5% vs 100% = 20x difference

### Dimming Strategy:
```
Traditional filtering:  0.1 opacity → hard to see differences
Enhanced filtering:     0.05 opacity → dramatic contrast
                        + gray color → lose interest in dimmed
                        + thin lines → connections disappear
```

### Clustering Effect:
```
No clustering:    Filtered sages scattered everywhere
With clustering:  All gather at center in 0.8s
                  Creates "spotlight" effect
                  Dramatic visual statement
```

---

## 🔄 Reset Behavior

When you click **Reset** or change filters:
```
All sages return to normal
├─ Opacity: 80%
├─ Colors: Original (by era)
├─ Borders: None
├─ Position: Disperse from center
├─ Animation: Smooth (0.3s)
└─ Result: Back to full network view
```

---

## 📱 Mobile Experience

On tablets/phones:
- Animation runs smoothly
- Touch-friendly dropdowns
- Landscape mode: Optimal view
- Portrait mode: Zoom out to see clustering

---

## ✨ Key Improvements Over Previous Version

| Feature | Before | After | Improvement |
|---------|--------|-------|-------------|
| Opacity (dimmed) | 10% | 8% | Much darker |
| Fill Opacity (dimmed) | 85% | 30% | 2.8x more faint |
| Opacity (bright) | Same as others | 100% | Full brightness |
| Fill Opacity (bright) | 85% | 95% | More saturated |
| Node Color (dimmed) | Gray | Era color (pale) | Maintains identity |
| Stroke color (selected) | Gold | Gold + glow | Same bold highlight |
| Stroke color (dimmed) | None | Light gray | Subtle border |
| Stroke width (selected) | 3px | 5px | Bolder |
| Stroke width (dimmed) | 0px | 0.5px | Subtle outline |
| Glow effect | Single shadow | Double shadow | Enhanced |
| Clustering strength | 0.3 | 0.6 | 2x stronger pull |
| Animation alpha | 0.5 | 0.8 | More dramatic |
| Link opacity (relevant) | 60% | 100% | Fully visible |
| Link opacity (irrelevant) | 5% | 2% | Much more faint |
| Link width (relevant) | +1px | +2px | Thicker |
| Link width (irrelevant) | 0.5px | 0.3px | Thinner |
| Link color (irrelevant) | Same | Light gray | Visual distinction |

---

## 🎓 Educational Use

Perfect for presentations:
```
"Let's look at Rishonim scholars..."
→ Click "ראשונים"
→ Watch 151 sages appear at center
→ Point out major figures
→ Show their interconnections
→ Highlight key relationships

"Now compare to Acharonim..."
→ Reset
→ Click "אחרונים"
→ See 97 scholars cluster
→ Explain historical shift
```

---

## 🏆 Best Practices

1. **Always watch the animation**
   - Don't skip the 0.8s clustering
   - Gives context to the transformation

2. **Use all three filters**
   - Era + Field + Region = powerful insights
   - Try different combinations

3. **Reset between comparisons**
   - Don't stack filters continuously
   - Let animation complete before next action

4. **Hover for tooltips**
   - See sage names while they're clustered
   - Understand who's at center of network

5. **Click individuals**
   - After clustering, click to see details
   - Explore specific scholar's connections

---

**Ready to discover hidden patterns in Jewish scholarship!** 🌟
