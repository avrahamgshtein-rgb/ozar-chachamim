/**
 * D3.js Force-Directed Network Graph for Ozar Chachamim
 * Renders interactive network of Jewish sages with search, filtering, and details sidebar
 */

class SageNetwork {
  constructor(config = {}) {
    this.dataUrl = config.dataUrl || 'data.json';
    this.svgSelector = config.svgSelector || '#graph';
    this.searchSelector = config.searchSelector || '#searchInput';
    this.sidebarSelector = config.sidebarSelector || '#sidebar';

    // Color mapping by era (support both formats)
    this.colorMap = {
      // Lowercase with hyphens (from data.json)
      'second-temple': '#ff7f0e',
      'tannaim': '#2ca02c',
      'amoraim': '#d62728',
      'rishonim': '#9467bd',
      'acharonim': '#8c564b',
      'tannaim-amoraim': '#2ca02c',
      'rishonim-acharonim': '#9467bd',
      'modern': '#e377c2',
      // Capitalized (from index-clean.html)
      'Second Temple': '#ff7f0e',
      'Tannaim': '#2ca02c',
      'Amoraim': '#d62728',
      'Rishonim': '#9467bd',
      'Acharonim': '#8c564b',
      'Modern': '#e377c2'
    };

    // Link color mapping by type
    this.linkColorMap = {
      'student': '#4ecdc4',
      'influence': '#8b7965',
      'oppose': '#ff6b6b',
      'colleague': '#95e1d3',
      'predecessor': '#f9ca24',
      'precursor': '#f9ca24'
    };

    this.data = null;
    this.simulation = null;
    this.selectedNode = null;
    this.searchQuery = '';
  }

  /**
   * Load data from JSON file and initialize the graph
   */
  async init() {
    try {
      const response = await fetch(this.dataUrl);
      this.data = await response.json();
      console.log(`✓ Loaded ${this.data.nodes.length} nodes and ${this.data.links.length} links`);

      this.setupEventListeners();
      this.render();
    } catch (error) {
      console.error('✗ Error loading data:', error);
      this.showError('Failed to load graph data');
    }
  }

  /**
   * Setup event listeners for search and UI interactions
   */
  setupEventListeners() {
    // Search input
    const searchInput = document.querySelector(this.searchSelector);
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        console.log('Search query:', this.searchQuery);
        this.updateNodeVisibility();
      });
    } else {
      console.warn('Search input not found:', this.searchSelector);
    }

    // Sidebar close button
    const closeBtn = document.querySelector('.sidebar-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeSidebar());
    }

    // Close sidebar on background click
    document.addEventListener('click', (e) => {
      if (e.target === document.querySelector(this.sidebarSelector)) {
        this.closeSidebar();
      }
    });
  }

  /**
   * Main rendering function - creates or updates the D3 graph
   */
  render() {
    const svg = d3.select(this.svgSelector);
    const svgNode = svg.node();

    if (!svgNode) {
      console.error('SVG element not found:', this.svgSelector);
      return;
    }

    const width = svgNode.clientWidth;
    const height = svgNode.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group for zooming
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Initialize force simulation
    this.simulation = d3.forceSimulation(this.data.nodes)
      .force('link', d3.forceLink(this.data.links)
        .id(d => d.id)
        .distance(80)
        .strength(0.3))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(28))
      .alpha(1);

    // Render links
    const link = g.append('g')
      .selectAll('line')
      .data(this.data.links)
      .enter()
      .append('line')
      .attr('class', d => `link link-${d.type}`)
      .attr('stroke', d => this.linkColorMap[d.type] || '#999')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.5);

    // Render nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(this.data.nodes)
      .enter()
      .append('circle')
      .attr('class', d => `node node-${d.group || d.era}`)
      .attr('r', 22)
      .attr('fill', d => {
        // Use 'group' from data.json first, fallback to 'era'
        const eraKey = d.group || d.era;
        const color = this.colorMap[eraKey];

        // Log missing colors only once per key
        if (!color && !this.loggedMissingColors) {
          this.loggedMissingColors = this.loggedMissingColors || {};
          if (!this.loggedMissingColors[eraKey]) {
            console.warn(`⚠️  No color mapping for: "${eraKey}" (sage: ${d.label})`);
            this.loggedMissingColors[eraKey] = true;
          }
        }

        return color || '#999';
      })
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        this.selectNode(d);
      })
      .call(d3.drag()
        .on('start', (event, d) => this.dragStart(event, d))
        .on('drag', (event, d) => this.drag(event, d))
        .on('end', (event, d) => this.dragEnd(event, d)));

    // Add hover effects
    node.on('mouseover', function() {
      d3.select(this)
        .attr('r', 22)
        .attr('stroke-width', 3);
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('r', 18)
        .attr('stroke-width', 2);
    });

    // Render labels (first 3 Hebrew chars)
    const labels = g.append('g')
      .selectAll('text')
      .data(this.data.nodes)
      .enter()
      .append('text')
      .attr('class', 'node-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('font-size', '10px')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none')
      .text(d => d.label.substring(0, 3));

    // Update positions on simulation tick
    this.simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      labels
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    // Store references for later manipulation
    this.svg = svg;
    this.g = g;
    this.node = node;
    this.link = link;
    this.labels = labels;

    // Reset zoom
    this.resetZoom(svg, zoom, width, height);
  }

  /**
   * Update node visibility based on search query
   */
  updateNodeVisibility() {
    if (!this.node || !this.link || !this.labels) {
      console.warn('Graph not fully initialized for search');
      return;
    }

    const query = this.searchQuery.trim();
    console.log('Search query:', query);

    if (query === '') {
      // Reset to full visibility
      this.node.style('opacity', 1);
      this.link.style('opacity', 0.5);
      this.labels.style('opacity', 1);
      return;
    }

    // Find matching nodes
    const matchedIds = new Set();
    this.data.nodes.forEach(d => {
      if (d.label.toLowerCase().includes(query) ||
          d.field.toLowerCase().includes(query) ||
          d.era.toLowerCase().includes(query)) {
        matchedIds.add(d.id);
      }
    });

    console.log(`Found ${matchedIds.size} matching sages`);

    // Update node visibility AND size
    this.node
      .style('opacity', d => {
        return matchedIds.has(d.id) ? 1 : 0.15;
      })
      .attr('r', d => {
        return matchedIds.has(d.id) ? 28 : 18;  // Larger for matches
      })
      .attr('stroke-width', d => {
        return matchedIds.has(d.id) ? 3 : 2;
      });

    // Update link visibility (show if either end matches)
    this.link
      .style('opacity', d => {
        const sourceMatch = matchedIds.has(d.source.id);
        const targetMatch = matchedIds.has(d.target.id);
        return (sourceMatch || targetMatch) ? 0.7 : 0.1;
      })
      .style('stroke-width', d => {
        const sourceMatch = matchedIds.has(d.source.id);
        const targetMatch = matchedIds.has(d.target.id);
        return (sourceMatch || targetMatch) ? 2.5 : 1.5;
      });

    // Update label visibility
    this.labels.style('opacity', d => {
      return matchedIds.has(d.id) ? 1 : 0.15;
    });
  }

  /**
   * Select a node and show its details in sidebar
   */
  selectNode(node) {
    this.selectedNode = node;

    // Highlight selected node
    if (this.node) {
      this.node.classed('selected', d => d.id === node.id);
    }

    // Update sidebar
    this.showSidebar(node);

    // Highlight connected nodes
    this.highlightConnections(node);
  }

  /**
   * Highlight nodes connected to selected node
   */
  highlightConnections(node) {
    if (!this.link) return;

    const connectedIds = new Set();
    this.data.links.forEach(link => {
      if (link.source.id === node.id) connectedIds.add(link.target.id);
      if (link.target.id === node.id) connectedIds.add(link.source.id);
    });

    this.link.classed('active', d =>
      d.source.id === node.id || d.target.id === node.id
    ).style('opacity', d =>
      d.source.id === node.id || d.target.id === node.id ? 0.8 : 0.2
    ).style('stroke-width', d =>
      d.source.id === node.id || d.target.id === node.id ? 2.5 : 1.5
    );

    this.node.classed('related', d => connectedIds.has(d.id))
      .style('opacity', d => {
        if (d.id === node.id) return 1;
        if (connectedIds.has(d.id)) return 1;
        return 0.3;
      });
  }

  /**
   * Display sidebar with node details
   */
  showSidebar(node) {
    const sidebar = document.querySelector(this.sidebarSelector);
    if (!sidebar) return;

    // Find connected sages
    const related = this.data.links
      .filter(l => l.source.id === node.id || l.target.id === node.id)
      .map(l => l.source.id === node.id ? l.target : l.source);

    // Build HTML
    // Use spotify query from data if available, otherwise generate
    const spotifyQuery = node.spotifyQuery || (node.label + ' jewish music');
    const html = `
      <button class="sidebar-close">
        <i class="fas fa-times"></i>
      </button>
      <div class="sidebar-header">
        <h2>${node.label}</h2>
        <div class="sidebar-meta">
          <div class="sidebar-meta-item">
            <i class="fas fa-calendar"></i> ${node.era}
          </div>
          <div class="sidebar-meta-item">
            <i class="fas fa-map-pin"></i> ${node.location}
          </div>
          <div class="sidebar-meta-item">
            <i class="fas fa-book"></i> ${node.field}
          </div>
        </div>
      </div>
      <div class="sidebar-content">
        <div class="sidebar-section">
          <h3>ביוגרפיה</h3>
          <p>${node.bio}</p>
        </div>

        <div class="sidebar-section">
          <h3>🎵 מוזיקה קשורה</h3>
          <a href="https://open.spotify.com/search/${encodeURIComponent(spotifyQuery)}"
             target="_blank"
             class="spotify-link">
            <i class="fab fa-spotify"></i> חפש בSpotify
          </a>
        </div>

        <div class="sidebar-section">
          <h3>קישורים (${related.length})</h3>
          <div class="related-sages">
            ${related.length > 0
              ? related.map(n => `
                  <div class="related-sage" onclick="window.sageNetwork.selectNode(window.sageNetwork.data.nodes.find(nd => nd.id === '${n.id}'))">
                    ${n.label}
                    <span style="font-size: 0.75rem; color: #a0917d;">→</span>
                  </div>
                `).join('')
              : '<p style="color: #a0917d;">אין קישורים ישירים</p>'
            }
          </div>
        </div>
      </div>
    `;

    sidebar.innerHTML = html;
    sidebar.classList.add('active');

    // Re-attach close listener
    sidebar.querySelector('.sidebar-close').addEventListener('click', () => this.closeSidebar());
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
  }

  /**
   * Drag event handlers for node manipulation
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
   * Reset zoom to default state
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
   * Show error message to user
   */
  showError(message) {
    const svg = document.querySelector(this.svgSelector);
    if (svg) {
      svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="red">${message}</text>`;
    }
  }
}

// Initialize graph when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.sageNetwork = new SageNetwork({
    dataUrl: 'data.json',
    svgSelector: '#graph',
    searchSelector: '#searchInput',
    sidebarSelector: '#sidebar'
  });

  window.sageNetwork.init();
});
