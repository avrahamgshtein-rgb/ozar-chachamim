# 🛠️ כלים שהשתמשנו בפרויקט אוצר חכמים

## בנוסחה שלמה: Claude Workshop Sessions 2-4

---

## 📚 שלב 1: Claude Code Tools (Session 2)

### **File Operations**
| כלי | תפקיד | דוגמה בפרויקט |
|-----|--------|---------------|
| **Read** | קריאת קבצים | Read `data.json`, `config.example.js` |
| **Write** | יצירת קבצים חדשים | Create `graph.js`, `map.js`, `index.html` |
| **Edit** | עדכון קבצים קיימים | Fix field mapping in `supabase-client.js` |

### **Bash Commands**
```bash
# Install dependencies
pip install python-docx --break-system-packages

# Run Python scripts
python migrate_to_supabase_v3.py
python extract_word_data.py

# Git operations
git add .
git commit -m "Add map visualization"
git push origin main

# Start development server
python -m http.server 8080
```

### **Multi-Step Workflows**
- 🔄 Read CSV → Transform → Upload to Supabase
- 🔄 Extract text from Word files → Parse → Validate → Merge into JSON
- 🔄 Create visualization → Test in browser → Fix bugs → Deploy

---

## 🗄️ שלב 2: Database & Backend (Session 3)

### **Supabase Components**
| Component | שימוש |
|-----------|--------|
| **PostgreSQL** | 5 tables: sages, connections, research, users, bookmarks |
| **RLS Policies** | Read-only for public, authenticated-only for bookmarks |
| **REST API** | CRUD operations from frontend |
| **Auth** | Email/password signup & login |

### **Schema Definition**
```sql
-- sages table
CREATE TABLE sages (
  id BIGINT PRIMARY KEY,
  label TEXT NOT NULL,
  period VARCHAR(50),
  location TEXT,
  field TEXT,
  bio TEXT,
  core_concept TEXT,
  coordinates JSONB,
  migration_path TEXT,
  spotify_url TEXT
);

-- connections table (relationships)
CREATE TABLE connections (
  id SERIAL PRIMARY KEY,
  source_id BIGINT REFERENCES sages(id),
  target_id BIGINT REFERENCES sages(id),
  type VARCHAR(50),
  description TEXT
);

-- RLS Policy: Anyone can read
ALTER TABLE sages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON sages FOR SELECT USING (true);
```

### **API Calls in Frontend**
```javascript
// Load sages from Supabase
const { data: sages, error } = await supabase
  .from('sages')
  .select('*')
  .order('id');

// Load connections
const { data: connections } = await supabase
  .from('connections')
  .select('*');

// User authentication
const { user, session } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});
```

### **Data Import Scripts**
```python
# migrate_to_supabase_v3.py
# - Reads Excel file (חכמי ישראל.xlsx)
# - Validates foreign key constraints
# - Inserts 323 sages + 25 connections
# - Handles errors & duplicates

import openpyxl
from supabase import create_client

# Parse Excel
wb = openpyxl.load_workbook('site-data/חכמי ישראל.xlsx')
ws = wb.active

# Validate connections
for conn in connections:
  assert sage_ids[conn['source']] exists
  assert sage_ids[conn['target']] exists

# Insert to Supabase
supabase.table('sages').insert(sages_data).execute()
supabase.table('connections').insert(connections_data).execute()
```

---

## 🎨 שלב 3: Frontend Visualization (Session 3+4)

### **D3.js Force-Directed Graph**
```javascript
// graph.js - Network visualization
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).distance(80))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width/2, height/2));

// Draggable nodes
node.call(d3.drag()
  .on('start', dragstarted)
  .on('drag', dragged)
  .on('end', dragended));

// Connection type labels
linkGroup.append('text')
  .attr('class', 'link-label')
  .text(d => connectionTypeMap[d.type])
  .style('font-size', '12px')
  .style('fill', '#333');
```

### **Leaflet.js Interactive Map**
```javascript
// map.js - Geographic visualization
const map = L.map('map').setView([25, 15], 3);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Markers for sage locations
L.circleMarker([lat, lng], {
  radius: Math.sqrt(sageCount) * 5,
  color: eraColors[era],
  fillOpacity: 0.7
})
  .bindPopup(`<strong>${sage.label}</strong><br>${sage.period}`)
  .addTo(map);

// Polylines for migration paths
L.polyline(coordinates, {
  color: eraColors[sage.era],
  dashArray: '8, 4',
  weight: 3
}).addTo(map);

// Interactive legend
const legend = L.control({ position: 'bottomright' });
legend.onAdd = (map) => {
  const div = L.DomUtil.create('div', 'legend');
  periods.forEach(period => {
    const btn = document.createElement('button');
    btn.textContent = period.name;
    btn.onclick = () => filterByEra(period.key);
    div.appendChild(btn);
  });
  return div;
};
legend.addTo(map);
```

### **CSS Responsive Design**
```css
/* styles-graph.css */

/* Desktop */
@media (min-width: 1024px) {
  .main-area { display: flex; }
  .sidebar { width: 300px; }
  #graph { flex: 1; }
}

/* Tablet */
@media (768px <= width < 1024px) {
  .tab-bar { justify-content: space-between; }
  .sidebar { width: 280px; }
}

/* Mobile */
@media (width < 768px) {
  .tab-bar { overflow-x: auto; gap: 0.5rem; }
  .sidebar { 
    position: fixed;
    bottom: -100%;
    width: 100%;
    transition: bottom 0.3s;
    z-index: 1000;
  }
  .sidebar.active { bottom: 0; }
  
  /* RTL support */
  [dir="rtl"] .sidebar { right: 0; }
  [dir="rtl"] .related-sage:hover { border-right: 3px solid #2980b9; }
}

/* Viewport units for mobile */
body { height: 100dvh; }
```

---

## 🔍 שלב 4: Advanced Features

### **Search Index**
```javascript
// supabase-client.js
window.searchIndex = {};

// Build index with tokenization
nodes.forEach(node => {
  const tokens = [
    node.label,
    node.label_he,
    node.period,
    node.location,
    node.field,
    node.bio
  ].join(' ').split(/[\s\-,;.()]/);

  tokens.forEach(token => {
    if (!searchIndex[token]) searchIndex[token] = [];
    searchIndex[token].push(node.id);
  });
});

// Semantic search
function semanticSearch(query) {
  const queryTokens = query.split(/[\s\-]/);
  const results = new Map();
  
  queryTokens.forEach(token => {
    const matching = searchIndex[token] || [];
    matching.forEach(id => {
      results.set(id, (results.get(id) || 0) + 1);
    });
  });

  return [...results.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => sageMap.get(id));
}
```

### **URL Persistence**
```javascript
// map.js
function filterBySage(sage) {
  // Visual emphasis
  allMarkers.forEach(m => {
    m.setRadius(m.sage.id === sage.id ? 30 : 5);
    m.setOpacity(m.sage.id === sage.id ? 1 : 0.05);
  });

  // Update URL for sharing
  window.history.pushState(
    { sage: sage.id },
    `${sage.label} - Ozar Chachamim`,
    `?sage=${sage.id}`
  );
}

// Initialize from URL on page load
function _initializeMap() {
  const params = new URLSearchParams(window.location.search);
  const sageId = params.get('sage');
  if (sageId) {
    const sage = sageMap.get(parseInt(sageId));
    if (sage) filterBySage(sage);
  }
}
```

### **PDF Export**
```javascript
// index.html - exportSagePDF function
function exportSagePDF(sageId) {
  const sage = sageMap.get(sageId);
  const printWindow = window.open('', '', 'width=800,height=600');
  
  const html = `
    <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Frank Ruhl Libre', serif; }
          .sage-name { font-size: 24px; color: #2c3e50; }
          .migration-path { display: flex; gap: 20px; }
        </style>
      </head>
      <body>
        <h1 class="sage-name">${sage.label}</h1>
        <p><strong>תקופה:</strong> ${sage.period}</p>
        <p><strong>אזור:</strong> ${sage.location}</p>
        <div class="migration-path">
          ${sage.migration_path ? renderMigrationPath(sage.migration_path) : ''}
        </div>
        <section class="biography">
          ${sage.bio}
        </section>
        <section class="connections">
          ${renderConnections(sage.id)}
        </section>
      </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.print();
}
```

---

## 🚀 שלב 5: Deployment Tools

### **Git Version Control**
```bash
# Initialize repo
git init
git add .
git commit -m "Initial commit: Ozar Chachamim MVP"

# Push to GitHub
git remote add origin https://github.com/avraham-gshtein/ozar-chachamim.git
git branch -M main
git push -u origin main

# Create release tag
git tag v1.0.0
git push origin v1.0.0
```

### **Vercel Deployment**
```json
{
  "name": "ozar-chachamim",
  "buildCommand": "echo 'Static site, no build needed'",
  "outputDirectory": ".",
  "env": {
    "SUPABASE_URL": "https://your-project.supabase.co",
    "SUPABASE_ANON_KEY": "sb_publishable_..."
  }
}
```

---

## 📊 כלים בהשוואה

| כלי | מה שעשינו | למה בחרנו |
|-----|-----------|-----------|
| **Supabase** | Database + Auth | Free tier, built-in RLS, no DevOps |
| **D3.js** | Network visualization | Powerful force simulations, flexible |
| **Leaflet** | Map rendering | Lightweight, great for mobile |
| **Python** | Data processing | Easy text parsing, data transformation |
| **Vercel** | Hosting | Auto-deploy from Git, no server ops |
| **Git** | Version control | Industry standard, full history |
| **Claude Code** | Development | Perfect for multi-step tasks, file ops |

---

## 📈 Code Statistics

```
Frontend:
  - index.html ............ 800 lines
  - graph.js .............. 400 lines
  - map.js ................ 500 lines
  - supabase-client.js .... 300 lines
  - styles-graph.css ...... 400 lines
  Total: ~2,400 lines JavaScript/CSS

Backend:
  - supabase-schema-v3.sql  150 lines
  - migrate_to_supabase_v3.py 250 lines
  - config.js ............. 20 lines
  Total: ~420 lines SQL/Python

Data:
  - data.json ............. 323 sages + 25 connections
  - coordinates ........... 90+ locations
  - word_extracted_data.json extracted from 54 Word files

Documentation:
  - 45+ markdown files (150KB+ total)
  - CLAUDE.md (main guide)
  - QUICKSTART.md (3-step setup)
  - MEMORY.md (session notes)
```

---

## ✅ Tool Coverage Checklist

| Tool | Sessions | Our Usage | Status |
|------|----------|-----------|--------|
| Claude Code (File operations) | 2 | ✅ Read/Write/Edit all files | ✅ |
| Claude Code (Bash) | 2 | ✅ Python, Git, Server | ✅ |
| Supabase (Database) | 3 | ✅ 5 tables, RLS, API | ✅ |
| Supabase (Auth) | 3 | ✅ Email signup/login | ✅ |
| D3.js (Visualization) | 3 | ✅ Force graph + timeline | ✅ |
| Leaflet (Maps) | 3 | ✅ Markers, polylines, legend | ✅ |
| Python (Data Processing) | 2 | ✅ Excel parsing, Word extraction | ✅ |
| Git (Version Control) | 4 | ✅ Commits, branches, tags | ✅ |
| Vercel (Deployment) | 4 | ✅ Configured + ready | ✅ |
| Responsive Design | 4 | ✅ Mobile, tablet, desktop | ✅ |
| Privacy & Security | 4 | ✅ RLS, no secrets exposed | ✅ |

---

## 🎓 Lessons Learned

1. **Database Design is crucial** — Good schema prevents future headaches
2. **RLS policies protect data** — Never trust the frontend
3. **Responsive design matters** — 50% of users on mobile
4. **Version control saves lives** — Always `git commit` before big changes
5. **Documentation > Code** — Comments help future you (or collaborators)
6. **Test early, test often** — Catch bugs before they reach production
7. **Deploy frequently** — Small changes are easier to debug than big releases

---

*This project uses every major tool taught in the Claude Code workshop + extras for a production-ready application.* 🚀
