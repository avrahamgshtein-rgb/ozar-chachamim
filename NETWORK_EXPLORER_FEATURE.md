# 🔍 Network Explorer Feature - Connection Depth Control

## ✅ Feature Overview

When you select a sage (click on their circle), you now get:

1. **Focused View** — Only the selected sage and their connected sages are shown
2. **Adjustable Depth** — Choose how many "layers" of connections to see:
   - **1 hop** = Direct connections only (teacher, student, colleague, etc.)
   - **2 hops** = Direct + their connections (connections-of-connections)
   - **3 hops** = Even further extended network

3. **Color Preservation** — Selected sage keeps their era color (בית שני→Purple, תנאים→Red, etc.)
4. **Smart Filtering** — Other sages fade to 8% opacity, showing only relevant connections

---

## 🎯 How to Use

### Step 1: Select a Sage
Click on any circle in the network graph (רשת קשרים tab)

### Step 2: View Connection Profile
In the sidebar that opens, you'll see:
- Sage name + era color badge
- Period + region information
- **NEW:** Connection depth slider (סליידר עומק קשרים)

### Step 3: Adjust Connection Depth
Use the slider to choose:
- **1 hop** — See only direct connections
- **2 hops** — See one level deeper
- **3 hops** — Maximum depth

The graph updates instantly — watch the network reorganize!

---

## 🔗 What Gets Shown

### Selected Sage (100% opacity)
- Circle at center with era color
- Thick border (4px stroke)
- Fully bright

### Connected Sages (90% opacity)
- Color-coded by era
- Visible but slightly dimmed
- Show connected relationships

### Other Sages (8% opacity)
- Nearly invisible
- Won't interfere with selected network
- Can still click them (if you want to explore further)

### Relevant Links (80% opacity)
- Only show between connected nodes
- All other links fade to 2% opacity
- Connection type still visible (teacher→红, student→blue, etc.)

---

## 💡 Examples

### Example 1: רבי עקיבא בן יוסף (Rabbi Akiva)

**1 Hop (Direct connections):**
```
Rabbi Akiva (center)
├─ Teachers: בן שמעון
├─ Students: 12 תנאים
├─ Colleagues: 5 עמיתים
└─ Influenced: 8 others
```

**2 Hops (Extended network):**
```
Rabbi Akiva (center)
├─ Teachers (and their network)
├─ Students (and their teachers/colleagues)
├─ Colleagues (and their connections)
└─ All influenced sages (2 levels deep)
```

**3 Hops (Maximum depth):**
```
Shows full extended network including:
- Connections of connections
- Broader influence circles
- Historical chains (teacher→student→their student)
```

---

## 🎨 Visual Feedback

When you change the slider:
- **Label updates** — Shows "1 hop", "2 hops", or "3 hops"
- **Graph refreshes** — Connections expand/contract smoothly
- **Console logs** — Shows "📊 Changed connection depth to X hops"
- **Sidebar stays open** — Keep exploring without closing

---

## 🛠️ Technical Details

### Function: `getConnectedNodes(nodeId, maxHops)`
```javascript
// Returns Set of all node IDs connected to nodeId within maxHops
const connectedIds = this.getConnectedNodes('5', 2);
// Returns nodes 1, 3, 7, 12, 18... (all within 2 hops of node 5)
```

### Node Opacity Logic
```
if (node === selected)       → 100% (fully bright)
if (node in connected set)   → 90%  (bright but visible others)
if (node outside connected)  → 8%   (barely visible)
```

### Link Opacity Logic
```
if (both nodes in connected set) → 80% (show relationship)
if (either node outside set)     → 2%  (nearly invisible)
```

---

## 📊 Performance Notes

- **1 hop** — Instant (direct connections only, typically 5-30 nodes)
- **2 hops** — Fast (most sage networks, typically 20-100 nodes)
- **3 hops** — Slightly slower (large networks, 50-200+ nodes)

All calculations are done client-side in real-time with no server round-trip.

---

## 🎯 Use Cases

### Case 1: Learn About a Sage's Teachers
Select the sage → Set to "1 hop" → See who taught them

### Case 2: Understand Impact Radius
Select the sage → Increase to "2 hops" → See their students + students' students

### Case 3: Explore Historical Chains
Select Rabbi A → 3 hops → See full lineage and influence networks

### Case 4: Find Connections Between Two Sages
Select Sage 1 → 2-3 hops → See if (and how) they're connected to Sage 2

---

## ✨ Combined Features

This works together with existing features:

- **Era colors** — Sage circles colored by תקופה (period)
- **Double-click protection** — Dimmed sages still require 2 clicks
- **Smart click** — Easy to click selected (1 hop), harder to accidentally click dimmed
- **Sidebar info** — Full biography, research, lesson plans visible
- **Mobile optimized** — Slider works on touch devices, responsive

---

## 🚀 Quick Tips

1. **Start with 1 hop** — See immediate relationships
2. **Expand gradually** — Increase hops to explore deeper
3. **Watch the connections** — Colors show relationship types
4. **Click related sages** — Explore the network by clicking connected sages
5. **Close sidebar** — Returns graph to full view (all sages visible again)

---

## 🔄 Workflow

```
1. Open Network Tab (רשת קשרים)
2. Click a sage circle
3. Sidebar opens with profile + connection slider
4. Adjust slider to see 1, 2, or 3 hop connections
5. Click a connected sage to explore further
6. Close sidebar to return to full graph view
7. Filters (era, field, region) still work as before
```

---

**Status:** ✅ READY TO USE

The Connection Network Explorer is fully integrated. Just select a sage and adjust the slider!
