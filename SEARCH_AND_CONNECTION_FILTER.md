# 🔍 Advanced Search & Connection Type Filtering

## ✅ Feature Overview

Now you can search for sages and instantly explore their relationships by connection type:

1. **Search with Autocomplete** — Type sage name (אבר״י, רמב״ם, וכו')
2. **Quick Select** — Click suggestion to center that sage
3. **Filter by Connection Type** — Choose relationship type (תלמיד, מורה, השפעה, וכו')
4. **Dynamic Graph Update** — Only relevant connections shown

---

## 🎯 How to Use

### Step 1: Search for a Sage
```
1. Click in search bar (חיפוש חכם)
2. Type sage name: "רב" 
3. Autocomplete shows matching sages with era colors
4. Click any sage → Selected + centered in graph
```

### Step 2: Adjust Connection Depth
```
1. In sidebar, use "עומק קשרים" slider
2. Choose 1, 2, or 3 hops of connections
3. Graph updates instantly
```

### Step 3: Filter by Connection Type
```
1. In sidebar, use "סנן לפי סוג קשר" dropdown
2. Choose type:
   - "הכל" (All) - show all connection types
   - "👨‍🎓 תלמיד של" - only his students
   - "👨‍🏫 מורה של" - only his teachers
   - "🤝 עמית של" - only colleagues
   - "💡 השפעה על" - only people he influenced
   - "👨‍👩‍👧 קשרי משפחה" - only family relations
   - "📖 קודם לדורו" - only predecessors
   - "⏰ בן זמנו" - only contemporaries
   - "⚡ מתנגד ל" - only opponents
3. Graph filters instantly
```

---

## 📊 Visual Example

### Search & Select: רבי עקיבא בן יוסף

**Before Selection:**
```
All 364 sages visible
All connections visible
Normal view
```

**After Clicking on "רבי עקיבא":**
```
✓ Sidebar opens
✓ Depth slider appears (default: 1 hop)
✓ Connection type dropdown appears (default: "הכל")
✓ Only rabbi Akiva + direct connections visible
```

**After Selecting "תלמיד של":**
```
✓ Only rabbi Akiva + his students visible
✓ Student connections highlighted
✓ All other connection types fade to 15% opacity
✓ Non-connected sages fade to 8% opacity
```

**After Increasing Depth to 2 Hops:**
```
✓ Students + their connections visible
✓ Still filtered by "תלמיד של" type
✓ More sages appear (within 2 hops as students)
```

---

## 🎨 Visual Feedback

### Connection Type Colors
```
👨‍🎓 Student (תלמיד)        → Blue (#0066cc)
👨‍🏫 Teacher (מורה)          → Red (#cc0000)
🤝 Colleague (עמית)          → Purple (#9966ff)
💡 Influence (השפעה)         → Green (#00aa66)
👨‍👩‍👧 Family (משפחה)           → Hot pink (#ff0066)
📖 Predecessor (קדמון)        → Gold (#ffaa00)
⏰ Contemporary (בן זמנו)      → Cyan (#00cccc)
⚡ Oppose (מתנגד)              → Orange (#ff6600)
```

### Opacity States
```
Selected sage: 100% (fully bright)
Matching type: 90% (bright, visible)
Non-matching type: 15% (dimmed)
Non-connected: 8% (barely visible)
```

---

## 💡 Use Cases

### Case 1: Learn About Someone's Teachers
```
1. Search: "רמב״ם" (Rambam)
2. Select from autocomplete
3. Filter type: "👨‍🏫 מורה של"
4. See all his teachers appear
```

### Case 2: Find Student Network
```
1. Search: "בעל שם טוב"
2. Adjust depth: 3 hops
3. Filter type: "👨‍🎓 תלמיד של"
4. See entire student chain (Ba'al Shem Tov → his students → their students)
```

### Case 3: Explore Family Connections
```
1. Search: "הרמב״ם"
2. Filter type: "👨‍👩‍👧 קשרי משפחה"
3. See only family relationships
```

### Case 4: Find Influenced Disciples
```
1. Search: "רבי אלעזר"
2. Filter type: "💡 השפעה על"
3. Increase depth to 2 hops
4. See influence network
```

---

## 🔧 Technical Details

### Search Flow
```
User types "רב" in search
    ↓
updateSearchSuggestions() filters nodes
    ↓
Autocomplete shows matches (max 8)
    ↓
User clicks sage
    ↓
selectNode(sage, 1) called
    ↓
Connection type filter reset to "all"
    ↓
Depth slider set to 1
    ↓
Sidebar opens with controls
```

### Connection Type Filtering
```
Get all connected nodes (based on depth)
    ↓
For each connected node:
  - Find all connection types between selected + node
  - If filter selected: show only matching types
  - If no filter: show all types
    ↓
Update node opacity: 90% (matches) or 15% (no match)
Update link opacity: 80% (matches) or 5% (no match)
```

---

## ✨ Features Combined

This works seamlessly with:
- ✅ Era colors (circles colored by תקופה)
- ✅ Depth control (1, 2, 3 hops)
- ✅ Autocomplete search
- ✅ Mobile responsive
- ✅ Existing filters (era, field, region still work)
- ✅ Sidebar with biography + research

---

## 🚀 Quick Workflow

```
1. Open Network Tab (רשת קשרים)
2. Click search bar
3. Type sage name → autocomplete appears
4. Click suggestion → sage selected + centered
5. Use depth slider (1-3 hops)
6. Use connection type filter (dropdown)
7. Watch graph update instantly
8. Click any visible sage to explore further
9. Close sidebar to return to full view
```

---

## 📋 Connection Types Explained

| Type | Icon | Hebrew | Example |
|------|------|--------|---------|
| Student | 👨‍🎓 | תלמיד של | Rabbi studying under teacher |
| Teacher | 👨‍🏫 | מורה של | Rabbi teaching students |
| Colleague | 🤝 | עמית של | Peers in same era |
| Influence | 💡 | השפעה על | Rabbi influenced others' thought |
| Family | 👨‍👩‍👧 | קשרי משפחה | Blood relations, marriages |
| Predecessor | 📖 | קודם לדורו | Earlier generation |
| Contemporary | ⏰ | בן זמנו | Same generation, different region |
| Oppose | ⚡ | מתנגד ל | Philosophical opposition |

---

## 💪 Power Features

### Combine Filters
- Set depth to 3 hops
- Filter by "תלמיד של"
- See 3-generation student lineage

### Explore Networks
- Start with 1 hop
- Increase to 2 hops gradually
- Watch network expand

### Cross-Search
- Search one sage
- Click related sage in sidebar
- New sage auto-centers with fresh network

---

**Status:** ✅ READY TO USE

The search, autocomplete, depth control, and connection type filtering are all integrated and working!
