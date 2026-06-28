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

// Connection metadata tooltip functions
function showConnectionMetadataTooltip(event, connection) {
  let tooltip = document.getElementById('connection-metadata-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'connection-metadata-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(26, 26, 26, 0.95);
      color: white;
      border: 2px solid #2980b9;
      border-radius: 8px;
      padding: 1rem;
      font-size: 0.9rem;
      max-width: 280px;
      z-index: 2000;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-family: 'Frank Ruhl Libre', serif;
      direction: rtl;
      text-align: right;
    `;
    document.body.appendChild(tooltip);
  }

  const strengthBar = '★'.repeat(connection.strength || 0) + '☆'.repeat(5 - (connection.strength || 0));
  const contextText = connection.context_he || 'קשר בלתי מוגדר';
  const evidenceText = connection.evidence_source || 'מסורת';
  const periodText = connection.period || 'לא ידוע';

  tooltip.innerHTML = `
    <div style="margin-bottom: 0.5rem; font-weight: 600; color: #f39c12;">
      💪 עוצמה: ${strengthBar}
    </div>
    <div style="margin-bottom: 0.5rem;">
      <strong>📅 תקופה:</strong> ${periodText}
    </div>
    <div style="margin-bottom: 0.5rem;">
      <strong>📝 הקשר:</strong> ${contextText}
    </div>
    <div style="font-size: 0.8rem; color: #bdc3c7;">
      <strong>📚 מקור:</strong> ${evidenceText}
    </div>
  `;

  tooltip.style.display = 'block';
  tooltip.style.left = (event.pageX + 10) + 'px';
  tooltip.style.top = (event.pageY + 10) + 'px';
}

function hideConnectionMetadataTooltip() {
  const tooltip = document.getElementById('connection-metadata-tooltip');
  if (tooltip) {
    tooltip.style.display = 'none';
  }
}

// Mapping of sage IDs to lesson plan folders
const LESSON_PLAN_MAP = {
  '45': 'rabbi-yosef-bechor-shor',      // ID 45 (Rishonim)
  '12': 'rabbeinu-bachya-ben-asher',    // ID 12 (Rishonim)
  '156': 'pinchas-kehati',              // ID 156 (Modern)
  '324': 'rabbi-meir-tanna',            // ID 324 (Tannaim) — newly added
  '325': 'maggid-mishneh'               // ID 325 (Rishonim) — newly added
};

// Load lesson plan content from markdown
async function loadLessonPlan(sageId) {
  const folder = LESSON_PLAN_MAP[sageId];
  if (!folder) return null;

  try {
    const response = await fetch(`notes/${folder}/lesson_plan.md`);
    if (!response.ok) return null;
    const markdown = await response.text();
    return { folder, markdown };
  } catch (e) {
    console.warn(`Failed to load lesson plan for sage ${sageId}:`, e);
    return null;
  }
}

// Load research by sage mapping
let RESEARCH_BY_SAGE = {};
fetch('research_by_sage.json')
  .then(r => r.json())
  .then(data => {
    RESEARCH_BY_SAGE = data;
    console.log(`✅ 📚 Loaded research index: ${Object.keys(data).length} sages with research`);
  })
  .catch(e => console.warn('Could not load research index:', e));

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
    this.connectionFilter = 'all'; // 'all', 'prior', 'derivative'
  }

  // Calculate node radius based on connection count
  getNodeRadius(nodeId) {
    const connectionCount = (this.data.links || []).filter(link => {
      const sourceId = String(link.source?.id || link.source);
      const targetId = String(link.target?.id || link.target);
      return sourceId === String(nodeId) || targetId === String(nodeId);
    }).length;

    // 🎯 OPTIMIZED for 561+ nodes: better size distribution
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      // Mobile optimization
      if (connectionCount === 0) return 6;      // Isolated nodes: tiny
      if (connectionCount < 3) return 10;       // Low degree: small
      if (connectionCount < 10) return 14;      // Medium degree
      return Math.min(18 + (connectionCount - 10), 22); // Hub nodes
    } else {
      // Desktop optimization - better visual hierarchy
      if (connectionCount === 0) return 12;     // Isolated: still visible but small
      if (connectionCount < 3) return 16;       // Low degree
      if (connectionCount < 10) return 24;      // Medium degree
      if (connectionCount < 30) return 28 + (connectionCount - 10) * 0.5; // High degree
      return 38; // Hub nodes (30+ connections)
    }
  }

  // Get connections by type (prior = incoming, derivative = outgoing)
  getPriorConnections(nodeId) {
    return (this.data.links || []).filter(link =>
      String(link.target?.id || link.target) === String(nodeId)
    );
  }

  getDerivativeConnections(nodeId) {
    return (this.data.links || []).filter(link =>
      String(link.source?.id || link.source) === String(nodeId)
    );
  }

  /**
   * 🎯 PERFORMANCE: Filter data by URL parameters
   */
  _applyURLFilters(data) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const era = params.get('era');
    const search = params.get('search');
    const region = params.get('region');
    const minStrength = parseInt(params.get('min_strength') || '0');

    console.log('🔗 URL Parameters:');
    console.log(`   id=${id || 'none'}`);
    console.log(`   era=${era || 'none'}`);
    console.log(`   search=${search || 'none'}`);
    console.log(`   region=${region || 'none'}`);
    console.log(`   min_strength=${minStrength}`);

    let nodes = data.nodes || [];
    let links = data.links || [];

    // PHASE 1: Focus view - if ?id=<node_id>, show only that node + direct connections
    if (id) {
      console.log(`🎯 Focus mode: loading node ${id} + direct connections`);
      const targetNode = nodes.find(n => String(n.id) === String(id));
      if (targetNode) {
        // Get all directly connected nodes
        const connectedNodeIds = new Set([String(id)]);
        links.forEach(link => {
          const src = String(link.source?.id || link.source);
          const tgt = String(link.target?.id || link.target);
          if (src === String(id)) connectedNodeIds.add(tgt);
          if (tgt === String(id)) connectedNodeIds.add(src);
        });

        // Filter nodes to target + connected
        nodes = nodes.filter(n => connectedNodeIds.has(String(n.id)));

        // Re-filter links to only include connected nodes
        const nodeIds = new Set(nodes.map(n => String(n.id)));
        links = links.filter(l => {
          const src = String(l.source?.id || l.source);
          const tgt = String(l.target?.id || l.target);
          return nodeIds.has(src) && nodeIds.has(tgt);
        });

        console.log(`   ↳ Found ${nodes.length} nodes, ${links.length} connections`);
      }
    }

    if (era) {
      console.log(`🎯 Filtering by era: ${era}`);
      nodes = nodes.filter(n => n.group === era || n.era_key === era);
    }

    if (search) {
      console.log(`🔍 Filtering by search: ${search}`);
      const q = search.toLowerCase();
      nodes = nodes.filter(n =>
        n.label.toLowerCase().includes(q) ||
        (n.bio && n.bio.toLowerCase().includes(q))
      );
    }

    if (region) {
      console.log(`🗺️ Filtering by region: ${region}`);
      nodes = nodes.filter(n =>
        n.location && n.location.includes(region)
      );
    }

    // PHASE 2: Filter by connection strength
    if (minStrength > 0) {
      console.log(`💪 Filtering by min_strength: ${minStrength}`);
      links = links.filter(l => (l.strength || 0) >= minStrength);
    }

    // Re-filter links to only include nodes that are in filtered list
    const nodeIds = new Set(nodes.map(n => String(n.id)));
    links = links.filter(l => {
      const src = String(l.source?.id || l.source);
      const tgt = String(l.target?.id || l.target);
      return nodeIds.has(src) && nodeIds.has(tgt);
    });

    console.log(`📊 After all filters: ${nodes.length} nodes, ${links.length} links`);
    return { nodes, links };
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

        // 🎯 PERFORMANCE: Apply URL filters
        this.data = this._applyURLFilters(this.data);

        this._initializeGraph();
        return;
      }

      // Otherwise wait for supabaseReady event
      console.log('⏳ [Graph] Waiting for Supabase data...');
      document.addEventListener('supabaseReady', () => {
        console.log('📦 [Graph] Data arrived from Supabase');
        this.data = window.graphData;

        // 🎯 PERFORMANCE: Apply URL filters
        this.data = this._applyURLFilters(this.data);

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
    // Graph Search Bar (new feature)
    const graphSearch = document.querySelector('#graphSearch');
    const clearSearchBtn = document.querySelector('#clearSearch');
    const searchCount = document.querySelector('#searchCount');

    if (graphSearch) {
      graphSearch.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.filterNodesBySearch();
      });

      graphSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && this.searchQuery.length > 0) {
          const matches = this.data.nodes.filter(n =>
            n.label.toLowerCase().includes(this.searchQuery)
          );
          if (matches.length > 0) {
            this.selectNode(matches[0]);
          }
        }
      });

      if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
          graphSearch.value = '';
          this.searchQuery = '';
          this.filterNodesBySearch();
          graphSearch.focus();
        });
      }
    }

    // Advanced filters
    const eraFilter = document.getElementById('eraFilter');
    const regionFilter = document.getElementById('regionFilter');
    const fieldFilter = document.getElementById('fieldFilter');

    if (eraFilter) {
      eraFilter.addEventListener('change', () => this.applyFilters());
    }
    if (regionFilter) {
      regionFilter.addEventListener('change', () => this.applyFilters());
    }
    if (fieldFilter) {
      fieldFilter.addEventListener('change', () => this.applyFilters());
    }

    // Populate region filter from data
    if (regionFilter && this.data && this.data.nodes) {
      const regions = new Set();
      this.data.nodes.forEach(sage => {
        if (sage.location) {
          sage.location.split(';').forEach(loc => {
            const trimmed = loc.trim();
            if (trimmed) regions.add(trimmed);
          });
        }
      });
      Array.from(regions).sort().slice(0, 20).forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionFilter.appendChild(option);
      });
    }

    // Original search input (fallback)
    const searchInput = document.querySelector(this.searchSelector);
    const searchClearBtn = document.querySelector('#searchClearBtn');

    if (searchInput) {
      // FIX BUG 5: Proper search event listener with enhanced UX + AUTOCOMPLETE
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();

        // 🎯 ENHANCEMENT #1: Show/hide clear button
        if (searchClearBtn) {
          if (this.searchQuery.length > 0) {
            searchClearBtn.style.display = 'block';
          } else {
            searchClearBtn.style.display = 'none';
          }
        }

        console.log('🔍 Search:', this.searchQuery);

        // 🎯 ENHANCEMENT #2: Show autocomplete suggestions
        this.updateSearchSuggestions(this.searchQuery);
        this.updateNodeVisibility();

        // Jump to matching sage on Enter or single match
        if (this.searchQuery.length > 0) {
          const matches = this.data.nodes.filter(n =>
            n.label.toLowerCase().includes(this.searchQuery)
          );

          // If Enter key or single match, jump to first result
          if (matches.length === 1) {
            setTimeout(() => this.selectNode(matches[0]), 300);
          }
        }
      });

      // Also handle Enter key to jump to first search result
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && this.searchQuery.length > 0) {
          const matches = this.data.nodes.filter(n =>
            n.label.toLowerCase().includes(this.searchQuery)
          );
          if (matches.length > 0) {
            this.selectNode(matches[0]);
            document.getElementById('searchSuggestions').style.display = 'none';
          }
        }
        // Escape key hides suggestions
        if (e.key === 'Escape') {
          document.getElementById('searchSuggestions').style.display = 'none';
        }
      });

      // Hide suggestions when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.graph-search') && !e.target.closest('#searchSuggestions')) {
          const suggestionsBox = document.getElementById('searchSuggestions');
          if (suggestionsBox) suggestionsBox.style.display = 'none';
        }
      });

      // 🎯 ENHANCEMENT #1: Clear button handler
      if (searchClearBtn) {
        searchClearBtn.addEventListener('click', (e) => {
          e.preventDefault();
          searchInput.value = '';
          this.searchQuery = '';
          searchClearBtn.classList.remove('active');
          this.updateNodeVisibility();
          searchInput.focus();
          console.log('🔍 Search cleared');
        });
      }
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

    // Connection filter buttons
    const priorBtn = document.querySelector('#priorConnectionsBtn');
    const allBtn = document.querySelector('#allConnectionsBtn');
    const derivativeBtn = document.querySelector('#derivativeConnectionsBtn');

    if (priorBtn) {
      priorBtn.addEventListener('click', () => {
        this.connectionFilter = 'prior';
        this.updateConnectionFilters();
      });
    }
    if (allBtn) {
      allBtn.addEventListener('click', () => {
        this.connectionFilter = 'all';
        this.updateConnectionFilters();
      });
    }
    if (derivativeBtn) {
      derivativeBtn.addEventListener('click', () => {
        this.connectionFilter = 'derivative';
        this.updateConnectionFilters();
      });
    }

    // Zoom control buttons
    const zoomInBtn = document.querySelector('#zoomInBtn');
    const zoomOutBtn = document.querySelector('#zoomOutBtn');
    const resetViewBtn = document.querySelector('#resetViewBtn');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.zoomIn());
    }
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.zoomOut());
    }
    if (resetViewBtn) {
      resetViewBtn.addEventListener('click', () => this.resetView());
    }
  }

  zoomIn() {
    if (!this.svg) return;
    this.svg.transition().duration(300).call(
      this.zoom.scaleBy,
      1.3
    );
  }

  zoomOut() {
    if (!this.svg) return;
    this.svg.transition().duration(300).call(
      this.zoom.scaleBy,
      0.77
    );
  }

  resetView() {
    if (!this.svg) return;
    const width = this.svg.node().clientWidth;
    const height = this.svg.node().clientHeight;
    this.svg.transition().duration(500).call(
      this.zoom.transform,
      d3.zoomIdentity.translate(0, 0).scale(1)
    );
  }

  filterNodesBySearch() {
    const matchingNodes = this.searchQuery.length > 0
      ? this.data.nodes.filter(n => n.label.toLowerCase().includes(this.searchQuery))
      : [];

    const searchCount = document.querySelector('#searchCount');
    if (searchCount) {
      if (this.searchQuery.length === 0) {
        searchCount.textContent = '';
      } else {
        searchCount.textContent = `${matchingNodes.length} תוצאה${matchingNodes.length !== 1 ? 'ות' : ''}`;
      }
    }

    if (!this.svg) return;

    const matchingNodeIds = new Set(matchingNodes.map(n => String(n.id)));

    // Update node opacity
    this.svg.selectAll('circle.node').transition().duration(150)
      .attr('opacity', n => {
        if (this.searchQuery.length === 0) return 1;
        return matchingNodeIds.has(String(n.id)) ? 1 : 0.15;
      });

    // Update edge opacity
    this.svg.selectAll('line.link').transition().duration(150)
      .attr('opacity', l => {
        if (this.searchQuery.length === 0) return 0.4;
        const sourceId = String(l.source?.id || l.source);
        const targetId = String(l.target?.id || l.target);
        return (matchingNodeIds.has(sourceId) || matchingNodeIds.has(targetId)) ? 0.6 : 0.05;
      });

    console.log(`🔍 Search filtered: "${this.searchQuery}" → ${matchingNodes.length} sages`);
  }

  updateConnectionFilters() {
    // Update button UI
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    if (this.connectionFilter === 'prior') {
      document.querySelector('#priorConnectionsBtn').classList.add('active');
    } else if (this.connectionFilter === 'derivative') {
      document.querySelector('#derivativeConnectionsBtn').classList.add('active');
    } else {
      document.querySelector('#allConnectionsBtn').classList.add('active');
    }

    // If no node selected, don't filter
    if (!this.selectedNode) {
      this.updateNodeVisibility();
      return;
    }

    // Filter connections based on selected node
    const selectedId = String(this.selectedNode.id);
    const visibleNodeIds = new Set([selectedId]);

    if (this.connectionFilter === 'all') {
      // Show all connected nodes
      this.data.links.forEach(link => {
        const sourceId = String(link.source?.id || link.source);
        const targetId = String(link.target?.id || link.target);
        if (sourceId === selectedId || targetId === selectedId) {
          visibleNodeIds.add(sourceId);
          visibleNodeIds.add(targetId);
        }
      });
    } else if (this.connectionFilter === 'prior') {
      // Show only incoming connections (teachers/mentors)
      this.getPriorConnections(selectedId).forEach(link => {
        visibleNodeIds.add(String(link.source?.id || link.source));
      });
    } else if (this.connectionFilter === 'derivative') {
      // Show only outgoing connections (students/successors)
      this.getDerivativeConnections(selectedId).forEach(link => {
        visibleNodeIds.add(String(link.target?.id || link.target));
      });
    }

    console.log(`🔗 Filter: ${this.connectionFilter} → ${visibleNodeIds.size} nodes visible`);

    // Update visibility
    d3.selectAll('.node')
      .style('opacity', d => visibleNodeIds.has(String(d.id)) ? 0.9 : 0.1)
      .style('pointer-events', d => visibleNodeIds.has(String(d.id)) ? 'auto' : 'none');

    d3.selectAll('.link')
      .style('opacity', l => {
        const sourceId = String(l.source?.id || l.source);
        const targetId = String(l.target?.id || l.target);

        if (this.connectionFilter === 'all') {
          return (sourceId === selectedId || targetId === selectedId) ? 0.7 : 0.1;
        } else if (this.connectionFilter === 'prior') {
          return targetId === selectedId ? 0.7 : 0.1;
        } else if (this.connectionFilter === 'derivative') {
          return sourceId === selectedId ? 0.7 : 0.1;
        }
      });
  }

  /**
   * Main rendering function - creates D3 graph with all fixes
   */
  render() {
    // Use Force-directed Network - interactive layout with scattered circles
    this.renderNetwork();
  }

  renderNetwork() {
    // Force-directed network visualization
    const svg = d3.select(this.svgSelector);
    const svgNode = svg.node();

    if (!svgNode) {
      console.error('SVG element not found:', this.svgSelector);
      return;
    }

    this.width = svgNode.clientWidth;
    this.height = svgNode.clientHeight;
    console.log(`📏 SVG clientWidth=${this.width}, clientHeight=${this.height}`);

    // Fallback to container dimensions if SVG hasn't been laid out yet
    if (this.width === 0 || this.height === 0) {
      // Try to get actual container dimensions
      const wrapper = document.querySelector('.graph-wrapper');
      const container = document.querySelector('.graph-container');

      if (wrapper && wrapper.clientWidth > 0 && wrapper.clientHeight > 0) {
        this.width = wrapper.clientWidth;
        this.height = wrapper.clientHeight;
        console.log(`✅ SVG using graph-wrapper: ${this.width}x${this.height}`);
      } else if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        console.log(`✅ SVG using graph-container: ${this.width}x${this.height}`);
      } else {
        // Last resort: fallback calculation (sidebars 200px each = 400px total)
        const isMobile = window.innerWidth < 768;
        this.width = isMobile ? window.innerWidth : window.innerWidth - 400;
        this.height = window.innerHeight - 160;
        console.warn(`⚠️ SVG fallback: ${this.width}x${this.height} (${isMobile ? 'mobile' : 'desktop'})`);
      }
    }

    svg.selectAll('*').remove();
    svg.attr('width', this.width).attr('height', this.height);

    // Add background
    svg.append('rect')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('fill', '#ffffff')
      .on('click', () => this.deselectNode());

    // Add defs for gradients and filters
    const defs = svg.append('defs');

    // Soft shadow filter for nodes (always applied)
    defs.append('filter')
      .attr('id', 'node-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
      .append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', 2)
      .attr('result', 'coloredBlur');

    // Enhanced glow filter for hover effect
    defs.append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-80%')
      .attr('y', '-80%')
      .attr('width', '260%')
      .attr('height', '260%')
      .append('feGaussianBlur')
      .attr('in', 'SourceGraphic')
      .attr('stdDeviation', 4)
      .attr('result', 'coloredBlur');

    const g = svg.append('g');

    console.log(`📊 Force network rendering ${this.data.nodes.length} nodes`);

    // Compute node degrees for sizing
    const nodeDegree = {};
    this.data.nodes.forEach(n => nodeDegree[n.id] = 0);
    this.data.links.forEach(link => {
      const sourceId = String(link.source?.id || link.source || '');
      const targetId = String(link.target?.id || link.target || '');
      if (nodeDegree[sourceId] !== undefined) nodeDegree[sourceId]++;
      if (nodeDegree[targetId] !== undefined) nodeDegree[targetId]++;
    });

    // Enhanced simulation with better parameters for 323 nodes
    // Mobile vs Desktop optimizations
    const isMobile = window.innerWidth < 768;

    this.simulation = d3.forceSimulation(this.data.nodes)
      .force('link', d3.forceLink(this.data.links || [])
        .id(d => String(d.id))
        .distance(d => {
          // Mobile: shorter distances to fit in smaller viewport
          if (isMobile) {
            return d.type === 'student' ? 50 : d.type === 'teacher' ? 60 : 80;
          } else {
            return d.type === 'student' ? 80 : d.type === 'teacher' ? 90 : 120;
          }
        })
        .strength(d => {
          // Stronger forces for important connections
          return d.type === 'student' ? 0.4 : d.type === 'teacher' ? 0.35 : 0.2;
        }))
      .force('charge', d3.forceManyBody()
        .strength(isMobile ? -400 : -800)  // Reduced repulsion on mobile
        .distanceMax(isMobile ? 200 : 300))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2).strength(0.15))
      .force('collision', d3.forceCollide(d => {
        // Smaller collision radius on mobile
        const baseSize = isMobile
          ? 20 + (Math.sqrt(nodeDegree[d.id] || 0) * 2)
          : 35 + (Math.sqrt(nodeDegree[d.id] || 0) * 4);
        return Math.min(baseSize, isMobile ? 35 : 55);
      }))
      .velocityDecay(0.6)  // Increased from 0.5 for faster settling
      .alphaDecay(0.025);  // Increased from 0.015 for faster energy decay

    // 🎨 ERA COLOR MAP - by Hebrew period names
    const eraColors = {
      'בית שני': '#8e44ad',      // Purple
      'תנאים': '#e74c3c',         // Red
      'אמוראים': '#e67e22',       // Orange
      'גאונים': '#f1c40f',        // Gold/Yellow
      'ראשונים': '#27ae60',       // Green
      'אחרונים': '#2980b9',       // Blue
      'עת חדשה': '#1abc9c'        // Cyan
    };

    // Connection type styling (color + stroke pattern) - DEFINED FIRST for use below
    // Each connection type has distinct color and pattern
    const connectionTypeColors = {
      'student': '#0066cc',      // Blue (تلمید - learning from)
      'teacher': '#cc0000',      // Red (רב - teaching to)
      'influence': '#00aa66',    // Green (השפעה - influence)
      'oppose': '#ff6600',       // Orange (התנגדות - opposition)
      'colleague': '#9966ff',    // Purple (עמית - peer/colleague)
      'predecessor': '#ffaa00',  // Gold (קדמון - predecessor)
      'contemporary': '#00cccc', // Cyan (בן זמן - contemporary)
      'family': '#ff0066'        // Hot pink (משפחה - family)
    };

    // Store era colors for use in filtering functions
    this.eraColors = eraColors;

    // Store connection styling for use in filtering
    this.connectionColors = connectionTypeColors;
    this.connectionWidths = {
      'student': 3.2,
      'teacher': 3.2,
      'colleague': 2.5,
      'influence': 2.5,
      'oppose': 2.5,
      'predecessor': 2.5,
      'contemporary': 2.5,
      'family': 2.5
    };

    const connectionTypeStrokes = {
      'student': 'solid',
      'teacher': 'solid',
      'influence': '4,4',      // Dashed for weaker connections
      'oppose': '6,3',         // Dashed for opposition
      'colleague': 'solid',
      'predecessor': '2,3',    // Dotted
      'contemporary': '5,2',   // Custom dash
      'family': '8,3'          // Longer dash
    };

    // Draw links as groups (line + label)
    const linkGroup = g.selectAll('.link-group')
      .data(this.data.links || [])
      .enter()
      .append('g')
      .attr('class', 'link-group');

    console.log(`🔗 [Graph] Rendering ${this.data.links?.length || 0} links as link-groups:`, linkGroup.size(), 'groups created');

    // Add lines to each group - with connection type styling
    const linkLines = linkGroup.append('line')
      .attr('class', d => `link link-${d.type}`)
      .attr('stroke', d => connectionTypeColors[d.type] || '#999')
      .attr('stroke-width', d => {
        // 🎯 ENHANCED: Larger strokes for better visibility
        const baseWidth = (d.type === 'student' || d.type === 'teacher') ? 3.2 : 2.5; // Increased from 2.8/2.2
        const strength = d.strength || 3;
        const strengthBoost = (strength - 1) * 0.5; // Increased from 0.4
        return Math.max(2.0, baseWidth + strengthBoost); // Min 2.0 instead of 1.5
      })
      .attr('stroke-dasharray', d => {
        // Different patterns for different types
        const patterns = {
          'student': null,      // Solid
          'teacher': null,      // Solid
          'influence': '5,5',   // Dashed (weaker)
          'oppose': '3,3',      // Dotted (opposition)
          'colleague': null,    // Solid
          'predecessor': '2,4', // Sparse dots
          'contemporary': null, // Solid
          'family': '8,4'       // Dash-dash
        };
        return patterns[d.type] || null;
      })
      .attr('opacity', d => {
        // 🎯 ENHANCED: Higher opacity for better visibility
        const strength = d.strength || 3;
        return Math.min(1.0, 0.6 + (strength / 5) * 0.4); // 0.6-1.0 instead of 0.3-0.7
      })
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', d => connectionTypeStrokes[d.type] !== 'solid' ? connectionTypeStrokes[d.type] : null)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).transition().duration(100)
          .attr('stroke-width', 4.5)
          .attr('opacity', 1);
        // Make connection type label fully visible on hover
        d3.select(this.parentNode).select('text.link-label')
          .transition().duration(100)
          .attr('opacity', 1)
          .attr('font-size', '14px');

        // Show connection metadata tooltip
        showConnectionMetadataTooltip(event, d);
      })
      .on('mouseout', function(event, d) {
        // 🎯 ENHANCED: Restore strength-based styling on mouseout
        const baseWidth = (d.type === 'student' || d.type === 'teacher') ? 3.2 : 2.5; // Match new values
        const strength = d.strength || 3;
        const strengthBoost = (strength - 1) * 0.5; // Match new values
        const restoredOpacity = Math.min(1.0, 0.6 + (strength / 5) * 0.4); // Match new range

        d3.select(this).transition().duration(100)
          .attr('stroke-width', Math.max(2.0, baseWidth + strengthBoost)) // Updated min width
          .attr('opacity', restoredOpacity);
        // Return label to normal visibility
        d3.select(this.parentNode).select('text.link-label')
          .transition().duration(100)
          .attr('opacity', 0.6)
          .attr('font-size', '12px');

        // Hide connection metadata tooltip
        hideConnectionMetadataTooltip();
      });

    // Add connection type labels on edges (show on hover)
    const connectionTypeLabels = {
      'student': 'תלמיד',
      'teacher': 'מורה',
      'influence': 'השפעה',
      'oppose': 'התנגדות',
      'colleague': 'עמית',
      'predecessor': 'קדמון',
      'contemporary': 'בן זמן',
      'family': 'משפחה'
    };

    linkGroup.append('text')
      .attr('class', 'link-label')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('font-family', "'Frank Ruhl Libre', serif")
      .attr('fill', d => connectionTypeColors[d.type] || '#333')
      .attr('text-anchor', 'middle')
      .attr('dy', '-5px')
      .attr('opacity', 1.0)  // Always fully visible
      .text(d => {
        // Hebrew labels for connection types
        const labels = {
          'student': 'תלמיד',
          'teacher': 'רב',
          'influence': 'השפעה',
          'oppose': 'התנגדות',
          'colleague': 'עמית',
          'predecessor': 'קדמון',
          'contemporary': 'בן זמן',
          'family': 'משפחה'
        };
        return labels[d.type] || d.type;
      })
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2)
      .style('pointer-events', 'none')
      .style('text-shadow', '0 0 3px white, 0 0 6px rgba(255,255,255,0.95)')
      .style('transition', 'opacity 0.2s ease');

    // Draw nodes - Six Degrees Reference Style with size by degree + colored borders
    const self = this;
    this.node = g.selectAll('.node')
      .data(this.data.nodes, d => d.id)
      .enter()
      .append('circle')
      .attr('class', d => `node node-${d.group}`)
      .attr('r', d => {
        // Size based on connection count (degree centrality) - REDUCED
        const degree = nodeDegree[d.id] || 0;
        const baseSize = 10;  // Smaller base size
        const maxSize = 20;   // Smaller max size
        return Math.min(baseSize + (Math.sqrt(degree) * 2.5), maxSize);
      })
      .attr('fill', d => eraColors[d.era] || '#999999')
      .attr('stroke', d => {
        // VISUAL IMPROVEMENT #1: Colored borders by era
        // Uses era color for visual hierarchy
        return eraColors[d.era] || '#999999';
      })
      .attr('stroke-width', 3)  // Increased from 2.5 to 3 for visibility
      .attr('opacity', 0.9)
      .style('cursor', 'pointer')
      .style('filter', 'url(#node-shadow)')
      .on('click', (event, d) => {
        event.stopPropagation();

        // Check if filtering is active
        const eraFilter = document.getElementById('eraFilter')?.value || '';
        const regionFilter = document.getElementById('regionFilter')?.value || '';
        const fieldFilter = document.getElementById('fieldFilter')?.value || '';
        const hasFilter = eraFilter || regionFilter || fieldFilter;

        // Determine if this sage is in the filtered set
        let isInFiltered = true;
        if (hasFilter) {
          isInFiltered = true;
          if (eraFilter && d.era !== eraFilter) isInFiltered = false;
          if (regionFilter && !(d.location && d.location.includes(regionFilter))) isInFiltered = false;
          if (fieldFilter && d.field !== fieldFilter) isInFiltered = false;
        }

        // If filtering is active and sage is NOT in filtered set, need 2 clicks
        if (hasFilter && !isInFiltered) {
          // First click - mark as waiting for second click
          if (!d._clickWaiting) {
            d._clickWaiting = true;
            console.log(`⏳ Dimmed sage - need second click to select: ${d.label}`);
            // Reset after 1 second if no second click
            setTimeout(() => { d._clickWaiting = false; }, 1000);
            return;
          }
          // Second click - proceed
          d._clickWaiting = false;
        }

        // Open sidebar/details
        self.selectNode(d);
      })
      .on('mouseover', function(event, d) {
        event.stopPropagation();
        const hoveredNodeId = d.id;

        // VISUAL IMPROVEMENT #3: Apply glow filter to hovered node
        d3.select(this)
          .transition().duration(100)
          .attr('filter', 'url(#node-glow)');

        // Show sage name tooltip
        let tooltip = g.select('text.sage-tooltip');
        if (tooltip.empty()) {
          tooltip = g.append('text')
            .attr('class', 'sage-tooltip')
            .style('font-family', "'Frank Ruhl Libre', serif")
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .style('fill', '#1a1a1a')
            .style('text-anchor', 'middle')
            .style('pointer-events', 'none')
            .style('text-shadow', '0 0 4px white, 0 0 8px white, 0 0 12px rgba(255,255,255,0.8)')
            .style('direction', 'rtl');
        }
        tooltip.attr('x', d.x)
          .attr('y', d.y - 50)
          .attr('opacity', 1)
          .text(d.label);

        // Find all connected nodes (1st degree only - Connected Papers style)
        const connectedNodeIds = new Set();
        connectedNodeIds.add(String(hoveredNodeId));
        self.data.links.forEach(link => {
          const sourceId = String(link.source.id || link.source);
          const targetId = String(link.target.id || link.target);
          if (sourceId === String(hoveredNodeId)) {
            connectedNodeIds.add(targetId);
          }
          if (targetId === String(hoveredNodeId)) {
            connectedNodeIds.add(sourceId);
          }
        });

        // Check if filtering is active to apply different hover behavior
        const eraFilter = document.getElementById('eraFilter')?.value || '';
        const regionFilter = document.getElementById('regionFilter')?.value || '';
        const fieldFilter = document.getElementById('fieldFilter')?.value || '';
        const hasFilter = eraFilter || regionFilter || fieldFilter;

        // VISUAL IMPROVEMENT #3: Enhanced hover effect (Six Degrees style)
        // But only for selected sages when filtering is active
        self.node.transition().duration(150)
          .attr('opacity', n => {
            if (String(n.id) === String(hoveredNodeId)) return 1;
            if (connectedNodeIds.has(String(n.id))) return 0.95;
            return 0.15;  // Fade non-connected to 15% (more dramatic)
          })
          .attr('r', n => {
            // Only enlarge if hovered node is selected (when filtering)
            const isHoveredSelected = hasFilter && !self._isNodeDimmed(n, eraFilter, regionFilter, fieldFilter);

            if (String(n.id) === String(hoveredNodeId) && (!hasFilter || isHoveredSelected)) {
              // Hovered node: significantly larger with glow (only if selected or no filter)
              return Math.min((nodeDegree[n.id] || 0) + 45, 52);
            }
            if (connectedNodeIds.has(String(n.id)) && (!hasFilter || isHoveredSelected)) {
              // Connected nodes: slightly larger (only if hovered is selected)
              return Math.min((nodeDegree[n.id] || 0) + 32, 50);
            }
            return Math.min(24 + (Math.sqrt(nodeDegree[n.id] || 0) * 4), 42);
          })
          .attr('stroke-width', n => {
            // Only thicken borders if hovered node is selected (when filtering)
            const isHoveredSelected = hasFilter && !self._isNodeDimmed(n, eraFilter, regionFilter, fieldFilter);

            if (String(n.id) === String(hoveredNodeId) && (!hasFilter || isHoveredSelected)) {
              return 4.5;  // Thicker for hovered
            }
            if (connectedNodeIds.has(String(n.id)) && (!hasFilter || isHoveredSelected)) {
              return 3.5;  // Thicker for connected
            }
            return 3;  // Normal
          });

        // Highlight connected edges with stronger effect
        linkLines.transition().duration(150)
          .attr('opacity', l => {
            const sourceId = String(l.source.id || l.source);
            const targetId = String(l.target.id || l.target);
            return (sourceId === String(hoveredNodeId) || targetId === String(hoveredNodeId)) ? 0.95 : 0.1;
          })
          .attr('stroke-width', l => {
            const sourceId = String(l.source.id || l.source);
            const targetId = String(l.target.id || l.target);
            if (sourceId === String(hoveredNodeId) || targetId === String(hoveredNodeId)) {
              return l.type === 'student' || l.type === 'teacher' ? 4 : 3;
            }
            return l.type === 'student' || l.type === 'teacher' ? 2.5 : 1.5;
          });

        // Highlight connected edge labels
        linkGroup.select('text.link-label').transition().duration(150)
          .attr('opacity', l => {
            const sourceId = String(l.source.id || l.source);
            const targetId = String(l.target.id || l.target);
            return (sourceId === String(hoveredNodeId) || targetId === String(hoveredNodeId)) ? 1 : 0.15;
          })
          .attr('font-size', l => {
            const sourceId = String(l.source.id || l.source);
            const targetId = String(l.target.id || l.target);
            return (sourceId === String(hoveredNodeId) || targetId === String(hoveredNodeId)) ? '14px' : '12px';
          });

        // 🎯 ENHANCEMENT #3: Enhanced glow with pulse animation on hovered node
        const hoveredNode = d3.select(this);
        hoveredNode
          .transition().duration(120)
          .attr('filter', 'url(#node-glow)')
          .attr('stroke-width', 3);

        // Add subtle pulse animation to hovered node
        hoveredNode.style('animation', 'none').style('animation', 'pulse-node 1.5s ease-in-out infinite');

        // Create pulse animation if not exists
        if (!document.querySelector('style[data-pulse-animation]')) {
          const style = document.createElement('style');
          style.setAttribute('data-pulse-animation', 'true');
          style.textContent = `
            @keyframes pulse-node {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.75; }
            }
          `;
          document.head.appendChild(style);
        }

        // Show connection info
        const connectedTypes = [];
        self.data.links.forEach(link => {
          const sourceId = String(link.source.id || link.source);
          const targetId = String(link.target.id || link.target);
          if (sourceId === String(hoveredNodeId)) {
            connectedTypes.push(`→ ${link.type}`);
          } else if (targetId === String(hoveredNodeId)) {
            connectedTypes.push(`← ${link.type}`);
          }
        });

        if (connectedTypes.length > 0) {
          console.log('🔗 Connected:', connectedTypes.join(', '));
        }
      })
      .on('mouseout', function(event, d) {
        // Hide sage name tooltip
        g.select('text.sage-tooltip').transition().duration(100).attr('opacity', 0);

        // VISUAL IMPROVEMENT #3: Remove glow filter on mouseout
        d3.select(this)
          .transition().duration(100)
          .attr('filter', 'url(#node-shadow)');

        // Restore all nodes smoothly
        self.node.transition().duration(150)
          .attr('opacity', 0.9)
          .attr('r', n => Math.min(26 + (Math.sqrt(nodeDegree[n.id] || 0) * 4), 44))
          .attr('stroke-width', 3)  // Updated from 2.5 to match new border width
          .attr('filter', 'url(#node-shadow)');

        // Restore all edges
        linkLines.transition().duration(150)
          .attr('opacity', d => {
            // 🎯 ENHANCEMENT #2: Restore opacity by strength
            const strength = d.strength || 3;
            return Math.min(0.7, 0.3 + (strength / 5) * 0.4);
          })
          .attr('stroke-width', l => {
            // 🎯 ENHANCEMENT #2: Restore width by strength
            const baseWidth = (l.type === 'student' || l.type === 'teacher') ? 2.8 : 2.2;
            const strength = l.strength || 3;
            const strengthBoost = (strength - 1) * 0.4;
            return Math.max(1.5, baseWidth + strengthBoost);
          });

        // Restore edge labels
        linkGroup.select('text.link-label').transition().duration(150)
          .attr('opacity', 0.6)
          .attr('font-size', '12px');
      });

    // Add zoom with zoom controls
    const zoom = d3.zoom()
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Store zoom for reset button
    this.svg = svg;
    this.g = g;
    this.zoom = zoom;

    // Simulation tick - optimized for smooth rendering
    let tickCount = 0;
    let lastTickTime = 0;
    const minTickInterval = 16; // Cap at 60fps

    this.simulation.on('tick', () => {
      const now = performance.now();
      tickCount++;

      // Performance optimization: skip some frames on lower-end devices
      if (now - lastTickTime < minTickInterval) return;
      lastTickTime = now;

      // VIEWPORT CULLING: Only update visible nodes/links
      const padding = 100;
      const viewport = {
        x: -padding, y: -padding,
        width: self.width + padding * 2,
        height: self.height + padding * 2
      };

      // Update link lines (with culling)
      linkGroup.select('line')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)
        .style('display', d => {
          // Hide links outside viewport
          const midX = (d.source.x + d.target.x) / 2;
          const midY = (d.source.y + d.target.y) / 2;
          return (midX >= viewport.x && midX <= viewport.x + viewport.width &&
                  midY >= viewport.y && midY <= viewport.y + viewport.height) ? 'block' : 'none';
        });

      // Update link labels (connection type) positions - only for visible links
      linkGroup.select('text.link-label')
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2)
        .style('display', d => {
          const midX = (d.source.x + d.target.x) / 2;
          const midY = (d.source.y + d.target.y) / 2;
          return (midX >= viewport.x && midX <= viewport.x + viewport.width &&
                  midY >= viewport.y && midY <= viewport.y + viewport.height) ? 'block' : 'none';
        });

      // Update node positions with bounds checking (render all nodes for simplicity)
      self.node.attr('cx', d => Math.max(35, Math.min(self.width - 35, d.x)))
        .attr('cy', d => Math.max(35, Math.min(self.height - 35, d.y)));

      // Update sage tooltip position
      g.select('text.sage-tooltip')
        .attr('x', function() {
          const text = d3.select(this).text();
          const node = self.data.nodes.find(n => n.label === text);
          return node ? node.x : 0;
        })
        .attr('y', function() {
          const text = d3.select(this).text();
          const node = self.data.nodes.find(n => n.label === text);
          return node ? node.y - 50 : 0;
        });
    });

    // Add drag behavior for manual repositioning
    const drag = d3.drag()
      .on('start', (event, d) => {
        if (!event.active) self.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) {
          self.simulation.alphaTarget(0).restart();  // Quickly settle
          // Force stability after 500ms
          setTimeout(() => {
            self.simulation.alpha(0.001).restart();
          }, 500);
        }
        d.fx = null;
        d.fy = null;
      });

    this.node.call(drag);

    // 🎯 NETWORK STATS for large graphs (561+ nodes)
    const degree = {};
    this.data.nodes.forEach(n => degree[n.id] = 0);
    this.data.links.forEach(link => {
      const sourceId = String(link.source?.id || link.source);
      const targetId = String(link.target?.id || link.target);
      if (degree[sourceId] !== undefined) degree[sourceId]++;
      if (degree[targetId] !== undefined) degree[targetId]++;
    });

    const isolated = Object.keys(degree).filter(id => degree[id] === 0).length;
    const connected = this.data.nodes.length - isolated;
    const avgDegree = Object.values(degree).reduce((a, b) => a + b, 0) / this.data.nodes.length;

    // Spotify coverage
    const withSpotify = this.data.nodes.filter(n => n.spotify_url).length;

    const hubs = Object.entries(degree)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, deg]) => {
        const node = this.data.nodes.find(n => String(n.id) === id);
        return `${node?.label} (${deg})`;
      });

    console.log('✅ Force network rendered with Connected Papers enhancements:');
    console.log('   ✓ Node sizing by degree centrality');
    console.log('   ✓ Connection type styling (solid/dashed)');
    console.log('   ✓ Enhanced force simulation parameters');
    console.log('   ✓ Improved hover effects with glow');
    console.log('');
    console.log('📊 Network Statistics:');
    console.log(`   • Nodes: ${this.data.nodes.length} total`);
    console.log(`   • Edges: ${this.data.links.length} total`);
    console.log(`   • Connected: ${connected} (${Math.round(100 * connected / this.data.nodes.length)}%)`);
    console.log(`   • Isolated: ${isolated} (${Math.round(100 * isolated / this.data.nodes.length)}%)`);
    console.log(`   • Spotify URLs: ${withSpotify} (${Math.round(100 * withSpotify / this.data.nodes.length)}%)`);
    console.log(`   • Avg degree: ${avgDegree.toFixed(1)}`);
    console.log(`   • Top hubs: ${hubs.join(', ')}`);
  }

  /**
   * New Timeline Layout: Vertical chronology with horizontal regions/areas
   * Y-axis = time (top=ancient → bottom=modern)
   * X-axis = regions (Ashkenazi, Sephardic, etc.)
   */
  renderTimelineLayout() {
    console.log('🎬 renderTimelineLayout called');

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

    // Region labels removed for cleaner UI
    // g.selectAll('.region-label') - DISABLED for minimal design

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

    // Draw link groups (line + label)
    const linkGroup = g.selectAll('.timeline-link-group')
      .data(validLinks)
      .enter()
      .append('g')
      .attr('class', 'timeline-link-group');

    // Add lines
    linkGroup.append('line')
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

    // Connection type labels removed for clean minimal design
    // Kept in comment for reference:
    // typeMap = { student: 'תלמיד', teacher: 'רב', colleague: 'עמית', ... }

    // Get existing tooltip element from HTML
    let tooltip = document.querySelector('#sage-tooltip');
    if (!tooltip) {
      console.error('❌ Tooltip element not found in HTML!');
      return;
    }
    console.log('✓ Tooltip element found');

    // Debug: Check if nodes have x/y positions
    const nodesSample = this.data.nodes.slice(0, 3);
    console.log('🔍 Sample nodes with positions:');
    nodesSample.forEach(n => {
      console.log(`  ${n.label}: x=${n.x}, y=${n.y}`);
    });

    // Draw nodes - LARGER CIRCLES FOR BETTER VISIBILITY
    const self = this;  // Preserve context for click handler
    const focusId = new URLSearchParams(window.location.search).get('id');

    this.node = g.selectAll('.node')
      .data(this.data.nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group');

    // Add circles
    this.node.append('circle')
      .attr('class', d => `node node-${d.group}`)
      .attr('cx', d => d.x || 0)
      .attr('cy', d => d.y || 0)
      .attr('r', 12)
      .attr('fill', d => {
        // If in focus mode and this is the central node, highlight in red
        if (focusId && String(d.id) === focusId) {
          return '#e74c3c';
        }
        return self.colorMap[d.group] || '#999';
      })
      .attr('stroke', d => {
        // Thicker stroke for central node
        if (focusId && String(d.id) === focusId) {
          return '#fff';
        }
        return 'white';
      })
      .attr('stroke-width', d => {
        if (focusId && String(d.id) === focusId) {
          return 3;
        }
        return 1.5;
      })
      .attr('opacity', 0.85)
      .style('cursor', 'pointer');

    // Add SVG title for native tooltip
    this.node.append('title')
      .text(d => d.label);

    // Add hover card (rect + text)
    this.node.append('rect')
      .attr('class', 'node-card')
      .attr('x', d => (d.x || 0) - 60)
      .attr('y', d => (d.y || 0) - 45)
      .attr('width', 120)
      .attr('height', 35)
      .attr('fill', '#1a1a1a')
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('opacity', 0)
      .attr('pointer-events', 'none')
      .style('transition', 'opacity 0.2s');

    this.node.append('text')
      .attr('class', 'node-text')
      .attr('x', d => d.x || 0)
      .attr('y', d => (d.y || 0) - 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .attr('dy', '0.35em')
      .text(d => d.label)
      .style('font-family', "'Frank Ruhl Libre', serif");

    // Add content availability badges
    this.node.each((d, i, nodes) => {
      const sageId = String(d.id);
      const hasLesson = LESSON_PLAN_MAP[sageId];
      const hasResearch = RESEARCH_BY_SAGE[sageId] && RESEARCH_BY_SAGE[sageId].length > 0;

      if (hasLesson || hasResearch) {
        const badge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badge.setAttribute('x', d.x + 15);
        badge.setAttribute('y', d.y - 15);
        badge.setAttribute('font-size', '18');
        badge.setAttribute('text-anchor', 'middle');
        badge.setAttribute('pointer-events', 'none');
        badge.setAttribute('class', 'content-badge');

        if (hasLesson) {
          badge.textContent = '📚';
        } else if (hasResearch) {
          badge.textContent = '📖';
        }

        svg.append(badge);
      }
    });

    console.log('✓ Nodes created with hover handlers:', this.node.size(), 'nodes');

    // Add event handlers
    this.node.on('click', function(event, d) {
        event.stopPropagation();
        // Hide tooltip on click
        tooltip.style.display = 'none';

        // Store clicked node for next click
        self.lastClickedNode = d;
        self.clickCount = (self.clickCount || 0) + 1;

        // Double-click or second click on same node: open sidebar
        setTimeout(() => {
          if (self.clickCount === 2 && self.lastClickedNode === d) {
            self.selectNode(d);
            self.clickCount = 0;
          }
        }, 300);
      })
      .on('mouseover', function(event, d) {
        console.log('🔍 Hover on:', d.label);

        // Enlarge circle
        d3.select(this).select('circle')
          .transition().duration(150)
          .attr('r', 18)
          .attr('stroke-width', 2);

        // Show card + text
        d3.select(this).select('rect.node-card')
          .transition().duration(150)
          .attr('opacity', 0.95);

        d3.select(this).select('text.node-text')
          .transition().duration(150)
          .attr('opacity', 1);
      })
      .on('mouseout', function() {
        // Shrink circle
        d3.select(this).select('circle')
          .transition().duration(150)
          .attr('r', 12)
          .attr('stroke-width', 1.5);

        // Hide card + text
        d3.select(this).select('rect.node-card')
          .transition().duration(150)
          .attr('opacity', 0);

        d3.select(this).select('text.node-text')
          .transition().duration(150)
          .attr('opacity', 0);
      })
      .on('touchstart', function(event, d) {
        // Mobile touch: just enlarge circle, no tooltip (hover only)
        d3.select(this)
          .transition().duration(150)
          .attr('r', 18)
          .attr('stroke-width', 2);
      })
      .on('touchend', function() {
        // Hide on touch end
        d3.select(this)
          .transition().duration(150)
          .attr('r', 12)
          .attr('stroke-width', 1.5);
        tooltip.style.display = 'none';
      });

    // Add text labels that show on hover
    const labels = g.selectAll('.node-label')
      .data(this.data.nodes)
      .enter()
      .append('text')
      .attr('class', 'node-label')
      .attr('x', d => d.x || 0)
      .attr('y', d => d.y || -25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1a1a1a')
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .text(d => d.label)
      .style('font-family', "'Frank Ruhl Libre', serif")
      .style('direction', 'rtl')
      .style('text-shadow', '0 0 3px white, 0 0 6px white');

    // Show/hide labels on hover
    this.node.on('mouseover.label', function(event, d) {
      const label = g.selectAll('.node-label')
        .filter(n => n.id === d.id);
      label.transition().duration(100).attr('opacity', 1);

      // Show bio hover card
      const bioCard = document.getElementById('sage-bio-card');
      if (bioCard) {
        bioCard.innerHTML = `
          <div style="padding: 0.75rem;">
            <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #1a1a1a;">${escapeHtml(d.label)}</h4>
            <p style="margin: 0 0 0.5rem 0; font-size: 0.75rem; color: #666;">
              <strong>${d.era || 'Unknown'}</strong><br>
              📍 ${d.location || 'N/A'}
            </p>
            <p style="margin: 0; font-size: 0.8rem; color: #555; line-height: 1.3;">
              ${(d.bio || d.summary || '').substring(0, 80)}...
            </p>
          </div>
        `;
        bioCard.style.display = 'block';
        bioCard.style.left = (event.pageX + 10) + 'px';
        bioCard.style.top = (event.pageY + 10) + 'px';
      }
    })
    .on('mouseout.label', function(event, d) {
      const label = g.selectAll('.node-label')
        .filter(n => n.id === d.id);
      label.transition().duration(100).attr('opacity', 0);

      // Hide bio card
      const bioCard = document.getElementById('sage-bio-card');
      if (bioCard) {
        bioCard.style.display = 'none';
      }
    });

    // Update label positions on simulation tick
    this.simulation.on('tick', () => {
      labels.attr('x', d => d.x)
        .attr('y', d => d.y - 25);
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

    // ADD HOVER HANDLERS BEFORE RETURN
    console.log('✓ Nodes created with hover handlers:', this.node.size(), 'nodes');

    this.node.on('mouseover', function(event, d) {
      console.log('🔍 Hover on:', d.label);

      // Enlarge circle
      d3.select(this).select('circle')
        .transition().duration(150)
        .attr('r', 18)
        .attr('stroke-width', 2);

      // Show card + text
      d3.select(this).select('rect.node-card')
        .transition().duration(150)
        .attr('opacity', 0.95);

      d3.select(this).select('text.node-text')
        .transition().duration(150)
        .attr('opacity', 1);
    })
    .on('mouseout', function() {
      // Shrink circle
      d3.select(this).select('circle')
        .transition().duration(150)
        .attr('r', 12)
        .attr('stroke-width', 1.5);

      // Hide card + text
      d3.select(this).select('rect.node-card')
        .transition().duration(150)
        .attr('opacity', 0);

      d3.select(this).select('text.node-text')
        .transition().duration(150)
        .attr('opacity', 0);
    });

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
   * Enhanced search - highlights matches and connected nodes
   */
  updateNodeVisibility() {
    // Guard: ensure graph is rendered
    if (!this.node) {
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
      // Reset to full visibility with original sizing
      const nodeDegree = {};
      window.graphData.nodes.forEach(n => nodeDegree[n.id] = 0);
      window.graphData.links.forEach(link => {
        const sourceId = String(link.source?.id || link.source || '');
        const targetId = String(link.target?.id || link.target || '');
        if (nodeDegree[sourceId] !== undefined) nodeDegree[sourceId]++;
        if (nodeDegree[targetId] !== undefined) nodeDegree[targetId]++;
      });

      this.node.transition().duration(300)
        .style('opacity', 0.88)
        .attr('r', d => Math.min(24 + (Math.sqrt(nodeDegree[d.id] || 0) * 4), 42))
        .attr('stroke-width', 2.5);

      if (this.node) {
        d3.selectAll('.link').transition().duration(300).style('opacity', 0.65); // Increased from 0.45
      }
      return;
    }

    // Find matching nodes with semantic search
    const matchedIds = new Set();
    const connectedToMatches = new Set();

    window.graphData.nodes.forEach(d => {
      const nodeId = String(d.id);
      const nameMatch = d.label && d.label.toLowerCase().includes(query);
      const eraMatch = d.era && d.era.toLowerCase().includes(query);
      const fieldMatch = d.field && d.field.toLowerCase().includes(query);
      const periodMatch = d.period && d.period.toLowerCase().includes(query);

      if (nameMatch || eraMatch || fieldMatch || periodMatch) {
        matchedIds.add(nodeId);
      }
    });

    // Also highlight nodes connected to matches
    window.graphData.links?.forEach(link => {
      const sourceId = String(link.source?.id || link.source || '');
      const targetId = String(link.target?.id || link.target || '');
      if (matchedIds.has(sourceId) || matchedIds.has(targetId)) {
        connectedToMatches.add(sourceId);
        connectedToMatches.add(targetId);
      }
    });

    console.log(`🔍 Search: "${query}" → ${matchedIds.size} direct + ${connectedToMatches.size - matchedIds.size} connected`);

    // Update node visibility with three tiers
    if (this.node) {
      this.node.transition().duration(250)
        .style('opacity', d => {
          if (matchedIds.has(String(d.id))) return 1;
          if (connectedToMatches.has(String(d.id))) return 0.6;
          return 0.08;
        })
        .attr('r', d => {
          const nodeDegree = {};
          window.graphData.nodes.forEach(n => nodeDegree[n.id] = 0);
          window.graphData.links.forEach(link => {
            const srcId = String(link.source?.id || link.source || '');
            const tgtId = String(link.target?.id || link.target || '');
            if (nodeDegree[srcId] !== undefined) nodeDegree[srcId]++;
            if (nodeDegree[tgtId] !== undefined) nodeDegree[tgtId]++;
          });
          const baseSize = Math.min(24 + (Math.sqrt(nodeDegree[d.id] || 0) * 4), 42);
          if (matchedIds.has(String(d.id))) return baseSize + 8;
          if (connectedToMatches.has(String(d.id))) return baseSize + 2;
          return baseSize;
        });
    }

    // Update link visibility with transitions
    if (window.graphData.links) {
      d3.selectAll('.link').transition().duration(250)
        .style('opacity', d => {
          const sourceMatch = matchedIds.has(String(d.source?.id || d.source || ''));
          const targetMatch = matchedIds.has(String(d.target?.id || d.target || ''));
          const sourceConnected = connectedToMatches.has(String(d.source?.id || d.source || ''));
          const targetConnected = connectedToMatches.has(String(d.target?.id || d.target || ''));
          if (sourceMatch || targetMatch) return 0.9;
          if (sourceConnected || targetConnected) return 0.25;
          return 0.05;
        });
    }
  }

  /**
   * ENHANCEMENT #2: Show autocomplete suggestions for search
   */
  updateSearchSuggestions(query) {
    const suggestionsBox = document.getElementById('searchSuggestions');
    if (!suggestionsBox) return;

    if (query.length === 0) {
      suggestionsBox.style.display = 'none';
      return;
    }

    // Find matching sages
    const matches = (window.graphData?.nodes || [])
      .filter(n => n.label.toLowerCase().includes(query))
      .slice(0, 8); // Limit to 8 results

    if (matches.length === 0) {
      suggestionsBox.innerHTML = '<div style="padding: 1rem; text-align: center; color: #999;">אין חכמים תואמים</div>';
      suggestionsBox.style.display = 'block';
      return;
    }

    // Build suggestions HTML
    const html = matches.map(sage => `
      <div onclick="window.graphNetwork && window.graphNetwork.selectNode({id: '${sage.id}', label: '${sage.label}'})">
        <span>${sage.label}</span>
        <span class="suggestion-era">${sage.era || sage.group || ''}</span>
      </div>
    `).join('');

    suggestionsBox.innerHTML = html;
    suggestionsBox.style.display = 'block';
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

    console.log('✅ selectNode called:', { id: node.id, label: node.label });

    this.selectedNode = node;
    const nodeId = String(node.id);
    const nodeEra = node.group || node.era_key;

    // Apply connection filter if active
    if (this.connectionFilter !== 'all') {
      this.updateConnectionFilters();
    }

    // Highlight selected node + entire era
    if (this.node) {
      this.node.classed('selected', d => String(d.id) === nodeId);
      this.node.classed('era-highlight', d => (d.group || d.era_key) === nodeEra);

      // Dim non-era nodes
      this.node.style('opacity', d => (d.group || d.era_key) === nodeEra ? 1 : 0.3);
    }

    // Also dim links from other eras
    if (this.link) {
      this.link.style('opacity', d => {
        const sourceEra = (d.source.group || d.source.era_key);
        const targetEra = (d.target.group || d.target.era_key);
        return (sourceEra === nodeEra && targetEra === nodeEra) ? 0.6 : 0.1;
      });
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

    // Get connection strength for related sages
    const getConnectionStrength = (sageId, connectedId) => {
      const link = (this.data.links || [])
        .find(l => {
          const sourceId = String(l.source?.id || l.source || '');
          const targetId = String(l.target?.id || l.target || '');
          return (sourceId === sageId && targetId === connectedId) ||
                 (sourceId === connectedId && targetId === sageId);
        });
      return link?.strength || 0;
    };

    // Helper to render strength stars
    const renderStrengthStars = (strength) => {
      const filled = '★'.repeat(strength);
      const empty = '☆'.repeat(5 - strength);
      return `<span style="color: #f39c12; font-size: 0.9rem;">${filled}${empty}</span>`;
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
          padding: 1rem 1rem;
          text-align: center;
          margin: 0.5rem;
          min-height: auto;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          position: relative;
        ">
          <!-- Minimize Button -->
          <button onclick="document.getElementById('sidebar').classList.toggle('minimized'); return false;" style="
            position: absolute;
            top: 8px;
            left: 8px;
            background: ${eraColor} !important;
            border: none !important;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
          " title="כווץ">⌄</button>

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
              margin: 0.75rem 0 0.25rem 0;
              font-size: 1.5rem;
              font-weight: 800;
              color: ${eraColor};
              line-height: 1.2;
              font-family: 'Frank Ruhl Libre', serif;
            ">
              ${profile.label || profile.name_he}
            </h2>

            <!-- Period + Region -->
            <div style="
              margin: 0.75rem 0;
              padding: 0.75rem;
              background: white;
              border-radius: 12px;
              border: 1px solid rgba(0, 0, 0, 0.1);
              font-size: 0.8rem;
            ">
              <div style="color: #666; margin-bottom: 0.25rem;">
                📅 ${profile.period || 'לא ידוע'}
              </div>
              <div style="color: #666;">
                📍 ${profile.region || profile.location || 'לא ידוע'}
              </div>
            </div>

            <!-- Field -->
            ${profile.primary_field ? `
              <div style="
                font-size: 0.9rem;
                color: ${eraColor};
                font-weight: 600;
                margin-bottom: 0.75rem;
              ">
                🎓 ${profile.primary_field}
              </div>
            ` : ''}
          </div>

          <!-- ID at Bottom - Large & Bold -->
          <div style="
            width: 100%;
            padding-top: 0.75rem;
            border-top: 2px dashed ${eraColor}40;
            font-size: 1.8rem;
            font-weight: 900;
            color: ${eraColor};
            font-family: 'Courier New', monospace;
            letter-spacing: 1px;
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

        ${RESEARCH_BY_SAGE[String(profile.id)] && RESEARCH_BY_SAGE[String(profile.id)].length > 0 ? `
          <div class="sidebar-section" style="background: linear-gradient(135deg, #e3f2fd 0%, #f3f5fd 100%); padding: 1rem; border-left: 4px solid #2196f3; border-radius: 4px; cursor: pointer;"
               onclick="document.getElementById('researchContent-${profile.id}').style.display = document.getElementById('researchContent-${profile.id}').style.display === 'none' ? 'block' : 'none';">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <h4 style="margin: 0; color: #1565c0; font-weight: 700;">📖 מחקר זמין</h4>
              <span style="font-size: 1.2rem; color: #1565c0;">▼</span>
            </div>
            <p style="margin: 0; font-size: 0.9rem; color: #0d47a1;">${RESEARCH_BY_SAGE[String(profile.id)].length} מסמכי מחקר - לחץ לצפייה</p>
            <div id="researchContent-${profile.id}" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #2196f350; max-height: 400px; overflow-y: auto;">
              <div style="color: #666; font-size: 0.85rem;">טוען מחקר...</div>
            </div>
          </div>
        ` : ''}

        ${LESSON_PLAN_MAP[String(profile.id)] ? `
          <div class="sidebar-section" style="background: linear-gradient(135deg, #fff59d 0%, #fffde7 100%); padding: 1rem; border-left: 4px solid #fbc02d; border-radius: 4px; cursor: pointer;"
               onclick="document.getElementById('lessonPlanContent-${profile.id}').style.display = document.getElementById('lessonPlanContent-${profile.id}').style.display === 'none' ? 'block' : 'none';">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
              <h4 style="margin: 0; color: #f57f17; font-weight: 700;">📚 יש שיעור זמין!</h4>
              <span style="font-size: 1.2rem; color: #f57f17;">▼</span>
            </div>
            <p style="margin: 0; font-size: 0.9rem; color: #e65100;">לחץ לפתיחת שיעור 45 דקות עם שאלות דיון</p>
            <div id="lessonPlanContent-${profile.id}" style="display: none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #fbc02d50; max-height: 400px; overflow-y: auto;">
              <div style="color: #666; font-size: 0.85rem;">טוען שיעור...</div>
            </div>
          </div>
        ` : ''}

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
                  const strength = getConnectionStrength(nodeId, String(n.id));
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
                      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <div style="font-weight: 700; color: #1a1a1a; font-size: 1.05rem; flex: 1;">
                          ${n.label}
                        </div>
                        ${strength > 0 ? `<div style="margin-right: 0.5rem; color: #f39c12; font-size: 0.85rem;">★${strength}</div>` : ''}
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

    // Load lesson plan if available
    if (LESSON_PLAN_MAP[String(profile.id)]) {
      this.loadLessonPlanContent(profile.id);
    }

    // Load research if available
    if (RESEARCH_BY_SAGE[String(profile.id)] && RESEARCH_BY_SAGE[String(profile.id)].length > 0) {
      this.loadResearchContent(profile.id);
    }

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
   * Deselect node by clicking background
   */
  deselectNode() {
    this.closeSidebar();
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
      this.node.classed('selected', false).classed('related', false).classed('era-highlight', false);
      this.node.style('opacity', 0.9);
    }

    if (this.link) {
      this.link.classed('active', false)
        .style('opacity', 0.5)
        .style('stroke-width', 2);
    }

    this.selectedNode = null;

    // Notify mobile handler if available
    if (window.mobileHandler && window.mobileHandler.isCurrentlyMobile()) {
      window.mobileHandler.closeSidebar();
    }
  }

  /**
   * Load and display lesson plan content
   */
  async loadLessonPlanContent(sageId) {
    const contentDiv = document.getElementById(`lessonPlanContent-${sageId}`);
    if (!contentDiv) return;

    try {
      const lesson = await loadLessonPlan(sageId);
      if (!lesson) return;

      // Parse markdown to basic HTML (simple conversion)
      let html = lesson.markdown
        .replace(/^### (.+)$/gm, '<h4 style="margin-top: 1rem; color: #f57f17; font-weight: 700;">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 style="margin-top: 1rem; font-weight: 700; font-size: 1.1rem;">$1</h3>')
        .replace(/^\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^> (.+)$/gm, '<blockquote style="margin-left: 1rem; padding-left: 1rem; border-left: 3px solid #f57f17; font-style: italic; color: #666;">$1</blockquote>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^- (.+)$/gm, '<li style="margin-left: 1.5rem;">$1</li>')
        .replace(/\n/g, '<br>');

      contentDiv.innerHTML = `
        <div style="line-height: 1.6; font-size: 0.9rem; color: #333;">
          <p>${html}</p>
        </div>
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #fbc02d50;">
          <a href="notes/${lesson.folder}/lesson_plan.md" target="_blank"
             style="color: #f57f17; text-decoration: none; font-weight: 600;">
            📖 קרא את השיעור המלא →
          </a>
        </div>
      `;
    } catch (e) {
      console.error('Error loading lesson plan:', e);
      contentDiv.innerHTML = '<div style="color: #999;">לא הצלחנו לטעון את השיעור</div>';
    }
  }

  /**
   * Load and display research content
   */
  async loadResearchContent(sageId) {
    const contentDiv = document.getElementById(`researchContent-${sageId}`);
    if (!contentDiv) return;

    try {
      const researchDocs = RESEARCH_BY_SAGE[String(sageId)];
      if (!researchDocs || researchDocs.length === 0) return;

      let html = '<div style="line-height: 1.6; font-size: 0.9rem; color: #333;">';

      researchDocs.forEach((doc, idx) => {
        html += `
          <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #2196f330;">
            <h5 style="margin: 0 0 0.5rem 0; color: #1565c0; font-size: 0.95rem;">📄 ${doc.title}</h5>
            ${doc.summary ? `<p style="margin: 0; color: #555; font-size: 0.85rem;">${doc.summary}</p>` : ''}
          </div>
        `;
      });

      html += '</div>';
      contentDiv.innerHTML = html;
    } catch (e) {
      console.error('Error loading research:', e);
      contentDiv.innerHTML = '<div style="color: #999;">לא הצלחנו לטעון את המחקר</div>';
    }
  }

  /**
   * Apply filters to graph
   */
  applyFilters() {
    const eraFilter = document.getElementById('eraFilter')?.value || '';
    const regionFilter = document.getElementById('regionFilter')?.value || '';
    const fieldFilter = document.getElementById('fieldFilter')?.value || '';

    if (!this.node) return;

    // Filter nodes
    const filtered = new Set();
    this.data.nodes.forEach(sage => {
      let matches = true;

      if (eraFilter && sage.era !== eraFilter) matches = false;
      if (regionFilter && !(sage.location && sage.location.includes(regionFilter))) matches = false;
      if (fieldFilter && sage.field !== fieldFilter) matches = false;

      if (matches) filtered.add(String(sage.id));
    });

    // Get era color function - use the eraColors defined in renderGraph
    const getEraColor = (d) => {
      if (!d.era) return '#999999';
      // eraColors mapping by Hebrew era names
      const eraColorMap = {
        'בית שני': '#8e44ad',
        'תנאים': '#e74c3c',
        'אמוראים': '#e67e22',
        'גאונים': '#f1c40f',
        'ראשונים': '#27ae60',
        'אחרונים': '#2980b9',
        'עת חדשה': '#1abc9c'
      };
      return eraColorMap[d.era] || '#999999';
    };

    // Apply opacity + highlight filtered nodes with strong visual emphasis
    // Include fill color in the same chain
    this.node
      .style('fill', d => getEraColor(d)) // 🎨 ALWAYS COLOR BY ERA
      .style('opacity', d => {
        if (filtered.size === 0 || filtered.size === this.data.nodes.length) {
          return 0.8; // Normal state
        }
        // Strong contrast: selected bright, others very dim
        return filtered.has(String(d.id)) ? 1 : 0.08; // 0.08 = very dimmed
      })
      .style('fill-opacity', d => {
        if (filtered.size === 0 || filtered.size === this.data.nodes.length) {
          return 0.85;
        }
        // Selected: full saturation | Dimmed: reduced
        return filtered.has(String(d.id)) ? 0.95 : 0.3;
      })
      .style('stroke', d => {
        if (filtered.size === 0 || filtered.size === this.data.nodes.length) {
          return 'none'; // No filter active
        }
        // Gold highlight only for selected
        return filtered.has(String(d.id)) ? '#FFD700' : '#eee'; // Light gray border for dimmed
      })
      .style('stroke-width', d => {
        if (filtered.size === 0 || filtered.size === this.data.nodes.length) {
          return '0';
        }
        // Selected: thick | Dimmed: very thin
        return filtered.has(String(d.id)) ? '5px' : '0.5px';
      })
      .style('filter', d => {
        if (filtered.size === 0 || filtered.size === this.data.nodes.length) {
          return 'none';
        }
        // Glow only for selected nodes
        return filtered.has(String(d.id))
          ? 'drop-shadow(0 0 12px rgba(255, 215, 0, 1)) drop-shadow(0 0 6px rgba(255, 235, 100, 0.8))'
          : 'none';
      });

    if (filtered.size > 0) {
      console.log(`✨ FILTERED: ${filtered.size}/${this.data.nodes.length} sages`);
      console.log(`   ✓ Selected sages: 100% opacity + era colors (bright)`);
      console.log(`   ✓ Dimmed sages: 8% opacity + era colors (pale ghost)`);
      console.log(`   ✓ Relevant connections: 100% opacity + colors`);
      console.log(`   ✓ Irrelevant connections: 2% opacity (nearly invisible)`);
    } else {
      console.log(`✅ No filter: All ${this.data.nodes.length} sages visible with era colors`);
    }

    if (this.link) {
      this.link
        .style('opacity', d => {
          if (filtered.size === 0 || filtered.size === this.data.nodes.length) {
            return 0.6; // Normal link opacity
          }
          const srcMatch = filtered.has(String(d.source.id || d.source));
          const tgtMatch = filtered.has(String(d.target.id || d.target));
          // Relevant: bright | Not relevant: invisible
          return (srcMatch && tgtMatch) ? 1 : 0.02; // 0.02 = extremely faint
        })
        .style('stroke-width', d => {
          if (filtered.size === 0 || filtered.size === this.data.nodes.length) {
            return this.connectionWidths[d.type] || 2;
          }
          const srcMatch = filtered.has(String(d.source.id || d.source));
          const tgtMatch = filtered.has(String(d.target.id || d.target));
          // Relevant: bold | Not relevant: thin
          return (srcMatch && tgtMatch) ? (this.connectionWidths[d.type] + 2) : 0.3;
        })
        .style('stroke', d => {
          if (filtered.size === 0 || filtered.size === this.data.nodes.length) {
            // Normal state - use connection type color
            return this.connectionColors[d.type] || '#999';
          }
          const srcMatch = filtered.has(String(d.source.id || d.source));
          const tgtMatch = filtered.has(String(d.target.id || d.target));
          // Relevant: keep color | Not relevant: very dim gray
          if (srcMatch && tgtMatch) {
            return this.connectionColors[d.type] || '#999';
          } else {
            return '#ddd'; // Very light gray for irrelevant connections
          }
        });
    }

    // 🎯 ENHANCED: Focus-based clustering - strong pull to center with visual emphasis
    if (this.simulation && filtered.size > 0 && filtered.size < this.data.nodes.length) {
      const centerX = this.width / 2;
      const centerY = this.height / 2;

      // Add STRONG centering force for filtered nodes - pulls them toward center
      this.simulation.force('centerFiltered', d3.forceX(d => {
        return filtered.has(String(d.id)) ? centerX : d.x;
      }).strength(0.6)) // Increased from 0.3 to 0.6 for stronger pull
      .force('centerFilteredY', d3.forceY(d => {
        return filtered.has(String(d.id)) ? centerY : d.y;
      }).strength(0.6)); // Increased from 0.3 to 0.6

      // Also add collision avoidance for filtered nodes
      this.simulation.force('collideFiltered', d3.forceCollide(d => {
        return filtered.has(String(d.id)) ? 35 : 25; // Larger radius for filtered nodes
      }).strength(0.8));

      // Restart simulation with aggressive focus
      this.simulation.alpha(0.8).restart(); // Increased alpha (0.5 → 0.8) for more dramatic effect

      console.log(`✨ STRONG FOCUS: ${filtered.size} sages clustering to center with enhanced highlighting!`);
    } else if (this.simulation && filtered.size === this.data.nodes.length) {
      // All nodes visible - reset to normal layout
      this.simulation.force('centerFiltered', null)
        .force('centerFilteredY', null)
        .force('collideFiltered', d3.forceCollide(d => 25).strength(0.5))
        .alpha(0.3).restart();

      console.log(`🔄 Filter reset: All ${this.data.nodes.length} sages visible`);
    }
  }

  /**
   * Helper: Check if a node is dimmed by filters
   */
  _isNodeDimmed(node, eraFilter, regionFilter, fieldFilter) {
    if (eraFilter && node.era !== eraFilter) return true;
    if (regionFilter && !(node.location && node.location.includes(regionFilter))) return true;
    if (fieldFilter && node.field !== fieldFilter) return true;
    return false;
  }

  /**
   * Open path finder modal
   */
  openPathFinder() {
    const modal = document.getElementById('path-finder-modal');
    if (modal) {
      modal.style.display = 'block';
      document.getElementById('sage1-search').focus();
    }
  }

  /**
   * Find path between two sages via UI
   */
  async findPathBetweenSages() {
    const sage1Input = document.getElementById('sage1-search').value.trim();
    const sage2Input = document.getElementById('sage2-search').value.trim();

    if (!sage1Input || !sage2Input) {
      alert('בחר 2 חכמים');
      return;
    }

    // Find matching sages
    const sage1 = this.data.nodes.find(n => n.label.includes(sage1Input));
    const sage2 = this.data.nodes.find(n => n.label.includes(sage2Input));

    if (!sage1 || !sage2) {
      alert('לא נמצא חכם עם שם זה');
      return;
    }

    const path = this.findPath(sage1.id, sage2.id);
    const resultDiv = document.getElementById('path-result');

    if (path) {
      const pathNames = path.map(id => {
        const sage = this.data.nodes.find(n => String(n.id) === String(id));
        return sage ? sage.label : '?';
      });

      document.getElementById('path-text').textContent = `✅ קשר נמצא (${path.length - 1} שלבים): ${pathNames.join(' ← ')}`;
      resultDiv.style.display = 'block';

      this.highlightPath(path);
    } else {
      document.getElementById('path-text').textContent = '❌ לא נמצא קשר בין שני החכמים';
      resultDiv.style.display = 'block';
      resultDiv.style.background = '#fff3cd';
    }
  }

  /**
   * Find shortest path between two sages using BFS
   */
  findPath(sourceId, targetId) {
    if (!this.data || !this.data.links) return null;

    const sageIds = new Set(this.data.nodes.map(n => String(n.id)));
    if (!sageIds.has(String(sourceId)) || !sageIds.has(String(targetId))) {
      return null;
    }

    // Build adjacency list
    const graph = {};
    sageIds.forEach(id => graph[id] = []);
    this.data.links.forEach(link => {
      const src = String(link.source);
      const tgt = String(link.target);
      if (graph[src]) graph[src].push(tgt);
      if (graph[tgt]) graph[tgt].push(src);  // Bidirectional
    });

    // BFS
    const queue = [[String(sourceId)]];
    const visited = new Set([String(sourceId)]);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === String(targetId)) {
        return path;
      }

      for (const neighbor of (graph[current] || [])) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    return null;  // No path found
  }

  /**
   * Highlight path in graph
   */
  highlightPath(path) {
    if (!path || path.length < 2) return;

    // Reset all links
    this.link.style('stroke', d => {
      const type = d.type || 'unknown';
      return this.getLinkColor(type);
    }).style('stroke-width', 2).style('opacity', 0.5);

    // Highlight path links
    const pathSet = new Set(path);
    this.link.filter(d => {
      const src = String(d.source.id || d.source);
      const tgt = String(d.target.id || d.target);
      return (pathSet.has(src) && pathSet.has(tgt));
    })
    .style('stroke', '#2ecc71')
    .style('stroke-width', 4)
    .style('opacity', 1);

    // Highlight path nodes
    if (this.node) {
      this.node.style('opacity', d => pathSet.has(String(d.id)) ? 1 : 0.2);
    }

    console.log(`✅ Path found: ${path.length} sages (${path.length - 1} steps)`);
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

// Export for ES6 modules
export { SageNetwork };
