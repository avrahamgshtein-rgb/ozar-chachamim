# Design Specification: אוצר חכמים UI Redesign

**Reference:** Six Degrees of Francis Bacon + Philosophy History Visualizer
**Goal:** Match visual design & UX patterns with our Hebrew sages data

---

## Visual Design Mapping

### Current State → Target State

| Element | Current | Target (From Reference) |
|---------|---------|-------------------------|
| **Nodes** | Small circles | Circular with portraits (64px) |
| **Node Colors** | By period | By field/branch (same colors) |
| **Edges** | Single color | Green (agreement) / Red (disagreement) |
| **Edge Thickness** | Uniform | Varies by strength |
| **Left Panel** | Sidebar details | Sage bio card with image |
| **Right Panel** | Filter controls | Organized filter section |
| **Header** | Minimal | Logo + search bar + language switcher |
| **Footer** | Info text | Credit/attribution |

---

## Layout Architecture

### Reference Design Structure
```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: Logo | Search Bar | Language Buttons                    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  LEFT PANEL          GRAPH CANVAS              RIGHT PANEL      │
│  ┌───────────┐      ┌──────────────┐          ┌──────────────┐ │
│  │ Sage Info │      │              │          │   FILTERS    │ │
│  │ • Name    │      │   FORCE      │          │ • Era        │ │
│  │ • Dates   │      │   DIRECTED   │          │ • Field      │ │
│  │ • Bio     │      │   GRAPH      │          │ • Density    │ │
│  │ • Tags    │      │ (364 sages)  │          │ • Layout     │ │
│  │           │      │              │          │ • Labels     │ │
│  │ [Buttons] │      │              │          │              │ │
│  └───────────┘      └──────────────┘          └──────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Current Implementation → Target Changes

**What's already done:**
✅ Options panel with controls
✅ Dark mode
✅ Multilingual (3 languages)
✅ localStorage persistence

**What needs visual polish:**
- [ ] Move options to organized right panel
- [ ] Enhance node display (add portraits)
- [ ] Color edges by connection type (agreement/disagreement)
- [ ] Improve left sidebar layout
- [ ] Better responsive design
- [ ] Polish typography and spacing

---

## Detailed Component Redesign

### 1. NODES - Add Portraits & Better Styling

**Current:**
```javascript
circle
  .attr('r', 5)
  .attr('fill', colorByPeriod)
  .attr('stroke', 'white')
```

**Target:**
```javascript
// Use SVG image elements for portraits
g.append('image')
  .attr('xlink:href', d => d.image_url)
  .attr('width', 64)
  .attr('height', 64)
  .attr('x', d => d.x - 32)
  .attr('y', d => d.y - 32)
  .attr('rx', 32)  // Round corners

// Add colored ring by field
circle.append('circle')
  .attr('r', 34)
  .attr('fill', 'none')
  .attr('stroke', colorByField)
  .attr('stroke-width', 3)
```

**Visual Result:**
- Circular portrait images (64px diameter)
- Colored border ring matching field/branch
- Hover: Glow effect
- Click: Show sidebar with full details

---

### 2. EDGES - Color by Connection Type

**Current:**
All edges same color/opacity

**Target - Connection Types:**
- **Green (Agreement)** - תלמיד/Teacher, influential connection
- **Red (Disagreement)** - oppose, contradiction
- **Pink (Contemporary)** - colleague, contemporary
- **Width** - reflects strength (0.5-4px)
- **Opacity** - reflects confidence (0.2-0.8)

**Implementation:**
```javascript
link
  .attr('stroke', d => {
    if (d.type === 'student') return '#27ae60';    // Green
    if (d.type === 'oppose') return '#e74c3c';     // Red
    if (d.type === 'colleague') return '#e8b4d9';  // Pink
    return '#95a5a6';  // Gray (neutral)
  })
  .attr('stroke-width', d => (d.strength || 0.5))
  .attr('opacity', d => (d.confidence || 0.6))
```

---

### 3. LEFT SIDEBAR - Enhanced Sage Card

**Current:**
Simple text list

**Target:**
```
┌─────────────────────────┐
│   [× Close]             │
├─────────────────────────┤
│                         │
│    [Portrait Image]     │
│      (with frame)       │
│                         │
├─────────────────────────┤
│                         │
│  רבי דוד דיכובסקי       │
│  Rabbi David Dychovs... │
│                         │
│  📅 1920-1995           │
│  📍 Eretz Israel         │
│  🏷️ Ethics              │
│                         │
│  Bio Text:              │
│  "20th-century ethicist │
│   known for..."         │
│                         │
├─────────────────────────┤
│                         │
│ CONNECTIONS:            │
│ • 5 Students            │
│ • 3 Teachers            │
│ • 8 Colleagues          │
│                         │
├─────────────────────────┤
│ [🖨️ Print] [📄 Export] │
│                         │
└─────────────────────────┘
```

**Features:**
- Portrait with colored frame (by field)
- Bilingual names (Hebrew + English)
- Dates, location, field
- Biography text
- Connection counts
- Action buttons (Print/Export)
- Smooth open/close animation

---

### 4. RIGHT PANEL - Organized Filters

**Current:**
Single row of controls

**Target:**
```
┌──────────────────────┐
│   FILTERS            │
├──────────────────────┤
│                      │
│  🔍 SEARCH           │
│  [Search by name...] │
│                      │
├──────────────────────┤
│  📊 ERA              │
│  ☐ Ancient (50)      │
│  ☐ Medieval (120)    │
│  ☐ Modern (150)      │
│  ☐ Contemporary (44) │
│                      │
├──────────────────────┤
│  🏷️ FIELD            │
│  ☐ Ethics (85)       │
│  ☐ Kabbalah (60)     │
│  ☐ Logic (45)        │
│  ☐ Metaphysics (38)  │
│                      │
├──────────────────────┤
│  🎨 DISPLAY          │
│  Density:            │
│  [Sparse] [Normal]   │
│  [Dense]             │
│                      │
│  Layout:             │
│  [Force]             │
│  [Concentric]        │
│  [Circular]          │
│                      │
├──────────────────────┤
│  🔗 CONNECTIONS      │
│  Strength:           │
│  [0%─────●────100%]  │
│                      │
│  Show Labels:        │
│  [Toggle]            │
│                      │
├──────────────────────┤
│  [🔄 Reset All]      │
│                      │
└──────────────────────┘
```

**Features:**
- Collapsible sections
- Checkboxes with counts
- Clear hierarchy
- Visual feedback on selection
- Scrollable if too long
- Dedicated search box

---

### 5. HEADER - Refined & Clean

**Current:**
Logo | Tabs | Language Buttons

**Target:**
```
┌──────────────────────────────────────────────────────────┐
│  [Logo] אוצר חכמים    [Search Bar....] [Lang] [Theme]  │
└──────────────────────────────────────────────────────────┘
```

**Details:**
- Logo on left (fixed width ~200px)
- Search bar center (responsive flex)
- Language buttons + Dark mode toggle on right
- Sticky/fixed positioning
- Subtle shadow below
- Responsive: Stack on mobile

---

### 6. Color Scheme (from reference + our data)

**Periods (Node Border Colors):**
- Second-Temple: #8e44ad (Purple)
- Tannaim: #e74c3c (Red)
- Amoraim: #e67e22 (Orange)
- Geonim: #f1c40f (Yellow)
- Rishonim: #27ae60 (Green)
- Acharonim: #2980b9 (Blue)
- Modern: #1abc9c (Teal)

**Connection Types:**
- Agreement/Student: #27ae60 (Green) - 2px
- Oppose: #e74c3c (Red) - 1.5px
- Colleague: #e8b4d9 (Pink) - 1.5px
- Contemporary: #95a5a6 (Gray) - 1px

**UI Elements:**
- Primary: #2980b9 (Blue - active states)
- Background: #f9f9f9 (Light mode) / #1a1a1a (Dark mode)
- Text: #1a1a1a (Light mode) / #e0e0e0 (Dark mode)
- Border: #e5e5e5 (Light mode) / #333 (Dark mode)

---

## Responsive Design

### Desktop (1200px+)
```
┌─ Left Panel (250px) ─┼─ Graph Canvas ─┼─ Right Panel (280px) ─┐
│                      │                 │                       │
│   Sage Details       │   Force Graph   │   Filters             │
│   (Full)             │   (Main)        │   (Scrollable)        │
│                      │                 │                       │
└──────────────────────┴─────────────────┴───────────────────────┘
```

### Tablet (768px-1199px)
```
┌─ Reduced Left Panel ─┼─ Graph Canvas ─┼─ Right Panel (Compact) ┐
│ (150px)              │ (Smaller)       │ (200px)               │
└──────────────────────┴─────────────────┴───────────────────────┘
```

### Mobile (< 768px)
```
┌─────────────────────────┐
│  Header (Full Width)    │
├─────────────────────────┤
│  Graph Canvas (Full)    │
│  (Scrollable)           │
│                         │
│  [Filters Button]       │
│                         │
├─────────────────────────┤
│  Left Panel             │
│  (Slide-in Overlay)     │
│                         │
│  Right Panel            │
│  (Slide-in Overlay)     │
└─────────────────────────┘
```

---

## Animation & Interactions

### Hover Effects
- **Node Hover:**
  - Increase radius: 5px → 6.5px
  - Add glow: box-shadow style effect
  - Show label (if hidden)
  - Highlight connected nodes (brighten)
  - Dim other nodes to 20% opacity

- **Link Hover:**
  - Increase stroke-width +0.5px
  - Increase opacity +0.2
  - Highlight both connected nodes

### Click Effects
- **Node Click:**
  - Smooth animation to center (if using zoom)
  - Slide in left sidebar with details
  - Highlight all connections (color code by type)
  - Keep graph interactive (can pan/zoom)

- **Filter Click:**
  - Smooth fade animation (200ms)
  - Update graph in real-time
  - Animate node positions if layout changes

### Transitions
- Graph updates: 300-500ms (D3 transition)
- Panel open/close: 200ms (CSS transition)
- Color changes: 100ms
- Opacity changes: 100ms

---

## Typography

**Font Stack:**
```css
Font: 'Frank Ruhl Libre', serif (Hebrew)
Font: 'Inter', sans-serif (English)
Font: 'Inter', sans-serif (Russian)
```

**Font Sizes:**
- Page Title: 24px (Frank Ruhl)
- Sage Name: 18px (Frank Ruhl)
- Section Headers: 14px bold (Inter)
- Body Text: 13px (Inter)
- Labels: 12px (Inter)
- Small Text: 11px (Inter)

**Line Heights:**
- Body: 1.6
- Headers: 1.2
- Labels: 1.4

---

## Implementation Priority

### Phase 1 (Essential)
- [ ] Move options panel to right sidebar
- [ ] Style left sidebar as sage card
- [ ] Improve node display (add frames/styling)
- [ ] Color edges by connection type
- [ ] Responsive layout for tablets

### Phase 2 (Polish)
- [ ] Add portrait images to nodes
- [ ] Improve animations and transitions
- [ ] Mobile overlay panels
- [ ] Advanced hover effects
- [ ] Performance optimization

### Phase 3 (Nice-to-Have)
- [ ] Custom node shapes by period
- [ ] Advanced filter UI (sliders with ranges)
- [ ] Export visualization as image
- [ ] Animation presets
- [ ] Advanced search with autocomplete

---

## Data Structure Alignment

**What We Have:**
```javascript
// Sage node
{
  id: "123",
  name_he: "רבי דוד",
  name_en: "Rabbi David",
  period: "modern",          // Visual: #1abc9c border
  field: "ethics",           // Visual: used in filtering
  location: "Eretz Israel",
  bio: "...",
  image_url: "...",
  birth_year: 1920,
  death_year: 1995,
  connections: 14            // Calculate from edges
}

// Connection edge
{
  source: "123",
  target: "456",
  type: "student",           // Visual: Green line
  strength: 0.85,            // Visual: Line width 2.6px
  confidence: 0.9,           // Visual: Opacity 0.9
  evidence: "..."
}
```

**Perfect alignment with reference design!** ✅

---

## CSS Changes Needed

### Add to styles-graph.css:

```css
/* Node styling */
.node-portrait {
  clip-path: circle(32px);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.node-frame {
  fill: none;
  stroke-width: 3px;
}

.node-frame.hover {
  stroke-width: 4px;
  filter: drop-shadow(0 0 6px rgba(0,0,0,0.3));
}

/* Sidebar animations */
.sidebar {
  transition: transform 0.2s ease-out;
}

.sidebar.open {
  transform: translateX(0);
}

.sidebar.closed {
  transform: translateX(-110%);
}

/* Hover effects */
.graph-container .node:hover {
  filter: drop-shadow(0 0 8px rgba(41, 128, 185, 0.6));
}

.graph-container .link:hover {
  filter: drop-shadow(0 0 4px rgba(0,0,0,0.2));
}
```

---

## Success Criteria

- [ ] Left sidebar shows sage details elegantly
- [ ] Right panel organized with filter sections
- [ ] Node frames colored by period/field
- [ ] Edges colored by connection type
- [ ] Smooth animations and transitions
- [ ] Responsive on all screen sizes
- [ ] Mobile panels work as overlays
- [ ] All 3 languages displayed correctly
- [ ] RTL/LTR layout correct
- [ ] Dark mode integrated throughout
- [ ] Performance remains acceptable

---

## Files to Modify

1. **index.html** - Move options panel to right sidebar, add sidebar structure
2. **styles-graph.css** - New styling for nodes, sidebars, responsive
3. **graph.js** - Update node/edge rendering with new styles
4. **New file: ui-components.js** - Sidebar open/close logic

---

## Timeline

**Estimated Implementation:**
- Phase 1: 2-3 hours (essentials)
- Phase 2: 1-2 hours (polish)
- Phase 3: 1 hour (if time)

**Testing:**
- Desktop: 30 min
- Tablet: 20 min
- Mobile: 20 min
- Cross-browser: 20 min

---

## Next Steps

1. **Approve Design:** Review this specification
2. **Start Phase 1:** Update sidebars and layout
3. **Test Locally:** Run on localhost:8080
4. **Polish:** Add animations and transitions
5. **Deploy:** Push to Vercel

---

**Ready to implement?** Let's match the reference design while keeping our unique data! 🎯
