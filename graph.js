/**
 * Connected Papers Style Network Graph
 * Cleaner hierarchical layout with filtered connections
 * Designed for 561 sages + 1001 connections
 */

class SageNetwork {
  constructor(options = {}) {
    // Support both old and new option names
    this.width = options.width || (window.innerWidth - 320);
    this.height = options.height || (window.innerHeight - 120);
    this.data = options.data || { nodes: [], links: [] };
    this.container = options.container || options.svgSelector || '#graph' || '#network-view';
    this.sidebarSelector = options.sidebarSelector || '#sidebar';
    this.selectedNodeId = null;
    
    // Unified colors: prefer window.ERA_COLORS / window.CONNECTION_COLORS
    // (built from CSS variables in styles-graph.css); fallback keeps the
    // class usable standalone.
    this.eraColors = Object.assign({
      'second-temple': '#8e44ad',
      'tannaim': '#e74c3c',
      'amoraim': '#e67e22',
      'geonim': '#f1c40f',
      'rishonim': '#27ae60',
      'acharonim': '#2980b9',
      'modern': '#1abc9c',
      'unknown': '#95a5a6'
    }, window.ERA_COLORS || {});

    this.connectionColors = Object.assign({
      'student': '#e74c3c',
      'teacher': '#3498db',
      'influence': '#f39c12',
      'colleague': '#27ae60',
      'oppose': '#e67e22',
      'family': '#9b59b6',
      'contemporary': '#1abc9c',
      'predecessor': '#34495e'
    }, window.CONNECTION_COLORS || {});

    // עיצוב קשרים לפי מקרא "טבלת חכמי ישראל" (אב תשפ"ה):
    // קו מלא + חץ = הרב לימד את התלמיד; קו מקווקו = השפעה עקיפה/לימד מספריו;
    // אדום = פולמוס; סגול = קשר משפחתי; דק ללא חץ = בני אותו דור.
    this.linkStyles = {
      teacher:      { dash: null,   dir: 'end',   label: 'רב ← תלמיד (קשר ישיר)' },
      student:      { dash: null,   dir: 'start', label: 'רב ← תלמיד (קשר ישיר)' },
      influence:    { dash: '7,4',  dir: 'end',   label: 'השפעה עקיפה / לימד מספריו' },
      predecessor:  { dash: null,   dir: 'end',   label: 'קודם וממשיך בתפקיד' },
      family:       { dash: '2,3',  dir: null,    label: 'קשר משפחתי' },
      oppose:       { dash: '2,3',  dir: null,    label: 'פולמוס / התנגדות' },
      colleague:    { dash: '1,4',  dir: null,    label: 'עמיתים' },
      contemporary: { dash: '1,4',  dir: null,    label: 'בני אותו דור' }
    };

    // צביעת חכמים לפי בתי מדרש/אזורים (כמו בטבלה המודפסת) — ברירת המחדל.
    // 'era' זמין דרך מתג במקרא.
    this.colorMode = 'region';
    this.regionColors = {
      'ashkenaz': '#43a047', 'east-europe': '#c0ca33', 'tsarfat': '#ec407a',
      'provence': '#f9a825', 'sefarad': '#1e88e5', 'italy': '#26c6da',
      'north-africa': '#8e24aa', 'mizrach': '#ef6c00', 'eretz-israel': '#00897b',
      'other': '#90a4ae'
    };
    this.regionLabels = {
      'ashkenaz': 'אשכנז', 'east-europe': 'פולין וליטא', 'tsarfat': 'צרפת',
      'provence': 'פרובנס', 'sefarad': 'ספרד', 'italy': 'איטליה',
      'north-africa': 'צפון אפריקה ומצרים', 'mizrach': 'בבל והמזרח',
      'eretz-israel': 'ארץ ישראל', 'other': 'אחר'
    };
    this.regionPatterns = [
      ['ashkenaz', ['אשכנז', 'גרמני', 'אוסטרי', 'וינה', 'פראג', 'בוהמי', 'רגנשבורג', 'וורמס', 'נוישטט', 'מגנצא']],
      ['east-europe', ['פולין', 'ליטא', 'רוסי', 'גליציה', 'אוקראינ', 'הונגרי', 'קרקוב', 'לובלין', 'וילנה', 'ורשה', 'בריסק', 'נובהרדוק', 'סלבודקה', 'וולוז', 'סוכטשוב', 'סלונים']],
      ['tsarfat', ['צרפת', 'פריז', 'טרואה', 'ויטרי', 'שמפנ']],
      ['provence', ['פרובנס', 'פרובאנס', 'נרבונה', 'מונפליה', 'לוניל']],
      ['sefarad', ['ספרד', 'פורטוגל', 'קסטילי', 'קטלוני', 'ברצלונה', 'טולדו', 'קורדובה', 'גרנדה', 'סרגוסה', 'גירונה', 'אנדלוסי', 'ליסבון', 'אליסנה', 'לוסנה', 'גיברלטר']],
      ['italy', ['איטלי', 'רומא', 'ונצי', 'ליוורנו', 'פדובה', 'מנטובה', 'טראני', 'לונטשיץ']],
      ['north-africa', ['מרוקו', 'אלג', 'תוניס', 'לוב', 'טריפולי', 'פאס', 'תלמסאן', 'מגרב', 'קירואן', 'מצרים', 'קהיר', 'אלכסנדרי']],
      ['mizrach', ['בבל', 'עיראק', 'בגדאד', 'פרס', 'תימן', 'סוריה', 'דמשק', 'חלב', 'טורקי', 'איזמיר', 'קושטא', 'סלוניקי', 'יוון', 'נהרדעא', 'סורא', 'פומבדית']],
      ['eretz-israel', ['ארץ ישראל', 'ירושלים', 'צפת', 'טבריה', 'חברון', 'עכו', 'יבנה', 'שילה', 'גליל', 'נתיבות', 'בני ברק', 'עזה', 'ישראל']]
    ];

    // פסי אירועים אדומים על ציר הזמן — כמו בטבלה המודפסת
    this.historicalEvents = [
      { year: 70,   label: 'חורבן בית שני' },
      { year: 1096, label: 'מסעי הצלב — תתנ"ו' },
      { year: 1242, label: 'שריפת התלמוד' },
      { year: 1348, label: 'המגפה השחורה' },
      { year: 1391, label: 'גזירות קנ"א' },
      { year: 1492, label: 'גירוש ספרד' },
      { year: 1648, label: 'גזירות ת"ח ות"ט' },
      { year: 1939, label: 'השואה' }
    ];
  }

  // --- Isolated helpers for link styling (PDF legend semantics) ---
  _dash(type) {
    const s = this.linkStyles[type];
    return s && s.dash ? s.dash : null;
  }

  // Apply/remove the directional arrowhead on a link element.
  // 'student' links point from student to teacher in the data, so the
  // arrow is drawn at the path start (reversed) to keep רב→תלמיד direction.
  _applyMarker(sel, d, on) {
    const s = this.linkStyles[d.type];
    if (!s || !s.dir) return;
    if (s.dir === 'end') {
      sel.attr('marker-end', on ? `url(#arrow-${d.type})` : null);
    } else {
      sel.attr('marker-start', on ? `url(#arrow-rev-${d.type})` : null);
    }
  }

  // --- Region coloring (בתי מדרש/אזורים) — isolated helpers ---
  // Regions mentioned in the sage's location text, in order of appearance.
  _regionsOf(d) {
    const loc = String(d.location || '');
    const hits = [];
    this.regionPatterns.forEach(([key, pats]) => {
      let best = -1;
      pats.forEach(p => {
        const i = loc.indexOf(p);
        if (i >= 0 && (best < 0 || i < best)) best = i;
      });
      if (best >= 0) hits.push({ key, i: best });
    });
    hits.sort((a, b) => a.i - b.i);
    const seen = new Set(); const out = [];
    hits.forEach(h => { if (!seen.has(h.key)) { seen.add(h.key); out.push(h.key); } });
    return out.length ? out : ['other'];
  }

  // Node fill by the active color mode. Migrating sages (2+ regions) get a
  // two-tone vertical split: origin on top, destination on bottom (PDF style).
  _nodeFill(d) {
    if (this.colorMode === 'era') return this.eraColors[d.era_key] || '#999';
    const regs = this._regionsOf(d);
    if (regs.length === 1) return this.regionColors[regs[0]];
    return this._ensureGradient(regs[0], regs[regs.length - 1]);
  }

  _ensureGradient(r1, r2) {
    const id = `grad-${r1}-${r2}`;
    if (!this._grads) this._grads = new Set();
    if (!this._grads.has(id)) {
      let defs = this.svg.select('defs');
      if (defs.empty()) defs = this.svg.append('defs');
      const g = defs.append('linearGradient')
        .attr('id', id).attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 1);
      g.append('stop').attr('offset', '50%').attr('stop-color', this.regionColors[r1] || '#90a4ae');
      g.append('stop').attr('offset', '50%').attr('stop-color', this.regionColors[r2] || '#90a4ae');
      this._grads.add(id);
    }
    return `url(#${id})`;
  }

  // Re-paint nodes + legend chips after a color-mode switch (no re-layout).
  _refreshColors() {
    if (this.node) this.node.transition().duration(400).attr('fill', d => this._nodeFill(d));
    const body = document.querySelector('.graph-legend .legend-colors');
    if (body) body.innerHTML = this._legendColorHTML();
    document.querySelectorAll('.graph-legend .legend-toggle button').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === this.colorMode));
    console.log(`🎨 [Colors] mode = ${this.colorMode}`);
  }

  init() {
    console.log('🎨 Initializing Connected Papers style network...');

    // Load data from window.graphData if not provided
    if (!this.data || !this.data.nodes || this.data.nodes.length === 0) {
      if (window.graphData) {
        this.data = window.graphData;
        console.log(`📊 Loaded data: ${this.data.nodes.length} nodes, ${this.data.links.length} links`);
      } else {
        console.error('❌ No graph data found!');
        return;
      }
    }

    // Responsive sizing: measure the graph container instead of the window
    this._measureContainer();

    // Remove existing SVG
    d3.select(this.container).selectAll('svg').remove();

    // Create main SVG — viewBox + 100% size makes it scale with the
    // container on window resize / rotation (no re-layout needed)
    const svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('background', '#fafafa')
      .style('border', '1px solid #e5e5e5');

    this.svg = svg;

    // Create main group for zoom/pan
    const g = svg.append('g');
    this.g = g;

    // Add zoom behavior (stored for programmatic zoom-to-fit on filtering)
    const zoom = d3.zoom()
      .scaleExtent([0.15, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);
    this.zoom = zoom;

    // Zoom-to-fit helper: frames the given nodes (or all) in the viewport
    this.zoomToFit = (nodes, duration = 800) => {
      const pts = (nodes && nodes.length ? nodes : this.data.nodes);
      if (!pts.length) return;
      const xs = pts.map(n => n.x), ys = pts.map(n => n.y);
      const x0 = Math.min(...xs), x1 = Math.max(...xs);
      const y0 = Math.min(...ys), y1 = Math.max(...ys);
      const pad = 90;
      const scale = Math.max(0.15, Math.min(
        this.width / Math.max(1, x1 - x0 + pad),
        this.height / Math.max(1, y1 - y0 + pad), 1.5));
      const tx = this.width / 2 - scale * (x0 + x1) / 2;
      const ty = this.height / 2 - scale * (y0 + y1) / 2;
      this.svg.transition().duration(duration)
        .call(this.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    };

    // Compute hierarchical layout
    console.log('📐 Computing hierarchical layout...');
    this._computeLayout();
    
    // Filter connections
    const filteredLinks = this._filterConnections(this.data.links);
    console.log(`🔗 Filtered: ${this.data.links.length} → ${filteredLinks.length} connections`);

    // Adjacency map for hover neighbor-highlighting (Connected Papers style)
    this._adj = new Map();
    this.data.links.forEach(l => {
      if (!this._adj.has(l.source)) this._adj.set(l.source, new Set());
      if (!this._adj.has(l.target)) this._adj.set(l.target, new Set());
      this._adj.get(l.source).add(l.target);
      this._adj.get(l.target).add(l.source);
    });

    // Arrowhead markers for directional connections (רב→תלמיד etc.)
    this._addArrowMarkers();

    // פסי אירועים היסטוריים — מאחורי הקשרים והצמתים
    this._addEventBars();

    // Draw graph
    this._drawConnections(filteredLinks);
    this._drawNodes();
    this._addLabels();
    this._setupInteraction();

    // מקרא — legend overlay matching the printed sages-table conventions
    this._addLegend();

    console.log('✅ Network initialized');
  }

  /**
   * Measure the actual graph container (.graph-wrapper) so layout matches
   * the visible area instead of hardcoded window offsets. Isolated helper —
   * falls back to the constructor values if the container isn't measurable.
   */
  _measureContainer() {
    const el = document.querySelector(this.container);
    const wrapper = el && (el.closest('.graph-wrapper') || el.parentElement);
    if (wrapper && wrapper.clientWidth > 100 && wrapper.clientHeight > 100) {
      this.width = wrapper.clientWidth;
      this.height = wrapper.clientHeight;
      console.log(`📏 [Resize] Graph sized to container: ${this.width}×${this.height}`);
    }
  }

  /**
   * Deterministic pseudo-random jitter from node id — keeps layout stable
   * across re-renders (replaces Math.random per technical review).
   */
  _jitter(id, salt) {
    let h = salt >>> 0;
    const s = String(id);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return (h % 1000) / 1000 - 0.5;
  }

  _computeLayout() {
    const eraOrder = {
      'second-temple': 0, 'tannaim': 1, 'amoraim': 2, 'geonim': 3,
      'rishonim': 4, 'acharonim': 5, 'modern': 6, 'unknown': 7
    };

    const fields = [...new Set(this.data.nodes.map(n => n.field || 'Torah'))];
    const colWidth = this.width / 10;
    const rowHeight = this.height / (fields.length + 1);

    // Position nodes
    this.data.nodes.forEach(node => {
      const eraIdx = eraOrder[node.era_key] || 7;
      const fieldIdx = fields.indexOf(node.field || 'Torah');
      
      node.x = colWidth + (eraIdx * colWidth) + this._jitter(node.id, 7) * 30;
      node.y = rowHeight + (fieldIdx * rowHeight) + this._jitter(node.id, 13) * 30;
      node.degree = 0;
    });

    // Calculate degrees
    this.data.links.forEach(link => {
      const source = this.data.nodes.find(n => n.id === link.source);
      const target = this.data.nodes.find(n => n.id === link.target);
      if (source) source.degree++;
      if (target) target.degree++;
    });

    // Connected Papers style layout: link attraction pulls related sages
    // into organic clusters, while a weak X-force preserves the era axis
    this.data.nodes.forEach(n => { n._anchorX = n.x; });
    const linkCopies = this.data.links.map(l => ({ source: l.source, target: l.target }));
    const simulation = d3.forceSimulation(this.data.nodes)
      .force('link', d3.forceLink(linkCopies).id(d => d.id).distance(70).strength(0.35))
      .force('charge', d3.forceManyBody().strength(-90))
      .force('x', d3.forceX(d => d._anchorX).strength(0.12))
      .force('y', d3.forceY(this.height / 2).strength(0.06))
      .force('collide', d3.forceCollide(d => this._r(d) + 6).strength(0.9))
      .alphaDecay(0.03)
      .stop();

    for (let i = 0; i < 150; i++) {
      simulation.tick();
    }

    // Rescale the finished layout into the viewport (preserves cluster
    // shape — no clamping artifacts of nodes piling up on the borders)
    const xs = this.data.nodes.map(n => n.x), ys = this.data.nodes.map(n => n.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const pad = 45;
    this.data.nodes.forEach(n => {
      n.x = x1 > x0 ? pad + (n.x - x0) / (x1 - x0) * (this.width - pad * 2) : this.width / 2;
      n.y = y1 > y0 ? pad + (n.y - y0) / (y1 - y0) * (this.height - pad * 2) : this.height / 2;
    });
  }

  // Node radius by importance (connection count) — Connected Papers style
  _r(d) {
    return Math.min(24, 4 + Math.sqrt(d.degree || 0) * 2.4);
  }

  _filterConnections(links) {
    if (links.length <= 400) return links;

    const scored = links.map(link => {
      let score = 1;
      if (link.type === 'student' || link.type === 'teacher') score = 3;
      else if (link.type === 'influence' || link.type === 'colleague') score = 2;
      return { link, score };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 400)
      .map(s => s.link);
  }

  /**
   * SVG defs: one arrowhead per directional connection type, plus a
   * reversed variant (for 'student' links whose data direction is inverted).
   * Isolated — safe to call once after the SVG exists.
   */
  _addArrowMarkers() {
    const defs = this.svg.append('defs');
    Object.keys(this.linkStyles).forEach(type => {
      if (!this.linkStyles[type].dir) return;
      const color = this.connectionColors[type] || '#999';
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10').attr('refX', 14).attr('refY', 0)
        .attr('markerWidth', 7).attr('markerHeight', 7)
        .attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color);
      defs.append('marker')
        .attr('id', `arrow-rev-${type}`)
        .attr('viewBox', '0 -5 10 10').attr('refX', -4).attr('refY', 0)
        .attr('markerWidth', 7).attr('markerHeight', 7)
        .attr('orient', 'auto-start-reverse')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', color);
    });
    console.log('🏹 [Legend] Arrow markers added for directional link types');
  }

  /**
   * פסי אירועים היסטוריים אדומים על ציר הזמן של הגרף (כמו בטבלה המודפסת).
   * ה-X מחושב מתוך מיקומי הצמתים בפועל לכל תקופה, והשנה ממוקמת ביחס
   * לגבולות התקופה. שכבה מבודדת מאחורי הקשרים — לא נוגעת בסימולציה.
   */
  _addEventBars() {
    const ranges = {
      'second-temple': [-350, 70], 'tannaim': [70, 220], 'amoraim': [220, 500],
      'geonim': [500, 1038], 'rishonim': [1038, 1492], 'acharonim': [1492, 1810],
      'modern': [1810, 2030]
    };
    const order = ['second-temple', 'tannaim', 'amoraim', 'geonim', 'rishonim', 'acharonim', 'modern'];
    const eraX = {};
    order.forEach(k => {
      const xs = this.data.nodes.filter(n => n.era_key === k).map(n => n.x);
      if (xs.length) eraX[k] = xs.reduce((a, b) => a + b, 0) / xs.length;
    });
    const present = order.filter(k => eraX[k] !== undefined);
    if (present.length < 2) return;

    const barsG = this.g.append('g').attr('class', 'event-bars');
    let drawn = 0;
    this.historicalEvents.forEach((ev) => {
      const era = order.find(k => ev.year >= ranges[k][0] && ev.year < ranges[k][1]);
      if (!era || eraX[era] === undefined) return;
      const i = present.indexOf(era);
      const left = i > 0 ? (eraX[present[i - 1]] + eraX[era]) / 2 : eraX[era] - 70;
      const right = i < present.length - 1 ? (eraX[era] + eraX[present[i + 1]]) / 2 : eraX[era] + 70;
      const f = (ev.year - ranges[era][0]) / (ranges[era][1] - ranges[era][0]);
      const x = left + f * (right - left);

      // תוויות מדורגות ב-4 גבהים + הילה לבנה — בלי חפיפת טקסטים
      const level = drawn % 4;
      const ly = 13 + level * 13;
      barsG.append('rect')
        .attr('x', x - 2).attr('y', 64).attr('width', 4).attr('height', this.height - 90)
        .attr('rx', 2).attr('fill', '#e53935').attr('opacity', 0.18)
        .style('pointer-events', 'none');
      barsG.append('line')
        .attr('x1', x).attr('y1', ly + 3).attr('x2', x).attr('y2', 64)
        .attr('stroke', '#e57373').attr('stroke-width', 1).attr('opacity', 0.55)
        .style('pointer-events', 'none');
      barsG.append('text')
        .attr('x', x).attr('y', ly)
        .attr('text-anchor', 'middle')
        .attr('font-size', '8.5px').attr('font-weight', '700')
        .attr('fill', '#c62828').attr('opacity', 0.95)
        .attr('stroke', '#fafafa').attr('stroke-width', 3).attr('paint-order', 'stroke')
        .style('pointer-events', 'none')
        .text(`${ev.label} · ${ev.year}`);
      drawn++;
    });
    console.log(`🔴 [Events] ${drawn} historical event bars drawn on the era axis`);
  }

  _drawConnections(links) {
    const linkGroup = this.g.append('g').attr('class', 'links');

    const self = this;
    this.link = linkGroup
      .selectAll('path')
      .data(links, d => `${d.source}-${d.target}`)
      .enter()
      .append('path')
      .attr('stroke', '#c9c3b8')                 // subtle grey by default (CP style)
      .attr('stroke-width', 1)
      .attr('fill', 'none')
      .attr('opacity', 0.3)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', d => self._dash(d.type))  // מקווקו = השפעה עקיפה (כמו בטבלה)
      .attr('d', d => this._getCurvedPath(d))
      .on('mouseenter', function(event, d) {
        const sel = d3.select(this)
          .attr('stroke', self.connectionColors[d.type] || '#999')
          .attr('opacity', 0.9)
          .attr('stroke-width', 2.5)
          .style('filter', 'drop-shadow(0 0 4px rgba(0,0,0,0.2))');
        self._applyMarker(sel, d, true);
      })
      .on('mouseleave', function(event, d) {
        const sel = d3.select(this)
          .attr('stroke', '#c9c3b8')
          .attr('opacity', 0.3)
          .attr('stroke-width', 1)
          .style('filter', 'none');
        self._applyMarker(sel, d, false);
      });
  }

  _getCurvedPath(link) {
    // O(1) node lookup (rebuilt if data changed) instead of O(n) find per link
    if (!this._nodeById || this._nodeById.size !== this.data.nodes.length) {
      this._nodeById = new Map(this.data.nodes.map(n => [n.id, n]));
    }
    const source = this._nodeById.get(link.source);
    const target = this._nodeById.get(link.target);
    
    if (!source || !target) return '';

    const mx = (source.x + target.x) / 2;
    const my = (source.y + target.y) / 2;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist === 0) return '';
    
    const offsetX = -dy / dist * 25;
    const offsetY = dx / dist * 25;

    return `M ${source.x} ${source.y} Q ${mx + offsetX} ${my + offsetY} ${target.x} ${target.y}`;
  }

  _drawNodes() {
    const nodeGroup = this.g.append('g').attr('class', 'nodes');
    const self = this;

    this.node = nodeGroup
      .selectAll('circle')
      .data(this.data.nodes, d => d.id)
      .enter()
      .append('circle')
      .attr('class', 'node-circle')
      .attr('cx', d => {
        d._x = d.x;  // Store initial position
        return d.x;
      })
      .attr('cy', d => {
        d._y = d.y;  // Store initial position
        return d.y;
      })
      .attr('r', d => this._r(d))
      .attr('fill', d => this._nodeFill(d))   // אזורים/תקופות לפי המתג במקרא
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('title', d => `${d.label}\n${d.era || 'unknown'}\n${d.field || 'unknown'}`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        this.selectNode(d);
      })
      .on('mouseenter', function(event, d) {
        self._hoverHighlight(d);
        d3.select(this)
          .attr('r', self._r(d) + 4)
          .attr('stroke-width', 3)
          .style('filter', 'drop-shadow(0 0 6px rgba(0,0,0,0.3))');

        // Show custom tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'sage-tooltip';
        tooltip.style.position = 'fixed';
        tooltip.style.left = (event.clientX + 10) + 'px';
        tooltip.style.top = (event.clientY + 10) + 'px';
        tooltip.style.background = '#1a1a1a';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '13px';
        tooltip.style.zIndex = '10000';
        tooltip.style.maxWidth = '250px';
        tooltip.style.direction = 'rtl';
        tooltip.style.textAlign = 'right';
        const regs = self._regionsOf(d).map(r => self.regionLabels[r]).join(' ← ');
        tooltip.textContent = `${d.label}\n${d.era || ''} | ${d.field || ''} | ${regs}`;
        tooltip.id = 'sage-tooltip-' + d.id;
        document.body.appendChild(tooltip);
      })
      .on('mousemove', function(event) {
        const tooltip = document.getElementById('sage-tooltip-' + this.__data__.id);
        if (tooltip) {
          tooltip.style.left = (event.clientX + 10) + 'px';
          tooltip.style.top = (event.clientY + 10) + 'px';
        }
      })
      .on('mouseleave', function(event, d) {
        self._hoverClear();
        d3.select(this)
          .attr('r', self._r(d))
          .attr('stroke-width', 2)
          .style('filter', 'none');

        // Remove tooltip
        const tooltip = document.getElementById('sage-tooltip-' + d.id);
        if (tooltip) tooltip.remove();
      });
  }

  // Hover: spotlight a sage and its direct connections (CP behaviour)
  _hoverHighlight(d) {
    if (this.selectedNodeId) return;   // selection state wins
    const nbrs = this._adj.get(d.id) || new Set();
    this.node.style('opacity', n => (n.id === d.id || nbrs.has(n.id)) ? 1 : 0.15);
    if (this.link) {
      const self = this;
      this.link
        .attr('stroke', l => (l.source === d.id || l.target === d.id)
          ? (this.connectionColors[l.type] || '#999') : '#c9c3b8')
        .attr('stroke-width', l => (l.source === d.id || l.target === d.id) ? 2 : 1)
        .style('opacity', l => (l.source === d.id || l.target === d.id) ? 0.9 : 0.06)
        .each(function(l) { self._applyMarker(d3.select(this), l, l.source === d.id || l.target === d.id); });
    }
    if (this.g) this.g.select('g.labels').selectAll('text')
      .style('opacity', n => (n.id === d.id || nbrs.has(n.id)) ? 0.95 : 0.08);
  }

  _hoverClear() {
    if (this.selectedNodeId) return;
    const f = window.filterState && window.filterState.filteredSages;
    const active = f && f.size > 0 && f.size < this.data.nodes.length;
    this.node.style('opacity', n => (!active || f.has(n.id)) ? 1 : 0.12);
    if (this.link) {
      const self = this;
      this.link.attr('stroke', '#c9c3b8').attr('stroke-width', 1)
        .style('opacity', l => (!active || (f.has(l.source) && f.has(l.target))) ? 0.3 : 0.04)
        .each(function(l) { self._applyMarker(d3.select(this), l, false); });
    }
    if (this.g) this.g.select('g.labels').selectAll('text')
      .style('opacity', n => (!active || f.has(n.id)) ? 0.75 : 0.06);
  }

  _addLabels() {
    const labelGroup = this.g.append('g').attr('class', 'labels');

    labelGroup
      .selectAll('text')
      .data(this.data.nodes, d => d.id)
      .enter()
      .append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y + this._r(d) + 11)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', '#555')
      .attr('pointer-events', 'none')
      .style('opacity', 0.75)
      .text(d => {
        const label = d.label || '';
        return label.length > 18 ? label.substring(0, 17) + '…' : label;
      });
  }

  _setupInteraction() {
    this.svg.on('click', () => {
      this.deselectNode();
    });
  }

  // HTML for the colors section of the legend — era or region mode.
  _legendColorHTML() {
    if (this.colorMode === 'era') {
      const eraLabels = {
        'second-temple': 'בית שני', 'tannaim': 'תנאים', 'amoraim': 'אמוראים',
        'geonim': 'גאונים', 'rishonim': 'ראשונים', 'acharonim': 'אחרונים', 'modern': 'עת חדשה'
      };
      const chips = Object.keys(eraLabels).map(k =>
        `<span class="legend-chip"><i style="background:${this.eraColors[k]}"></i>${eraLabels[k]}</span>`).join('');
      return `<div class="legend-section">תקופות</div><div class="legend-chips">${chips}</div>`;
    }
    const chips = Object.keys(this.regionLabels).map(k =>
      `<span class="legend-chip"><i style="background:${this.regionColors[k]}"></i>${this.regionLabels[k]}</span>`).join('');
    return `<div class="legend-section">בתי מדרש ואזורים</div><div class="legend-chips">${chips}</div>
      <div class="legend-note">עיגול דו־צבעי = חכם שנדד בין מרכזים (מוצא למעלה, יעד למטה)</div>`;
  }

  /**
   * מקרא (Legend) — overlay matching the printed "טבלת חכמי ישראל" conventions:
   * connection line styles, region/era colors + mode toggle. Isolated: pure DOM
   * overlay, collapsible, no effect on the simulation or existing handlers.
   */
  _addLegend() {
    const el = document.querySelector(this.container);
    const wrapper = el && (el.closest('.graph-wrapper') || el.parentElement);
    if (!wrapper) return;
    wrapper.querySelectorAll('.graph-legend').forEach(x => x.remove());

    const lineRow = (type) => {
      const s = this.linkStyles[type];
      const c = this.connectionColors[type] || '#999';
      const dash = s.dash ? `stroke-dasharray="${s.dash}"` : '';
      const arrow = s.dir ? `<polygon points="30,1 38,4 30,7" fill="${c}"/>` : '';
      return `<div class="legend-row">
        <svg width="42" height="8"><line x1="0" y1="4" x2="${s.dir ? 30 : 40}" y2="4" stroke="${c}" stroke-width="2" ${dash}/>${arrow}</svg>
        <span>${s.label}</span></div>`;
    };
    // one row per distinct meaning (teacher+student share a meaning)
    const rows = ['teacher', 'influence', 'predecessor', 'family', 'oppose', 'contemporary'].map(lineRow).join('');

    const box = document.createElement('div');
    box.className = 'graph-legend';
    box.setAttribute('dir', 'rtl');
    box.innerHTML = `
      <div class="legend-title">מקרא ▾</div>
      <div class="legend-body">
        <div class="legend-section">קישור בין החכמים</div>
        ${rows}
        <div class="legend-colors">${this._legendColorHTML()}</div>
        <div class="legend-toggle">צביעה לפי:
          <button data-mode="region" class="active">אזורים</button>
          <button data-mode="era">תקופות</button>
        </div>
        <div class="legend-row" style="margin-top:5px">
          <svg width="42" height="10"><rect x="18" y="0" width="4" height="10" rx="2" fill="#e53935" opacity="0.5"/></svg>
          <span>אירוע היסטורי (גירוש, גזירות)</span>
        </div>
      </div>`;
    box.querySelector('.legend-title').addEventListener('click', () => {
      box.classList.toggle('collapsed');
      box.querySelector('.legend-title').textContent = box.classList.contains('collapsed') ? 'מקרא ▸' : 'מקרא ▾';
    });
    box.querySelectorAll('.legend-toggle button').forEach(b => {
      b.addEventListener('click', () => {
        this.colorMode = b.dataset.mode;
        this._refreshColors();
      });
    });
    wrapper.appendChild(box);
    console.log('🗺️ [Legend] מקרא added (connections, regions/eras toggle, events)');
  }

  selectNode(node) {
    if (!node) return;

    this.selectedNodeId = node.id;
    console.log(`✅ Selected: ${node.label} (ID: ${node.id})`);

    const nbrs = this._adj && this._adj.get(node.id) || new Set();
    if (this.node) {
      this.node.style('opacity', d => (d.id === node.id || nbrs.has(d.id)) ? 1 : 0.15);
    }

    if (this.link) {
      const self = this;
      this.link
        .attr('stroke', d => (d.source === node.id || d.target === node.id)
          ? (this.connectionColors[d.type] || '#999') : '#c9c3b8')
        .attr('stroke-width', d => (d.source === node.id || d.target === node.id) ? 2.2 : 1)
        .style('opacity', d => (d.source === node.id || d.target === node.id) ? 0.9 : 0.04)
        .each(function(d) { self._applyMarker(d3.select(this), d, d.source === node.id || d.target === node.id); });
    }

    if (this.g) this.g.select('g.labels').selectAll('text')
      .style('opacity', d => (d.id === node.id || nbrs.has(d.id)) ? 0.95 : 0.06);

    if (window.selectNodeById) {
      window.selectNodeById(node.id);
    } else if (window.FloatingPanel) {
      window.FloatingPanel.showPanel(node.id, node.label);
    }
  }

  deselectNode() {
    this.selectedNodeId = null;
    this._hoverClear();   // restores opacity honoring any active combined filter
    if (window.buildSageList) {
      const f = window.filterState && window.filterState.filteredSages;
      window.buildSageList(f && f.size < this.data.nodes.length ? f : null);
    }
  }

  // Add new links for filtered sages
  addLinksForFilteredSages(filteredSageIds, allLinks) {
    if (!this.link || !allLinks) return;

    const filteredSet = new Set(filteredSageIds);

    // Find new links that should be displayed
    const newLinks = allLinks.filter(link => {
      const sourceIn = filteredSet.has(link.source);
      const targetIn = filteredSet.has(link.target);
      const alreadyExists = this.link.data().some(d => d.source === link.source && d.target === link.target);
      return sourceIn && targetIn && !alreadyExists;
    });

    if (newLinks.length === 0) return;

    // Add new links to the graph
    const linkGroup = this.g.select('g.links');

    linkGroup
      .selectAll('path')
      .data(newLinks, d => `${d.source}-${d.target}`)
      .enter()
      .append('path')
      .attr('stroke', d => this.connectionColors[d.type] || '#ccc')
      .attr('stroke-width', 1.2)
      .attr('fill', 'none')
      .attr('opacity', 0.4)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', d => this._dash(d.type))
      .attr('d', d => this._getCurvedPath(d))
      .on('mouseenter', function() {
        d3.select(this)
          .attr('opacity', 0.8)
          .attr('stroke-width', 2.5)
          .style('filter', 'drop-shadow(0 0 4px rgba(0,0,0,0.2))');
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('opacity', 0.4)
          .attr('stroke-width', 1.2)
          .style('filter', 'none');
      });

    // Update the link selection to include new links
    this.link = linkGroup.selectAll('path');

    console.log(`✅ Added ${newLinks.length} new connections for filtered sages`);
  }
}

// Export for ES6 modules
export { SageNetwork };
