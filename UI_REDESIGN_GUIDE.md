# 🎨 אוצר חכמים - UI Redesign Guide

## Overview
The new UI design is inspired by professional visualization tools like "History of Philosophy" - clean, organized, and focused on content discovery.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ אוצר חכמים  |  רשת קשרים |  טבלה |  מפה | אודות ...      │ HEADER
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ LEFT SIDEBAR  │     CENTER GRAPH    │  RIGHT SIDEBAR      │
│ (280px)       │     (FLEX)          │   (300px)           │
│               │                      │                     │
│ 🎨 LEGEND    │                      │  👤 SAGE DETAILS   │
│ ────────     │                      │  ────────────      │
│ בית שני   ●  │                      │  • Name + Era      │
│ תנאים    ●  │    D3 GRAPH         │  • Period          │
│ אמוראים   ●  │    (Nodes & Links)   │  • Biography       │
│ גאונים    ●  │                      │  • Connections     │
│ ראשונים   ●  │                      │  • Depth Slider    │
│ אחרונים   ●  │                      │  • Type Filter     │
│ עת חדשה  ●  │                      │  • Related Sages   │
│               │                      │                    │
│ 🔍 FILTERS   │                      │                    │
│ ────────     │                      │                    │
│ Search       │                      │                    │
│ Era Filter   │                      │                    │
│ Region       │                      │                    │
│ Field        │                      │                    │
│ Min Conn.    │                      │                    │
│               │                      │                    │
└───────────────┴──────────────────────┴────────────────────┘
```

---

## 1. HEADER

### Design
- Background: Linear gradient (white → light gray)
- Height: 60px (1rem padding + content)
- Shadow: 0 2px 8px rgba(0,0,0,0.06)
- Border-bottom: 2px solid #e5e5e5

### Elements
```
LEFT: Logo
├─ H1: "אוצר חכמים" (Frank Ruhl Libre, bold, 1.6rem)
└─ P: "רשת חכמי ישראל" (gray, 0.7rem, uppercase)

CENTER: Tabs
├─ רשת קשרים (Network)
├─ טבלה (Table)
├─ מפה (Map)
├─ 🔍 השוואה (Comparator)
├─ 📚 מחקר (Research)
└─ אודות (About)

RIGHT: Actions
├─ 🔍 חפש קשר (Path Finder)
├─ ⟳ Reset
└─ 💾 Export (Primary button - dark background)

FAR RIGHT: Language Switcher
├─ עברית
├─ English
└─ Русский
```

---

## 2. LEFT SIDEBAR (280px)

### Design
- Fixed width: 280px
- Background: #ffffff
- Border-right: 1px solid #e5e5e5
- Scrollable (overflow-y: auto)
- Padding: 1.5rem 1rem
- Gap between sections: 1.5rem

### Sections

#### A. ERA LEGEND (Top Priority)
```css
.era-legend
├─ Title: "תקופות" (small, bold, uppercase, gray)
├─ Items (each):
│  ├─ ● (colored dot, 10px diameter)
│  ├─ Label (0.85rem, #333)
│  └─ Hover: Background #f5f5f5
│
├─ בית שני     ● (Purple #8e44ad)
├─ תנאים      ● (Red #e74c3c)
├─ אמוראים     ● (Orange #e67e22)
├─ גאונים      ● (Gold #f1c40f)
├─ ראשונים     ● (Green #27ae60)
├─ אחרונים     ● (Blue #2980b9)
└─ עת חדשה    ● (Cyan #1abc9c)
```

#### B. SEARCH BOX
```
┌─────────────────┐
│ 🔎 חפש חכם    │
├─────────────────┤
│ [Search input ] │ (width: 100%, padding: 0.4rem)
└─────────────────┘
- Placeholder: "שם בעברית או אנגלית..."
- Direction: RTL
- Border: 1px solid #ddd
- Border-radius: 4px
```

#### C. FILTER SECTION 1: By Period
```
📌 תקופה (label)
┌─────────────────┐
│ [Dropdown v   ] │
│ בחר תקופה...    │
└─────────────────┘
- Options: בית שני, תנאים, אמוראים, ...
```

#### D. FILTER SECTION 2: By Region
```
📍 אזור (label)
┌─────────────────┐
│ [Dropdown v   ] │
│ בחר אזור...     │
└─────────────────┘
- Options: Populated from data
```

#### E. FILTER SECTION 3: By Field
```
📚 תחום (label)
┌─────────────────┐
│ [Dropdown v   ] │
│ בחר תחום...     │
└─────────────────┘
- Options: הלכה, קבלה, הנהגה, מוסר, etc.
```

#### F. FILTER SECTION 4: By Minimum Connections
```
🔗 מינימום קשרים (label)
┌─────────────────┐
│ [Range slider ] │ (0-10)
│ Value: X        │
└─────────────────┘
```

#### G. CONNECTION TYPE FILTER
```
🎯 סוג קשר (label)
┌─────────────────┐
│ [Dropdown v   ] │
│ הכל - כל סוגים  │
└─────────────────┘
- Options: All, תלמיד, מורה, עמית, etc.
```

---

## 3. CENTER: NETWORK GRAPH

### Design
- Flex: 1 (takes available space)
- Background: #ffffff
- Smooth D3 force-directed simulation
- Responsive to filters

### Elements
```
┌─────────────────────────────────┐
│ 🔍 חפש חכם... │ ⚙️ Zoom Controls │ (Search bar + zoom)
├─────────────────────────────────┤
│                                 │
│        D3 FORCE GRAPH           │
│    (Nodes + Links)              │
│                                 │
│    Click node → Right sidebar   │
│    opens                        │
│                                 │
│    Hover node → Tooltip shows   │
│    name + era + connections     │
│                                 │
└─────────────────────────────────┘
```

### Interactions
- **Click node**: Opens right sidebar with details + depth slider + type filter
- **Drag node**: Smooth movement (D3 simulation)
- **Hover node**: Tooltip appears with sage info
- **Search**: Autocomplete filters + highlights matches
- **Zoom**: +/- buttons or mouse wheel

---

## 4. RIGHT SIDEBAR (300px) - Sage Details

### Design
- Fixed width: 300px
- Background: #ffffff
- Border-left: 1px solid #e5e5e5
- Scrollable content
- Appears when node is selected

### Sections

#### A. Header Card
```
┌─────────────────┐
│ [X] (close btn) │
│ Era Badge       │
│ Name (large)    │
│ Period + Region │
│ Primary Field   │
│ ID #            │
└─────────────────┘
```

#### B. Connection Depth Control
```
🔗 עומק קשרים
├─ [Slider ─●──] (1-3)
│ 1 hop / 2 hops / 3 hops
└─ Select connection depth
```

#### C. Connection Type Filter
```
🎯 סנן לפי סוג קשר
├─ [Dropdown] 
│ ├─ הכל
│ ├─ 👨‍🎓 תלמיד של
│ ├─ 👨‍🏫 מורה של
│ ├─ 🤝 עמית של
│ ├─ 💡 השפעה על
│ ├─ 👨‍👩‍👧 משפחה
│ └─ ...
├─ Badge: "X קשרים"
└─ Graph updates in real-time
```

#### D. Biography
```
ביוגרפיה
────────
[Long text content]
```

#### E. Research (if available)
```
📖 מחקר זמין
├─ Click to expand
└─ [Research content]
```

#### F. Lesson Plan (if available)
```
📚 יש שיעור זמין!
├─ Click to expand
└─ [Lesson plan content]
```

#### G. Related Sages
```
🔗 קשרים
────────
[List of connected sages]
├─ Click to select & explore
└─ Each shows connection type
```

---

## Color Scheme

### Era Colors (Legend)
```css
בית שני     #8e44ad  (Purple)
תנאים      #e74c3c  (Red)
אמוראים     #e67e22  (Orange)
גאונים      #f1c40f  (Gold)
ראשונים     #27ae60  (Green)
אחרונים     #2980b9  (Blue)
עת חדשה    #1abc9c  (Cyan)
```

### UI Colors
```css
Text:       #1a1a1a (dark)
Secondary:  #666    (medium)
Tertiary:   #999    (light)
Borders:    #e5e5e5 (very light)
Background: #fafafa (almost white)
Hover:      #f5f5f5 (light hover)
```

### Connection Type Colors
```css
Student:      #0066cc (Blue)
Teacher:      #cc0000 (Red)
Colleague:    #9966ff (Purple)
Influence:    #00aa66 (Green)
Family:       #ff0066 (Hot pink)
Predecessor:  #ffaa00 (Gold)
Contemporary: #00cccc (Cyan)
Oppose:       #ff6600 (Orange)
```

---

## Typography

### Fonts
```css
Headers (Hebrew):   'Frank Ruhl Libre', serif
Body (English):     'Inter', sans-serif
Monospace (IDs):    'Courier New', monospace
```

### Sizes
```css
h1:         1.6rem  (Logo)
h2:         1.4rem  (Sage name in sidebar)
h3:         1.1rem  (Section headers)
label:      0.75rem (Filter labels)
body:       0.9rem  (Regular text)
small:      0.75rem (Metadata)
```

### Weights
```css
Logo Title:         900 (bold)
Headers:            700 (bold)
Labels:             600 (semi-bold)
Body:               400 (regular)
```

---

## Spacing Rules

```css
Padding:
- Sidebar: 1.5rem 1rem
- Header:  1rem 1.5rem
- Cards:   1rem

Margins:
- Between sidebar sections: 1.5rem
- Between filter groups: 0.75rem
- Between legend items: 0.6rem

Gaps:
- Header elements: 2rem
- Filter labels/inputs: 0.25rem
- Legend dots/text: 0.6rem
```

---

## Interactive States

### Buttons
```css
Default:    background: white, border: #d0d0d0
Hover:      background: #f9f9f9, border: #1a1a1a
Active:     scale: 0.98 (pressed down)
Disabled:   opacity: 0.5
```

### Inputs
```css
Default:    border: #d0d0d0, box-shadow: 0 1px 3px rgba(0,0,0,0.05)
Focus:      border: #1a1a1a, box-shadow: 0 2px 8px rgba(0,0,0,0.1)
Active:     color: #1a1a1a
```

### Legend Items
```css
Default:    color: #333, background: transparent
Hover:      background: #f5f5f5, cursor: pointer
Active:     background: #f0f0f0, font-weight: 600
```

---

## Responsive Design

### Breakpoints

#### Desktop (> 1024px)
- All sidebars visible
- Full-width graph
- All filters visible

#### Tablet (768px - 1024px)
- Left sidebar: collapse to icons
- Right sidebar: 250px
- Graph: flex-grow

#### Mobile (< 768px)
- Left sidebar: Hidden, toggle with ☰ menu
- Right sidebar: Hidden, appears on demand
- Graph: Full width
- Filters: Collapsed accordion style

---

## Mobile Optimization

```css
@media (max-width: 768px) {
  .graph-filters {
    display: none;  /* or collapse to icons */
    position: fixed;
    left: 0;
    width: 280px;
    height: 100vh;
    z-index: 100;  /* Above graph when open */
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  .graph-filters.open {
    transform: translateX(0);
  }

  .graph-container {
    width: 100%;
    margin-left: 0;
  }

  .sidebar {
    display: none;  /* or slide in from right */
  }
}
```

---

## CSS Classes Reference

```css
.header              /* Main header bar */
.logo               /* Logo section */
.tabs               /* Tab navigation */
.graph-filters      /* Left sidebar with filters */
.graph-container    /* Center graph area */
.graph-toolbar      /* Search + zoom controls */
.sidebar            /* Right sidebar (details) */
.era-legend         /* Legend section */
.era-legend-item    /* Individual legend row */
.filter-group       /* Single filter section */
.sage-tooltip-rich  /* Hover tooltip styling */
```

---

## Implementation Status

✅ Header redesigned with better typography
✅ Left sidebar structure added (280px width)
✅ Era legend CSS prepared
✅ Filter styling updated
✅ Graph container responsive
✅ Right sidebar styling maintained
⏳ Mobile toggle menu (TODO)
⏳ Icons for filter sections (TODO)

---

## Next Steps

1. Add hamburger menu for mobile left sidebar
2. Implement legend click interactions
3. Add filter section icons/emojis
4. Test responsive behavior on devices
5. Polish transitions and animations
6. Add dark mode support
