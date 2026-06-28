# 🎨 אוצר חכמים - UI Redesign Plan

## פילוסופיית העיצוב
בהשראת "History of Philosophy" - עיצוב מקצועי, נקי, ודינמי.

## מבנה החדש

```
┌─────────────────────────────────────────────────────────┐
│  אוצר חכמים    |  רשת קשרים  |  טבלה  |  מפה  | ...   │ HEADER
└─────────────────────────────────────────────────────────┘
│ LEGEND & FILTERS │                                       │
│ (LEFT SIDEBAR)   │        NETWORK GRAPH (CENTER)         │
│                  │                                       │
│ בית שני      ●  │                                       │
│ תנאים       ●  │                                       │
│ אמוראים      ●  │                                       │
│ גאונים       ●  │                                       │
│ ראשונים      ●  │                                       │
│ אחרונים      ●  │                                       │
│ עת חדשה     ●  │                                       │
│ ───────────────  │        GRAPH WITH NODES              │
│ 🔎 SEARCH       │                                       │
│ 📌 Era Filter    │                                       │
│ 🏠 Region Filter │                                       │
│ 📚 Field Filter  │                                       │
│                  │                                       │
│ SIDEBAR (RIGHT)  │ ← SELECTED SAGE DETAILS             │
└─────────────────────────────────────────────────────────┘
```

## שינויים עיקריים

### 1. LEFT SIDEBAR (280px width)
- **Legend בראש** - 7 תקופות עם ●ים בצבע מתאים
- **Search Box** - חיפוש חכמים
- **Filters** - תקופה, אזור, תחום (stacked vertically)
- **Connection Type Filter** - סוגי קשרים
- **Scrollable** - אם יש הרבה filters

### 2. CENTER - NETWORK GRAPH
- **Full viewport** (minus left & right sidebars)
- **Clean background** - light gray or white
- **Zoom controls** בפינה עליונה שמאלית
- **Smooth animations** כשבוחרים nodes

### 3. RIGHT SIDEBAR
- **Sage details** כמו כיום
- **Depth control** + Type filter
- **Related sages** list
- **Scrollable** אם יש הרבה info

### 4. HEADER (Improved)
- **Logo** עם subtitle
- **Tabs** עם icons
- **Language switcher**
- **Action buttons** (Path finder, Reset, Export)

---

## צבעים

```css
Primary Colors:
- Text: #1a1a1a (dark)
- Borders: #e5e5e5 (light)
- Background: #fafafa (very light)

Era Colors:
- בית שני: #8e44ad (Purple)
- תנאים: #e74c3c (Red)
- אמוראים: #e67e22 (Orange)
- גאונים: #f1c40f (Gold)
- ראשונים: #27ae60 (Green)
- אחרונים: #2980b9 (Blue)
- עת חדשה: #1abc9c (Cyan)
```

---

## כללי עיצוב

1. **Typography**
   - Headers: Frank Ruhl Libre (Hebrew) - bold
   - Body: Inter (English) - regular
   - Size hierarchy: 1.6rem → 0.9rem

2. **Spacing**
   - Sidebar padding: 1rem
   - Gap between filters: 0.75rem
   - Border radius: 6-8px

3. **Shadows**
   - Light: 0 1px 3px rgba(0,0,0,0.04)
   - Medium: 0 2px 8px rgba(0,0,0,0.06)
   - None on sidebars (clean)

4. **Interactions**
   - Hover: #f9f9f9 background
   - Active: scale 0.98
   - Transitions: 0.2s smooth

---

## Implementation Steps

1. ✅ Update header with better styling
2. 🔄 Add left sidebar with legend + filters
3. 🔄 Adjust graph container (left-280px, right-auto)
4. 🔄 Style filters/legend more elegantly
5. 🔄 Add connection type color labels
6. 🔄 Mobile optimization (collapse sidebar <768px)

---

## Status

- Header: Updated ✅
- Left sidebar styling: In progress 🔄
- Graph layout: Needs adjustment 🔄
- Legend: Needs styling 🔄
