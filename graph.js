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

    // Draw graph
    this._drawConnections(filteredLinks);
    this._drawNodes();
    this._addLabels();
    this._setupInteraction();

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
      .attr('d', d => this._getCurvedPath(d))
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .attr('stroke', self.connectionColors[d.type] || '#999')
          .attr('opacity', 0.9)
          .attr('stroke-width', 2.5)
          .style('filter', 'drop-shadow(0 0 4px rgba(0,0,0,0.2))');
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('stroke', '#c9c3b8')
          .attr('opacity', 0.3)
          .attr('stroke-width', 1)
          .style('filter', 'none');
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
      .attr('fill', d => this.eraColors[d.era_key] || '#999')
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
        tooltip.textContent = `${d.label}\n${d.era || ''} | ${d.field || ''}`;
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
      this.link
        .attr('stroke', l => (l.source === d.id || l.target === d.id)
          ? (this.connectionColors[l.type] || '#999') : '#c9c3b8')
        .attr('stroke-width', l => (l.source === d.id || l.target === d.id) ? 2 : 1)
        .style('opacity', l => (l.source === d.id || l.target === d.id) ? 0.9 : 0.06);
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
      this.link.attr('stroke', '#c9c3b8').attr('stroke-width', 1)
        .style('opacity', l => (!active || (f.has(l.source) && f.has(l.target))) ? 0.3 : 0.04);
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

  selectNode(node) {
    if (!node) return;

    this.selectedNodeId = node.id;
    console.log(`✅ Selected: ${node.label} (ID: ${node.id})`);

    const nbrs = this._adj && this._adj.get(node.id) || new Set();
    if (this.node) {
      this.node.style('opacity', d => (d.id === node.id || nbrs.has(d.id)) ? 1 : 0.15);
    }

    if (this.link) {
      this.link
        .attr('stroke', d => (d.source === node.id || d.target === node.id)
          ? (this.connectionColors[d.type] || '#999') : '#c9c3b8')
        .attr('stroke-width', d => (d.source === node.id || d.target === node.id) ? 2.2 : 1)
        .style('opacity', d => (d.source === node.id || d.target === node.id) ? 0.9 : 0.04);
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
