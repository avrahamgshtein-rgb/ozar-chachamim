/**
 * FIXED D3.js Force-Directed Network Graph
 * Bug Fixes: Colors, Spotify, Search, Chronology, Geography
 */

// TASK E: Helper function to escape HTML for safe text display
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

class SageNetwork {
  constructor(config = {}) {
    this.dataUrl = config.dataUrl || 'data.json';
    this.svgSelector = config.svgSelector || '#graph';
    this.searchSelector = config.searchSelector || '#searchInput';
    this.sidebarSelector = config.sidebarSelector || '#sidebar';

    // FIXED BUG 2: Dynamic color mapping by ERA (consistent across all visualizations)
    this.colorMap = {
      'second-temple': '#8e44ad',      // Purple
      'tannaim': '#e74c3c',             // Red
      'amoraim': '#e67e22',             // Orange
      'geonim': '#f1c40f',              // Yellow
      'rishonim': '#27ae60',            // Green
      'acharonim': '#2980b9',           // Blue
      'modern': '#1abc9c',              // Turquoise
      'unknown': '#999999'              // Gray
    };

    this.eraOrder = {
      'second-temple': 0,
      'tannaim': 1,
      'amoraim': 2,
      'geonim': 3,
      'rishonim': 4,
      'acharonim': 5,
      'modern': 6,
      'unknown': 3.5
    };

    this.data = null;
    this.simulation = null;
    this.selectedNode = null;
    this.searchQuery = '';
    this.loggedMissingColors = {};
  }

  /**
   * Load data from global window.graphData (set by supabase-client.js)
   */
  async init() {
    try {
      // Check if data is already available
      if (window.graphData && window.graphData.nodes && window.graphData.nodes.length > 0) {
        this.data = window.graphData;
        console.log('✓ Graph.js found data in window.graphData');
        this._initializeGraph();
        return;
      }

      // Otherwise wait for supabaseReady event
      console.log('⏳ [Graph] Waiting for Supabase data...');
      document.addEventListener('supabaseReady', () => {
        console.log('📦 [Graph] Data arrived from Supabase');
        this.data = window.graphData;
        this._initializeGraph();
      }, { once: true });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!this.data) {
          console.error('❌ Data loading timeout (10s) - Supabase may be unreachable');
          this.showError('Failed to load data from Supabase after 10 seconds');
        }
      }, 10000);

    } catch (error) {
      console.error('✗ Graph init failed:', error);
      this.showError('Failed to load graph data: ' + error.message);
    }
  }

  /**
   * Actually initialize the graph (after data is ready)
   */
  _initializeGraph() {
    try {
      if (!this.data.nodes || this.data.nodes.length === 0) {
        throw new Error('No nodes in dataset');
      }

      console.log(`✓ Graph initialized: ${this.data.nodes.length} nodes + ${this.data.links?.length || 0} edges`);

      this.setupEventListeners();
      this.render();
    } catch (error) {
      console.error('✗ Graph render failed:', error);
      this.showError('Failed to render graph: ' + error.message);
    }
  }

  /**
   * Setup event listeners for search and UI interactions
   */
  setupEventListeners() {
    // Search input
    const searchInput = document.querySelector(this.searchSelector);
    if (searchInput) {
      // FIX BUG 5: Proper search event listener
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        console.log('🔍 Search:', this.searchQuery);
        this.updateNodeVisibility();
      });
    }

    // Sidebar close button
    const closeBtn = document.querySelector('.sidebar-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeSidebar());
    }

    // Escape key to close sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const sidebar = document.querySelector(this.sidebarSelector);
        if (sidebar && sidebar.classList.contains('active')) {
          this.closeSidebar();
        }
      }
    });
  }

  /**
   * Main rendering function - creates D3 graph with all fixes
   */
  render() {
    // Use Timeline Layout - vertical chronology with big circles
    this.renderTimelineLayout();
  }

  renderNetwork() {
    // Force-directed network visualization
    const svg = d3.select(this.svgSelector);
    const svgNode = svg.node();

    if (!svgNode) {
      console.error('SVG element not found:', this.svgSelector);
      return;
    }

    const width = svgNode.clientWidth;
    const height = svgNode.clientHeight;

    svg.selectAll('*').remove();
    const g = svg.append('g');

    console.log(`📊 Force network rendering ${this.data.nodes.length} nodes`);

    // Create simulation
    this.simulation = d3.forceSimulation(this.data.nodes)
      .force('link', d3.forceLink(this.data.links || [])
        .id(d => String(d.id))
        .distance(100)
        .strength(0.3))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(32));

    // Draw links
    const link = g.selectAll('.link')
      .data(this.data.links || [])
      .enter()
      .append('line')
      .attr('class', d => `link link-${d.type}`)
      .attr('stroke', d => {
        const colorMap = {
          'student': '#4ecdc4', 'teacher': '#2980b9', 'influence': '#8b7965',
          'oppose': '#ff6b6b', 'colleague': '#95e1d3', 'predecessor': '#f9ca24'
        };
        return colorMap[d.type] || '#999';
      })
      .attr('stroke-width', 2)
      .attr('opacity', 0.6);

    // Draw nodes
    this.node = g.selectAll('.node')
      .data(this.data.nodes)
      .enter()
      .append('circle')
      .attr('class', d => `node node-${d.group}`)
      .attr('r', 10)
      .attr('fill', d => this.colorMap[d.group] || '#999')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => this.selectNode(d));

    // Add zoom
    svg.call(d3.zoom()
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      }));

    // Simulation tick
    this.simulation.on('tick', () => {
      link.attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      this.node.attr('cx', d => d.x)
        .attr('cy', d => d.y);
    });

    console.log('✅ Force network rendered');
  }

  /**
   * New Timeline Layout: Vertical chronology with horizontal regions/areas
   * Y-axis = time (top=ancient → bottom=modern)
   * X-axis = regions (Ashkenazi, Sephardic, etc.)
   */
  renderTimelineLayout() {
    // Safety check: wait for data to load
    if (!this.data || !this.data.nodes || this.data.nodes.length === 0) {
      console.warn('⏳ Timeline: Waiting for data to load...');
      console.log('this.data:', this.data);
      console.log('window.graphData:', window.graphData);
      setTimeout(() => this.renderTimelineLayout(), 500);
      return;
    }

    console.log(`📊 Timeline rendering ${this.data.nodes.length} nodes`);

    const svg = d3.select(this.svgSelector);
    const svgNode = svg.node();

    if (!svgNode) {
      console.error('SVG element not found:', this.svgSelector);
      return;
    }

    const viewportWidth = svgNode.clientWidth;
    const viewportHeight = svgNode.clientHeight;

    // EXPANDED LAYOUT: 5x viewport width for horizontal scrolling
    const width = viewportWidth * 5;  // Wide canvas for scrolling
    const height = viewportHeight;
    const padding = { top: 60, right: 40, bottom: 20, left: 120 }; // More left margin for region labels

    console.log(`📐 SVG size: ${width}×${height}px (viewport: ${viewportWidth}×${viewportHeight}px)`);
    console.log(`🔍 Horizontal scroll enabled: ${width}px canvas with ${viewportWidth}px viewport`);

    // Set SVG dimensions for scrolling
    svg.attr('width', width)
       .attr('height', height)
       .style('display', 'block');

    // Enable horizontal scrolling on parent
    const parentContainer = svgNode.parentElement;
    if (parentContainer) {
      parentContainer.style.overflowX = 'auto';
      parentContainer.style.overflowY = 'hidden';
      parentContainer.style.height = '100%';
    }

    svg.selectAll('*').remove();
    const g = svg.append('g')
      .attr('transform', `translate(${padding.left},${padding.top})`);

    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    console.log(`📊 Graph area: ${graphWidth}×${graphHeight}px`);

    // Get unique regions (Y-axis: geographic distribution)
    const regionsSet = new Set();
    this.data.nodes.forEach(n => {
      const region = n.region || 'Unknown';
      regionsSet.add(region);
    });
    const regions = Array.from(regionsSet).sort();

    console.log(`🗺️ Regions: ${regions.length} unique: ${regions.slice(0, 10).join(', ')}${regions.length > 10 ? '...' : ''}`);

    // Get time range from period_order (X-axis: chronological - horizontal)
    const times = this.data.nodes
      .map(n => n.period_order || 0)
      .filter(t => t !== null && t !== undefined);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // Era color map for node coloring
    const eraColorMap = {
      'second-temple': '#8e44ad',
      'tannaim': '#e74c3c',
      'amoraim': '#e67e22',
      'geonim': '#f1c40f',
      'rishonim': '#27ae60',
      'acharonim': '#2980b9',
      'modern': '#1abc9c'
    };

    // Scales - HORIZONTAL LAYOUT
    // X: time (left=ancient → right=modern)
    const xScale = d3.scaleLinear()
      .domain([minTime, maxTime])
      .range([0, graphWidth * 2]);  // 2x width for scrolling

    // Y: regions (top to bottom)
    const yScale = d3.scaleBand()
      .domain(regions)
      .range([0, graphHeight])
      .padding(0.1);

    console.log(`📏 HORIZONTAL Layout: time (X) × ${regions.length} regions (Y)`);
    console.log(`⏱️ Time range: ${minTime} to ${maxTime}`);
    console.log(`📊 Scrollable width: ${(graphWidth * 2).toFixed(0)}px`);

    // Draw horizontal lines for regions (subtle separator)
    g.selectAll('.region-line')
      .data(regions.slice(1))  // Skip first region
      .enter()
      .append('line')
      .attr('class', 'region-line')
      .attr('x1', 0)
      .attr('x2', graphWidth * 2)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#ddd')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3);

    // Region labels on left side (LARGER & READABLE)
    g.selectAll('.region-label')
      .data(regions)
      .enter()
      .append('text')
      .attr('class', 'region-label')
      .attr('x', -12)
      .attr('y', d => yScale(d) + yScale.bandwidth() / 2 + 5)
      .attr('text-anchor', 'end')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('fill', '#1a1a1a')
      .attr('font-family', '"Frank Ruhl Libre", serif')
      .text(d => d);

    // Position nodes by time (X) and region (Y) with GRID LAYOUT
    const regionTimeBuckets = {};  // Group nodes by region + time bucket
    let sampleNode = null;

    // Group nodes by region and period bucket
    this.data.nodes.forEach((node) => {
      const region = node.region || 'Unknown';

      // Create bucket key: region + period bucket (round to nearest 50)
      const periodBucket = Math.round((node.period_order || minTime) / 50) * 50;
      const bucketKey = `${region}|${periodBucket}`;

      if (!regionTimeBuckets[bucketKey]) {
        regionTimeBuckets[bucketKey] = [];
      }
      regionTimeBuckets[bucketKey].push(node);
    });

    // Position nodes within each bucket using deterministic grid
    const GRID_ROWS = 3;  // 3 rows within each time bucket
    const GRID_CELL_WIDTH = 25;
    const GRID_CELL_HEIGHT = 25;

    Object.entries(regionTimeBuckets).forEach(([ bucketKey, nodesInBucket ]) => {
      const [region, periodBucket] = bucketKey.split('|');

      // Base position for this bucket
      const baseX = xScale(parseFloat(periodBucket) || minTime);
      const baseY = yScale(region) + yScale.bandwidth() / 2;

      // Position each node in grid (vertical stacking)
      nodesInBucket.forEach((node, idx) => {
        const col = Math.floor(idx / GRID_ROWS);
        const row = idx % GRID_ROWS;

        // Offset from base position
        const offsetX = (col - (Math.ceil(nodesInBucket.length / GRID_ROWS) - 1) / 2) * GRID_CELL_WIDTH;
        const offsetY = (row - (GRID_ROWS - 1) / 2) * GRID_CELL_HEIGHT;

        node.x = baseX + offsetX;
        node.y = baseY + offsetY;

        if (idx < 2) {
          console.log(`📍 Node ${node.id} "${node.label}": region="${region}", time=${periodBucket}, grid=[${col},${row}], x=${node.x?.toFixed(1)}, y=${node.y?.toFixed(1)}`);
          sampleNode = node;
        }
      });
    });

    console.log(`✅ HORIZONTAL Grid: time (X) × ${GRID_ROWS} rows per bucket`);
    console.log(`✅ Sample positioning: x=${sampleNode?.x?.toFixed(1)}, y=${sampleNode?.y?.toFixed(1)}`);

    // Validate links
    const validNodeIds = new Set(this.data.nodes.map(n => String(n.id)));
    const validLinks = (this.data.links || []).filter(link => {
      const sourceId = String(link.source || link.source === 0 ? link.source : '');
      const targetId = String(link.target || link.target === 0 ? link.target : '');
      return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
    });

    console.log(`✓ Timeline: ${validLinks.length}/${this.data.links?.length || 0} valid links`);

    // Draw links with color mapping by connection type
    const colorMap = {
      'student': '#4ecdc4',        // Turquoise (teacher → student)
      'teacher': '#2980b9',         // Dark Blue
      'influence': '#8b7965',       // Brown
      'oppose': '#ff6b6b',          // Red
      'colleague': '#95e1d3',       // Light Turquoise
      'predecessor': '#f9ca24',     // Yellow
      'contemporary': '#9b59b6'     // Purple
    };

    g.selectAll('.timeline-link')
      .data(validLinks)
      .enter()
      .append('line')
      .attr('class', d => `timeline-link link-${d.type}`)
      .attr('x1', d => {
        const n = this.data.nodes.find(node => String(node.id) === String(d.source.id || d.source));
        return n ? n.x : 0;
      })
      .attr('y1', d => {
        const n = this.data.nodes.find(node => String(node.id) === String(d.source.id || d.source));
        return n ? n.y : 0;
      })
      .attr('x2', d => {
        const n = this.data.nodes.find(node => String(node.id) === String(d.target.id || d.target));
        return n ? n.x : 0;
      })
      .attr('y2', d => {
        const n = this.data.nodes.find(node => String(node.id) === String(d.target.id || d.target));
        return n ? n.y : 0;
      })
      .attr('stroke', d => colorMap[d.type] || '#999')
      .attr('stroke-width', 3)
      .attr('opacity', 0.7);

    // Create tooltip element
    let tooltip = document.querySelector('#sage-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'sage-tooltip';
      tooltip.style.cssText = `
        position: absolute;
        background: white;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 10px 12px;
        font-size: 0.9rem;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 1000;
        pointer-events: none;
        display: none;
        direction: rtl;
        text-align: right;
        line-height: 1.6;
        max-width: 250px;
        font-family: 'Heebo', sans-serif;
      `;
      document.body.appendChild(tooltip);
    }

    // Draw nodes - LARGER CIRCLES FOR BETTER VISIBILITY
    this.node = g.selectAll('.node')
      .data(this.data.nodes)
      .enter()
      .append('circle')
      .attr('class', d => `node node-${d.group}`)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 32)
      .attr('fill', d => this.colorMap[d.group] || '#999')
      .attr('stroke', 'white')
      .attr('stroke-width', 3.5)
      .style('cursor', 'pointer')
      .on('click', (event, d) => this.selectNode(d))
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition().duration(150)
          .attr('r', 40)
          .attr('stroke-width', 4.5);

        // Show tooltip
        const birthYear = d.birth_year || '?';
        const deathYear = d.death_year || '?';
        const period = d.period || d.era || '';
        tooltip.innerHTML = `
          <strong>${d.label}</strong><br>
          <span style="color: #666; font-size: 0.85rem;">
            ${birthYear}–${deathYear}<br>
            ${period}
          </span>
        `;
        tooltip.style.display = 'block';

        // Position tooltip near cursor
        const rect = svgNode.getBoundingClientRect();
        tooltip.style.left = (event.clientX + 10) + 'px';
        tooltip.style.top = (event.clientY - 40) + 'px';
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition().duration(150)
          .attr('r', 32)
          .attr('stroke-width', 3.5);
        tooltip.style.display = 'none';
      });

    // Node labels (larger, better positioned)
    g.selectAll('.node-label')
      .data(this.data.nodes)
      .enter()
      .append('text')
      .attr('class', 'node-label')
      .attr('x', d => d.x)
      .attr('y', d => d.y + 36)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('fill', '#333')
      .attr('pointer-events', 'none')
      .style('font-family', 'Frank Ruhl Libre, serif')
      .text(d => {
        // Truncate at word boundary, not character
        const label = d.label;
        return label.length > 12 ? label.substring(0, 12) + '...' : label;
      });

    // Enable mouse wheel horizontal scroll
    parentContainer.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        // Vertical wheel → convert to horizontal scroll
        e.preventDefault();
        parentContainer.scrollLeft += e.deltaY > 0 ? 50 : -50;
      }
    }, { passive: false });

    // Zoom (D3 pan/zoom on SVG)
    const zoom = d3.zoom()
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Reset zoom to initial position
    const initialTransform = d3.zoomIdentity
      .translate(padding.left, padding.top);
    svg.call(zoom.transform, initialTransform);

    console.log('✅ Timeline Layout rendered - HORIZONTAL SCROLL ENABLED');
    return; // Timeline layout is static—no simulation needed

    // TASK B: Update positions on simulation tick with curved paths + link labels
    this.simulation.on('tick', () => {
      // Render curved links using quadratic Bezier curves
      link.attr('d', d => {
        const x1 = d.source.x;
        const y1 = d.source.y;
        const x2 = d.target.x;
        const y2 = d.target.y;

        // Calculate control point for curve (creates slight arc)
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dr = Math.sqrt(dx * dx + dy * dy);

        // Quadratic Bezier: start → control → end
        // Control point offset by distance based on link type
        const curve = d.type === 'student' ? 0.3 : 0.15;
        const cpx = (x1 + x2) / 2 - (dy / dr) * dr * curve;
        const cpy = (y1 + y2) / 2 + (dx / dr) * dr * curve;

        return `M${x1},${y1}Q${cpx},${cpy},${x2},${y2}`;
      });

      // Update link labels position (at curve control point)
      linkLabels.attr('x', d => {
        const x1 = d.source.x;
        const x2 = d.target.x;
        const y1 = d.source.y;
        const y2 = d.target.y;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dr = Math.sqrt(dx * dx + dy * dy);
        const curve = d.type === 'student' ? 0.3 : 0.15;
        return (x1 + x2) / 2 - (dy / dr) * dr * curve;
      }).attr('y', d => {
        const x1 = d.source.x;
        const x2 = d.target.x;
        const y1 = d.source.y;
        const y2 = d.target.y;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dr = Math.sqrt(dx * dx + dy * dy);
        const curve = d.type === 'student' ? 0.3 : 0.15;
        return (y1 + y2) / 2 + (dx / dr) * dr * curve;
      });

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      labels
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    // Store references
    this.svg = svg;
    this.g = g;
    this.node = node;
    this.link = link;
    this.linkLabels = linkLabels;
    this.labels = labels;

    // VISUALIZATION ENHANCEMENT: Apply advanced chronological ordering
    if (window.VisualizationEnhancer) {
      console.log('📊 [Graph] Applying visualization enhancements...');

      // Add directional arrows for relationship types
      window.VisualizationEnhancer.addGraphArrowMarkers(defs);

      // Enhance link styling based on relationship types
      window.VisualizationEnhancer.enhanceGraphLinks(link);

      // Apply powerful chronological axis force
      window.VisualizationEnhancer.enhanceGraphChronology(
        this.simulation,
        this.data.nodes,
        width,
        height
      );
    }

    console.log('✓ Graph rendered with enhanced chronological layout');
  }

  /**
   * FIX BUG 5: Search functionality - matches Hebrew text, highlights nodes
   */
  updateNodeVisibility() {
    // Guard: ensure graph is rendered
    if (!this.node || !this.link || !this.labels) {
      console.warn('Graph not yet rendered, search unavailable');
      return;
    }

    // Use window.graphData as source of truth
    if (!window.graphData || !window.graphData.nodes) {
      console.warn('No data for search');
      return;
    }

    const query = this.searchQuery.trim();

    if (query === '') {
      // Reset to full visibility
      this.node
        .style('opacity', 1)
        .attr('r', 22)
        .attr('stroke-width', 2);
      this.link.style('opacity', 0.5);
      this.labels.style('opacity', 1);
      return;
    }

    // Find matching nodes (search by name, era, or field)
    const matchedIds = new Set();
    window.graphData.nodes.forEach(d => {
      const nodeId = String(d.id);
      const nameMatch = d.label && d.label.toLowerCase().includes(query);
      const eraMatch = d.era && d.era.toLowerCase().includes(query);
      const fieldMatch = d.field && d.field.toLowerCase().includes(query);
      const groupMatch = d.group && d.group.toLowerCase().includes(query);

      if (nameMatch || eraMatch || fieldMatch || groupMatch) {
        matchedIds.add(nodeId);
      }
    });

    console.log(`🔍 Search: "${query}" → ${matchedIds.size} matches`);

    // Update node visibility
    if (this.node) {
      this.node
        .style('opacity', d => matchedIds.has(String(d.id)) ? 1 : 0.1)
        .attr('r', d => matchedIds.has(String(d.id)) ? 30 : 18)
        .attr('stroke-width', d => matchedIds.has(String(d.id)) ? 3 : 2);
    }

    // TASK D: Update link visibility (now handles curved paths)
    if (this.link && window.graphData.links) {
      this.link
        .style('opacity', d => {
          const sourceMatch = matchedIds.has(String(d.source?.id || d.source || ''));
          const targetMatch = matchedIds.has(String(d.target?.id || d.target || ''));
          return (sourceMatch || targetMatch) ? 0.85 : 0.05;
        })
        .style('stroke-width', d => {
          const sourceMatch = matchedIds.has(String(d.source?.id || d.source || ''));
          const targetMatch = matchedIds.has(String(d.target?.id || d.target || ''));
          // Thicker for student relationships, medium for others
          const baseWidth = d.type === 'student' ? 2.5 : (d.type === 'influence' ? 2 : 1.5);
          return (sourceMatch || targetMatch) ? baseWidth * 1.5 : baseWidth;
        });
    }

    // Update label visibility
    if (this.labels) {
      this.labels.style('opacity', d => {
        return matchedIds.has(String(d.id)) ? 1 : 0.1;
      });
    }
  }

  /**
   * FIX BUG 1: Select node and show sidebar with spotify_url
   */
  async selectNode(node) {
    // DEFENSIVE: Validate node
    if (!node || !node.id || !node.label) {
      console.error('❌ selectNode: Invalid node', node);
      return;
    }

    this.selectedNode = node;
    const nodeId = String(node.id);

    // Highlight node
    if (this.node) {
      this.node.classed('selected', d => String(d.id) === nodeId);
    }

    // Show loading state immediately
    const sidebar = document.querySelector(this.sidebarSelector);
    sidebar.innerHTML = `
      <button class="sidebar-close">
        <i class="fas fa-times"></i>
      </button>
      <div style="padding: 2rem; text-align: center;">
        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #4a86e8;"></i>
        <p style="margin-top: 1rem; color: #666;">Loading profile...</p>
      </div>
    `;
    sidebar.classList.add('active');

    // Notify mobile handler
    if (window.mobileHandler) {
      window.mobileHandler.openSidebar();
    }

    sidebar.querySelector('.sidebar-close').addEventListener('click', () => this.closeSidebar());

    // Load full sage profile from Supabase
    let profile = node; // Fallback
    if (window.supabase) {
      try {
        const { loadSageProfile } = await import('./supabase-client.js');
        profile = await loadSageProfile(nodeId);
        if (!profile) {
          console.warn('Profile load failed, using local node');
          profile = node;
        }
      } catch (error) {
        console.warn('⚠️  Could not load profile from Supabase:', error);
        profile = node;
      }
    }

    // Find connected sages - with defensive link validation
    const related = (this.data.links || [])
      .filter(l => {
        const sourceId = String(l.source?.id || l.source || '');
        const targetId = String(l.target?.id || l.target || '');
        return sourceId === nodeId || targetId === nodeId;
      })
      .map(l => {
        const sourceId = String(l.source?.id || l.source || '');
        const targetId = String(l.target?.id || l.target || '');
        const connectedId = sourceId === nodeId ? targetId : sourceId;

        // DEFENSIVE: Find the actual node object
        return window.graphData.nodes.find(n => String(n.id) === connectedId);
      })
      .filter(n => n); // Remove undefined entries

    // FIX BUG 1: Use spotify_url from profile
    const spotifyUrl = profile.spotify_url
      ? profile.spotify_url
      : `https://open.spotify.com/search/${encodeURIComponent(profile.label + ' jewish music')}`;

    // TASK E: Build research content section using enhanced ResearchDisplay module
    const researchSection = window.ResearchDisplay && profile.research
      ? window.ResearchDisplay.renderResearchSection(profile.research, nodeId)
      : '';

    // Build stats section (from view data)
    const statsSection = profile.connection_count || profile.bookmark_count ? `
      <div class="sidebar-section" style="background: #f0f4f8; padding: 1rem; border-radius: 8px;">
        <h4>📊 Statistics</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.9rem;">
          <div><strong>🔗 Connected:</strong> ${profile.connection_count || 0} sages</div>
          <div><strong>⭐ Bookmarks:</strong> ${profile.bookmark_count || 0} saved</div>
        </div>
      </div>
    ` : '';

    // Log history if user is logged in
    if (window.sageAuth && window.sageAuth.user) {
      try {
        const { logSageView } = await import('./supabase-client.js');
        logSageView(nodeId, 'graph');
      } catch (e) {
        console.warn('⚠️  Could not log view');
      }
    }

    // Get connection types for related sages
    const getConnectionTypes = (sageId, connectedId) => {
      return (this.data.links || [])
        .filter(l => {
          const sourceId = String(l.source?.id || l.source || '');
          const targetId = String(l.target?.id || l.target || '');
          return (sourceId === sageId && targetId === connectedId) ||
                 (sourceId === connectedId && targetId === sageId);
        })
        .map(l => l.type);
    };

    // Get era color for the profile
    const eraColor = this.colorMap[profile.era_key] || this.colorMap['unknown'];

    // Build complete sidebar HTML (Graphic Card Format - like Family Tree)
    const html = `
      <div class="sidebar-header" style="position: relative; padding: 0;">
        <button class="sidebar-close" style="position: absolute; top: 10px; left: 10px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; padding: 0.5rem; z-index: 10;" title="סגור">
          <i class="fas fa-times"></i>
        </button>

        <!-- Main Card - Large Format -->
        <div style="
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.03) 0%, rgba(0, 0, 0, 0.01) 100%);
          border: 3px solid ${eraColor};
          border-radius: 16px;
          padding: 2rem 1.5rem;
          text-align: center;
          margin: 1rem;
          min-height: 280px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
        ">
          <!-- Era Badge at Top -->
          <div style="align-self: flex-start; width: 100%;">
            <span style="
              display: inline-block;
              background: ${eraColor};
              color: white;
              padding: 6px 16px;
              border-radius: 20px;
              font-size: 0.75rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
            ">
              ${profile.era || 'תקופה לא ידועה'}
            </span>
          </div>

          <!-- Main Content -->
          <div style="width: 100%;">
            <!-- Name - LARGE -->
            <h2 style="
              margin: 1.5rem 0 0.5rem 0;
              font-size: 2rem;
              font-weight: 800;
              color: ${eraColor};
              line-height: 1.2;
              font-family: 'Frank Ruhl Libre', serif;
            ">
              ${profile.label || profile.name_he}
            </h2>

            <!-- Period + Region -->
            <div style="
              margin: 1.5rem 0;
              padding: 1rem;
              background: white;
              border-radius: 12px;
              border: 1px solid rgba(0, 0, 0, 0.1);
            ">
              <div style="font-size: 0.9rem; color: #666; margin-bottom: 0.5rem;">
                📅 ${profile.period || 'לא ידוע'}
              </div>
              <div style="font-size: 0.9rem; color: #666;">
                📍 ${profile.region || profile.location || 'לא ידוע'}
              </div>
            </div>

            <!-- Field -->
            ${profile.primary_field ? `
              <div style="
                font-size: 1rem;
                color: ${eraColor};
                font-weight: 600;
                margin-bottom: 1.5rem;
              ">
                🎓 ${profile.primary_field}
              </div>
            ` : ''}
          </div>

          <!-- ID at Bottom - Large & Bold -->
          <div style="
            width: 100%;
            padding-top: 1.5rem;
            border-top: 2px dashed ${eraColor}40;
            font-size: 2.5rem;
            font-weight: 900;
            color: ${eraColor};
            font-family: 'Courier New', monospace;
            letter-spacing: 2px;
          ">
            #${profile.id}
          </div>
        </div>
      </div>
      <div class="sidebar-content">
        <div class="sidebar-section">
          <h3>ביוגרפיה</h3>
          <p>${profile.summary || profile.bio || 'No biography available'}</p>
        </div>

        ${profile.core_concept ? `
          <div class="sidebar-section" style="background: #fff3e0; padding: 1rem; border-left: 4px solid #ff9800; border-radius: 4px;">
            <h4>💡 רעיון עיקרי</h4>
            <p style="margin: 0; font-style: italic; color: #e65100;">${profile.core_concept}</p>
          </div>
        ` : ''}

        ${profile.main_works && Array.isArray(profile.main_works) && profile.main_works.length > 0 ? `
          <div class="sidebar-section" style="background: #f3e5f5; padding: 1rem; border-left: 4px solid #9c27b0; border-radius: 4px;">
            <h4>📚 יצירות עיקריות</h4>
            <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
              ${profile.main_works.map(work => `<li style="margin: 0.3rem 0; font-size: 0.95rem;">${work}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${profile.key_ideas && Array.isArray(profile.key_ideas) && profile.key_ideas.length > 0 ? `
          <div class="sidebar-section" style="background: #e3f2fd; padding: 1rem; border-left: 4px solid #2196f3; border-radius: 4px;">
            <h4>🧠 רעיונות עיקריים</h4>
            <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
              ${profile.key_ideas.map(idea => `<li style="margin: 0.3rem 0; font-size: 0.95rem;">${idea}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${profile.migration_path ? `
          <div class="sidebar-section" style="background: #e8f5e9; padding: 1rem; border-left: 4px solid #4caf50; border-radius: 4px;">
            <h4>🌍 נסיעות</h4>
            <p style="margin: 0; font-size: 0.95rem; color: #2e7d32;">
              ${profile.migration_path.from ? profile.migration_path.from : 'Unknown'}
              ←
              ${profile.migration_path.intermediate && Array.isArray(profile.migration_path.intermediate) && profile.migration_path.intermediate.length > 0
                ? profile.migration_path.intermediate.join(', ') + ' ← '
                : ''
              }
              ${profile.migration_path.to ? profile.migration_path.to : 'Unknown'}
            </p>
          </div>
        ` : ''}

        ${statsSection}

        <!-- TASK E: Research section placed before Spotify (as per spec) -->
        ${researchSection}

        <div class="sidebar-section">
          <h3>🎵 מוזיקה קשורה</h3>
          <a href="${spotifyUrl}" target="_blank" class="spotify-link">
            <i class="fab fa-spotify"></i> חפש ב-Spotify
          </a>
        </div>

        <div class="sidebar-section">
          <button onclick="exportSagePDF('${nodeId}')"
            style="width: 100%; padding: 0.75rem; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            <i class="fas fa-file-pdf"></i> הדפס / Export PDF
          </button>
        </div>

        ${window.sageAuth && window.sageAuth.user ? `
          <div class="sidebar-section">
            <button id="bookmarkBtn" onclick="window.sageNetwork.toggleBookmark('${nodeId}')"
              style="width: 100%; padding: 0.75rem; background: #ffb300; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
              <i class="fas fa-star"></i> שמור
            </button>
          </div>
        ` : ''}

        <div class="sidebar-section" style="margin-top: 2rem;">
          <h3 style="text-align: center; font-size: 1.3rem; color: ${eraColor}; margin-bottom: 1.5rem;">
            🔗 קישורים בין חכמים<br><span style="font-size: 0.85rem; color: #999;">(${related.length} קשרים)</span>
          </h3>
          <div class="related-sages" style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
            ${related.length > 0
              ? related.map(n => {
                  const types = getConnectionTypes(nodeId, String(n.id));
                  const typeEmojis = {
                    'student': '👨‍🎓',
                    'teacher': '👨‍🏫',
                    'influence': '💡',
                    'colleague': '🤝',
                    'predecessor': '📖',
                    'contemporary': '⏰',
                    'oppose': '⚡'
                  };
                  const typeLabels = {
                    'student': 'תלמיד של',
                    'teacher': 'מורה של',
                    'influence': 'השפעה על',
                    'colleague': 'עמית של',
                    'predecessor': 'קודם לדורו',
                    'contemporary': 'בן זמנו',
                    'oppose': 'מתנגד ל'
                  };
                  const typeString = types.length > 0
                    ? types.map(t => `${typeEmojis[t] || '🔗'} ${typeLabels[t] || t}`).join(' / ')
                    : '🔗 קשור ל';

                  return `
                    <div class="related-sage" onclick="window.sageNetwork.selectNode(window.sageNetwork.data.nodes.find(nd => nd.id === '${n.id}'))"
                         style="
                           padding: 1.2rem;
                           background: linear-gradient(135deg, ${eraColor}08 0%, ${eraColor}03 100%);
                           border: 2px solid ${eraColor}40;
                           border-radius: 12px;
                           cursor: pointer;
                           transition: all 0.3s;
                         "
                         onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 16px rgba(0,0,0,0.1)'; this.style.borderColor='${eraColor}';"
                         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='${eraColor}40';">
                      <div style="font-weight: 700; color: #1a1a1a; font-size: 1.05rem; margin-bottom: 0.5rem;">
                        ${n.label}
                      </div>
                      <div style="font-size: 0.9rem; color: ${eraColor}; font-weight: 600;">
                        ${typeString}
                      </div>
                      ${n.period ? `
                        <div style="font-size: 0.8rem; color: #999; margin-top: 0.5rem;">
                          📅 ${n.period}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')
              : '<div style="text-align: center; padding: 2rem; background: #f5f5f5; border-radius: 12px; color: #999;">אין קישורים ישירים</div>'
            }
          </div>
        </div>
      </div>
    `;

    sidebar.innerHTML = html;
    sidebar.classList.add('active');

    // Notify mobile handler
    if (window.mobileHandler) {
      window.mobileHandler.openSidebar();
    }

    // Re-attach close listener
    sidebar.querySelector('.sidebar-close').addEventListener('click', () => this.closeSidebar());

    // Highlight connections in graph
    this.highlightConnections(profile, related);
  }

  /**
   * Highlight connected nodes and links
   */
  highlightConnections(node, related) {
    if (!this.link) return;

    const relatedIds = new Set(related.map(n => n.id));

    this.link
      .classed('active', d => d.source.id === node.id || d.target.id === node.id)
      .style('opacity', d => d.source.id === node.id || d.target.id === node.id ? 0.8 : 0.2)
      .style('stroke-width', d => d.source.id === node.id || d.target.id === node.id ? 2.5 : 1.5);

    this.node
      .classed('related', d => relatedIds.has(d.id))
      .style('opacity', d => {
        if (d.id === node.id) return 1;
        if (relatedIds.has(d.id)) return 1;
        return 0.3;
      });
  }

  /**
   * Close sidebar and deselect node
   */
  closeSidebar() {
    const sidebar = document.querySelector(this.sidebarSelector);
    if (sidebar) {
      sidebar.classList.remove('active');
    }

    if (this.node) {
      this.node.classed('selected', false).classed('related', false);
    }

    if (this.link) {
      this.link.classed('active', false)
        .style('opacity', 0.5)
        .style('stroke-width', 1.5);
    }

    this.selectedNode = null;

    // Notify mobile handler if available
    if (window.mobileHandler && window.mobileHandler.isCurrentlyMobile()) {
      window.mobileHandler.closeSidebar();
    }
  }

  /**
   * Toggle bookmark for a sage
   */
  async toggleBookmark(sageId) {
    if (!window.sageAuth || !window.sageAuth.user) {
      alert('צריך להיות מחובר לשמור');
      return;
    }

    const bookmarks = await window.sageAuth.getBookmarks();
    const isBookmarked = bookmarks.includes(sageId);

    const btn = document.getElementById('bookmarkBtn');
    if (isBookmarked) {
      await window.sageAuth.removeBookmark(sageId);
      btn.textContent = '⭐ שמור';
    } else {
      await window.sageAuth.addBookmark(sageId);
      btn.textContent = '⭐ שמור (✓)';
    }
  }

  /**
   * Drag event handlers
   */
  dragStart(event, d) {
    if (!event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  drag(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  dragEnd(event, d) {
    if (!event.active) this.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  /**
   * Reset zoom
   */
  resetZoom(svg, zoom, width, height) {
    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(0.8)
        .translate(-width / 2, -height / 2)
      );
  }

  /**
   * Show error message
   */
  showError(message) {
    const svg = document.querySelector(this.svgSelector);
    if (svg) {
      svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="red">${message}</text>`;
    }
  }
}

// DISABLED: SageNetwork initialization moved to interactive-genealogy.js
// Initialize when DOM is ready
// document.addEventListener('DOMContentLoaded', () => {
//   window.sageNetwork = new SageNetwork({...
// });
