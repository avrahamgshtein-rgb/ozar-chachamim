# 📖 API Documentation — אוצר חכמים

## Core Functions Reference

### Graph Visualization (`graph.js`)

#### `SageNetwork.render()`
Initializes and renders the D3 force-directed network visualization.
```javascript
// Usage
const graph = new SageNetwork('#graph', data);
graph.render();
```

#### `SageNetwork.selectNode(node)`
Highlights a node and displays its sidebar information.
```javascript
sageNetwork.selectNode(sageObject);
// Updates sidebar with: name, era, location, field, bio, connections
```

#### `filterByEra(era)`
Filters visible nodes by historical era.
```javascript
filterByEra('rishonim');  // Show only Rishonim
filterByEra('');          // Show all
```

**Available eras:**
- `second-temple`, `tannaim`, `amoraim`, `geonim`, `rishonim`, `acharonim`, `modern`

#### `filterByMinimumConnections(count)`
Shows only nodes with at least N connections.
```javascript
filterByMinimumConnections(5);  // Show hubs with 5+ connections
```

#### `filterByConnectionStrength(minStrength)`
Filters by connection metadata strength (1-5 scale).
```javascript
filterByConnectionStrength('4');  // Show nodes with 4-5 strength connections
```

### Research Viewer (`setupResearchViewer()`)

#### `displayResearchDocument(key, doc)`
Opens a research document with full text, highlighting, and related sages.
```javascript
displayResearchDocument(docKey, {
  title: "סגנון ההתנגדות של הרמב״ם",
  summary: "...",
  sage_id: 42,
  file: "filename.docx"
});
```

**Features:**
- Full text display with word count
- Search highlighting (2+ character search)
- Related sages extraction
- Print-to-PDF functionality

### Comparator (`setupComparator()`)

#### `selectComparatorSage(sage, field)`
Adds a sage to the comparison view.
```javascript
selectComparatorSage(sageObject, 'sage1');  // Load to first slot
```

#### `exportComparisonPDF()`
Exports current comparison as formatted HTML for browser print-to-PDF.
```javascript
exportComparisonPDF();  // Opens print dialog
```

### Filter Presets

#### `applyFilterPreset(presetName)`
Loads a pre-configured filter combination.
```javascript
applyFilterPreset('rishonim-halacha');   // Loads preset
applyFilterPreset('high-connections');   // 5+ connections
applyFilterPreset('strong-links');       // Strength >= 4
```

#### `getCurrentFilterState()`
Returns current filter configuration as object.
```javascript
const state = getCurrentFilterState();
// Returns: {era, region, field, minConnections, strength, search}
```

#### `saveCurrentAsPreset()`
Saves current filters as a named preset to localStorage.
```javascript
saveCurrentAsPreset();  // Prompts for preset name
```

## Data Structure

### Sage Node Object
```javascript
{
  id: 42,                           // Unique ID
  label: "הרמב״ם",                 // Display name (Hebrew)
  name_en: "Rambam",               // English name
  era: "ראשונים",                  // Era name
  era_key: "rishonim",             // Era code (for filtering)
  field: "Halacha",                // Primary field/specialty
  location: "Tzfat",               // Geographic location
  region: "אזור",                  // Region
  bio: "200-char summary",         // Short biography
  dates: "1138-1204",              // Birth-death years
  core_concept: "Wisdom summary"   // One-liner essence
}
```

### Connection Object
```javascript
{
  source: 42,                      // Source sage ID
  target: 43,                      // Target sage ID
  type: "student",                 // Connection type
  strength: 4,                     // 1-5 scale (metadata)
  period: "ראשונים",               // Era of connection
  context_he: "Hebrew explanation",// Relationship context
  evidence_source: "Talmud"        // Where documented
}
```

**Connection Types:**
- `student` — Teacher-student relationship
- `teacher` — Reciprocal teacher role
- `influence` — Influenced thinking/work
- `oppose` — Philosophical opposition
- `colleague` — Peer/contemporary
- `predecessor` — Earlier figure in lineage
- `contemporary` — Same era
- `family` — Family relationship

## Performance Tips

### Filtering Performance
- `minConnections` filter is O(n) — calculate degrees on initial load
- `era` filter uses cached `era_key` — very fast
- `strength` filter requires link iteration — moderate cost

### Search Performance
- Search highlighting repaints HTML — avoid very large documents
- Highlighting uses regex with case-insensitive flag
- Minimum 2 characters required before highlighting triggers

### Viewport Culling
D3 automatically hides links outside viewport (CSS `display: none`).
- Links hidden = no render cost
- Nodes always rendered (simplification for performance)

## localStorage API

### Presets Storage
```javascript
// Get all custom presets
JSON.parse(localStorage.getItem('customPresets') || '{}')

// Set custom preset
const custom = JSON.parse(localStorage.getItem('customPresets') || '{}');
custom['my-preset'] = { era: 'rishonim', field: 'halacha', ... };
localStorage.setItem('customPresets', JSON.stringify(custom));

// Clear all
localStorage.removeItem('customPresets');
```

## Keyboard Shortcuts (Current)

| Shortcut | Action |
|----------|--------|
| `ESC` | Close sidebar or modal |
| `Ctrl+F` | Browser find (not custom search) |
| Tab keys | Navigate filter fields |

**Future:**
- `Ctrl+Shift+F` — Focus graph search
- `N` — Next search result
- `P` — Previous search result

## Common Errors & Solutions

### "Cannot read property 'id' of undefined"
- Cause: Node data not loaded
- Solution: Wait for `supabaseReady` event before accessing nodes

### "filterByEra is not a function"
- Cause: Function called before initialization
- Solution: Wait for DOM content load + supabaseReady

### Search highlighting not working
- Cause: searchTerm < 2 characters
- Solution: Require minimum 2-character search terms

---

**Last Updated:** June 20, 2026
**Maintained by:** Claude Code
