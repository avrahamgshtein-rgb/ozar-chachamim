# 🎯 Center Pull Animation - Smart Graph Focus

## ✅ Feature: Instant Center Positioning

When you select a sage (from search, suggestion, or click):

1. **Selected sage** → Pulled to exact center of screen 🎯
2. **Connected sages** → Arranged around center (nearby)
3. **Other sages** → Fade away (8% opacity)
4. **Smooth animation** → Force simulation pulls everything into place (0.8s)

---

## 🎬 How It Works

### Before Selection
```
All 364 sages scattered
Normal force simulation
All visible (normal opacity)
```

### After Clicking on a Sage
```
IMMEDIATE:
├─ Selected sage pulled to CENTER (exact middle of screen)
├─ Connected sages positioned AROUND selected (nearby)
├─ Other sages DIMMED (8% opacity, fade to edges)
├─ Related connections BRIGHTENED (80% opacity)
└─ Irrelevant connections DIMMED (2% opacity)

Animation Style:
├─ Duration: ~0.8 seconds (smooth slide)
├─ Force Strength: 0.8 (aggressive pull)
├─ Direction: Toward exact center (X, Y)
└─ Effect: "Pop" into focus
```

### After Closing Sidebar
```
RESET:
├─ Center pull forces REMOVED
├─ Simulation returns to NORMAL layout
├─ All nodes visible again (90% opacity)
├─ Natural force-directed layout resumes
└─ Duration: ~0.3s (quick return)
```

---

## 📊 Visual Flow

```
STEP 1: Select Sage (from search or click)
         ↓
    Immediate: Center pull activates
         ↓
    0.2s: Selected slides to center
    0.2s: Connected nodes cluster nearby  
    0.4s: Full layout settles into focus
         ↓
    RESULT: Your sage in middle, circle of connections

STEP 2: Adjust filters/depth
         ↓
    Graph updates (selected stays centered)
         ↓
    Connections filter/reappear as you adjust

STEP 3: Close sidebar
         ↓
    Center pull forces removed
         ↓
    0.3s: Graph returns to normal layout
         ↓
    All sages visible, natural spacing
```

---

## 🎨 Technical Details

### Force Simulation Changes

**New Forces Added:**
```javascript
selectCenter    → forceX with 0.8 strength
                  (pulls selected node to centerX)

selectCenterY   → forceY with 0.8 strength
                  (pulls selected node to centerY)

selectCollide   → forceCollide with larger radii
                  (prevents overlap during pull)
```

### Node Positioning Logic

```
if (node === selected)       → Pulled to (width/2, height/2)
if (node in connected set)   → Randomly scattered ±100px around center
if (node not connected)      → Stays in place (x, y unchanged)
```

### Animation Parameters

```
Force Strength:  0.8 (range: 0-1, higher = stronger pull)
Alpha:           0.8 (range: 0-1, higher = more aggressive movement)
Duration:        ~0.8s (time for full simulation to settle)
```

---

## 💡 Examples

### Example 1: Rabbi Akiva's Network
```
CLICK Rabbi Akiva (from search)
    ↓
Slides to CENTER of screen
    ↓
12 students positioned in circle around him
    ↓
Others fade (8% opacity) to edges
    ↓
You see: Clear centered view of Akiva + immediate network
```

### Example 2: Rambam's Influence
```
SEARCH "רמב״ם" + CLICK
    ↓
Rambam in CENTER
    ↓
Increase depth to 3 hops
    ↓
30+ influenced thinkers arrange in expanding circles
    ↓
You see: Rambam's thought-network radiating outward
```

### Example 3: Explore Student Chain
```
SELECT Ba'al Shem Tov
    ↓
BST centered
    ↓
Select filter "תלמיד של" (Student of)
    ↓
Only students remain visible
    ↓
Centered view of direct student network
```

---

## 🔧 Implementation Details

### When Center Pull Activates
- Called from: `selectNode(node, maxHops)`
- Triggered by: 
  - Clicking sage in graph
  - Selecting from search autocomplete
  - Clicking related sage in sidebar

### Forces Applied
```
selectCenter    (X-axis pull)
selectCenterY   (Y-axis pull)
selectCollide   (Collision avoidance)
```

### Force Parameters
```
Strength:  0.8 (0.6 = moderate, 0.8 = strong, 1.0 = maximum)
Alpha:     0.8 (higher alpha = more aggressive restart)
Distance:  Specific radius per node type (40px selected, 30px connected, 20px others)
```

---

## ✨ Combined With Other Features

- ✅ **Depth slider** — Increases circle of connections (1-3 hops)
- ✅ **Type filter** — Selected sage stays centered, connections filter by type
- ✅ **Era colors** — Maintained during animation
- ✅ **Mobile optimized** — Works on small screens (animation scaled)
- ✅ **Smooth** — No jumping or jarring movements

---

## 📱 Mobile Behavior

On **small screens (< 768px)**:
- Center pull still works
- Connected nodes positioned closer (shorter distances)
- Animation adapted to smaller viewport
- Less aggressive (alpha: 0.6 instead of 0.8)

---

## 🎯 Use Cases

### Case 1: Quick Overview
```
Search "רב" + Select
→ Instant: Rabbi visible at center with students/teachers nearby
→ No need to zoom/pan manually
```

### Case 2: Deep Exploration
```
Select Rabbi A → Increase depth to 3 hops
→ A stays centered, extended network appears
→ Click Rabbi B in network → B auto-centers
→ Repeat to trace connections
```

### Case 3: Focused Study
```
Select Rambam → Filter "השפעה על"
→ Rambam centered, only influenced thinkers visible
→ Clear radial view of intellectual impact
```

---

## 🚀 What Happens When You Close

When you close the sidebar:
1. Center pull forces **removed** from simulation
2. Simulation **restarts** with normal parameters
3. All nodes **visible** again (90% opacity)
4. Graph **naturally disperses** (0.3s animation)
5. Back to full-graph view

---

## 💪 Animation Quality

- **No jumping** — Smooth force-based pull
- **No teleportation** — Gradual slide to center
- **Responsive** — Updates instantly to filter changes
- **Natural** — Uses D3 force simulation (physics-based)

---

## 📊 Summary

| Feature | Before | After |
|---------|--------|-------|
| Selection | Click → highlight | Click → **center pull** |
| Focus | Moderate | **Strong (0.8 strength)** |
| Animation | None | **Smooth 0.8s slide** |
| Connected nodes | Scattered | **Circle around center** |
| Visual | Busy | **Clean focused view** |

---

## ✅ Status: COMPLETE

The center pull animation is fully integrated with:
- ✅ Force simulation restart logic
- ✅ Proper cleanup on sidebar close
- ✅ Mobile optimization
- ✅ Works with all filters/controls

**Ready to deploy!** 🚀
