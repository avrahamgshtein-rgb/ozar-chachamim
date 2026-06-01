/**
 * FIXED D3.js Force-Directed Network Graph
 * Bug Fixes: Colors, Spotify, Search, Chronology, Geography
 */

class SageNetwork {
  constructor(config = {}) {
    this.dataUrl = config.dataUrl || 'data.json';
    this.svgSelector = config.svgSelector || '#graph';
    this.searchSelector = config.searchSelector || '#searchInput';
    this.sidebarSelector = config.sidebarSelector || '#sidebar';

    // FIXED BUG 2: Dynamic color mapping by ERA
    this.colorMap = {
      'second-temple': '#ff7f0e',      // Orange
      'tannaim': '#2ca02c',             // Green
      'amoraim': '#d62728',             // Red
      'geonim': '#9467bd',              // Purple (using as stand-in)
      'rishonim': '#9467bd',            // Purple
      'acharonim': '#8c564b',           // Brown
      'modern': '#e377c2',              // Pink
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
   * Load data from global window.graphData (loaded by index.html)
   */
  async init() {
    try {
      // Wait for data to be available (loaded by DOMContentLoaded in index.html)
      let retries = 10;
      while (!window.graphData && retries > 0) {
        await new Promise(r => setTimeout(r, 100));
        retries--;
      }

      if (!window.graphData) {
        throw new Error('Failed to load master data after retries');
      }

      this.data = window.graphData;

      if (!this.data.nodes || this.data.nodes.length === 0) {
        throw new Error('No nodes in dataset');
      }

      console.log(`✓ Graph initialized: ${this.data.nodes.length} nodes + ${this.data.links?.length || 0} edges`);

      this.setupEventListeners();
      this.render();
    } catch (error) {
      console.error('✗ Graph init failed:', error);
      this.showError('Failed to load graph data: ' + error.message);
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
  }

  /**
   * Main rendering function - creates D3 graph with all fixes
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

    // FIX BUG 3: Add chronological X-position force
    // Sages are positioned left-to-right by era (ancient → modern)
    const xForce = d3.forceX()
      .x(d => {
        const eraIndex = this.eraOrder[d.group] !== undefined ? this.eraOrder[d.group] : 3.5;
        return (eraIndex / 7) * width;  // Spread across horizontal axis
      })
      .strength(0.15);  // Gentle force to maintain historical order

    // Initialize force simulation
    this.simulation = d3.forceSimulation(this.data.nodes)
      .force('link', d3.forceLink(this.data.links)
        .id(d => d.id)
        .distance(100)
        .strength(0.3))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(32))
      .force('x', xForce);  // Add chronological ordering

    // Render links
    const link = g.append('g')
      .selectAll('line')
      .data(this.data.links)
      .enter()
      .append('line')
      .attr('class', d => `link link-${d.type}`)
      .attr('stroke', d => {
        const colorMap = {
          'student': '#4ecdc4',
          'influence': '#8b7965',
          'oppose': '#ff6b6b',
          'colleague': '#95e1d3',
          'predecessor': '#f9ca24',
          'precursor': '#f9ca24'
        };
        return colorMap[d.type] || '#999';
      })
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.5);

    // FIX BUG 2: Render nodes with dynamic colors based on era
    const node = g.append('g')
      .selectAll('circle')
      .data(this.data.nodes)
      .enter()
      .append('circle')
      .attr('class', d => `node node-${d.group}`)
      .attr('r', 22)
      .attr('fill', d => {
        const groupKey = d.group || 'unknown';
        const color = this.colorMap[groupKey];

        if (!color && !this.loggedMissingColors[groupKey]) {
          console.warn(`⚠️  No color for era: "${groupKey}" (sage: ${d.label})`);
          this.loggedMissingColors[groupKey] = true;
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
        .attr('r', 28)
        .attr('stroke-width', 3);
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('r', 22)
        .attr('stroke-width', 2);
    });

    // Render labels
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

    // Store references
    this.svg = svg;
    this.g = g;
    this.node = node;
    this.link = link;
    this.labels = labels;

    console.log('✓ Graph rendered with chronological layout');
  }

  /**
   * FIX BUG 5: Search functionality - matches Hebrew text, highlights nodes
   */
  updateNodeVisibility() {
    if (!this.node || !this.link || !this.labels || !this.data) return;

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
    if (this.data.nodes) {
      this.data.nodes.forEach(d => {
        const nameMatch = d.label && d.label.toLowerCase().includes(query);
        const eraMatch = d.era && d.era.toLowerCase().includes(query);
        const fieldMatch = d.field && d.field.toLowerCase().includes(query);

        if (nameMatch || eraMatch || fieldMatch) {
          matchedIds.add(String(d.id));
        }
      });
    }

    console.log(`🔍 Found ${matchedIds.size} matching sages`);

    // Update visibility
    this.node
      .style('opacity', d => matchedIds.has(String(d.id)) ? 1 : 0.1)
      .attr('r', d => matchedIds.has(String(d.id)) ? 30 : 18)
      .attr('stroke-width', d => matchedIds.has(String(d.id)) ? 3 : 2);

    this.link
      .style('opacity', d => {
        const sourceMatch = matchedIds.has(String(d.source.id));
        const targetMatch = matchedIds.has(String(d.target.id));
        return (sourceMatch || targetMatch) ? 0.8 : 0.05;
      })
      .style('stroke-width', d => {
        const sourceMatch = matchedIds.has(String(d.source.id));
        const targetMatch = matchedIds.has(String(d.target.id));
        return (sourceMatch || targetMatch) ? 2.5 : 1.5;
      });

    this.labels.style('opacity', d => {
      return matchedIds.has(String(d.id)) ? 1 : 0.1;
    });
  }

  /**
   * FIX BUG 1: Select node and show sidebar with spotify_url
   */
  selectNode(node) {
    this.selectedNode = node;

    // Highlight node
    if (this.node) {
      this.node.classed('selected', d => d.id === node.id);
    }

    // Find connected sages
    const related = this.data.links
      .filter(l => l.source.id === node.id || l.target.id === node.id)
      .map(l => l.source.id === node.id ? l.target : l.source);

    // FIX BUG 1: Use spotify_url from node directly
    const spotifyUrl = node.spotify_url
      ? node.spotify_url
      : `https://open.spotify.com/search/${encodeURIComponent(node.label + ' jewish music')}`;

    // Log history if user is logged in
    if (window.sageAuth && window.sageAuth.user) {
      window.sageAuth.logHistory(node.id);
    }

    // Build sidebar HTML with bookmark button
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
            <i class="fas fa-map-pin"></i> ${node.location || 'Unknown'}
          </div>
          <div class="sidebar-meta-item">
            <i class="fas fa-book"></i> ${node.field || 'Other'}
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
          <a href="${spotifyUrl}" target="_blank" class="spotify-link">
            <i class="fab fa-spotify"></i> חפש ב-Spotify
          </a>
        </div>

        ${window.sageAuth && window.sageAuth.user ? `
          <div class="sidebar-section">
            <button id="bookmarkBtn" onclick="window.sageNetwork.toggleBookmark('${node.id}')"
              style="width: 100%; padding: 0.75rem; background: #ffb300; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
              <i class="fas fa-star"></i> שמור
            </button>
          </div>
        ` : ''}

        <div class="sidebar-section">
          <h3>קישורים (${related.length})</h3>
          <div class="related-sages">
            ${related.length > 0
              ? related.map(n => `
                  <div class="related-sage" onclick="window.sageNetwork.selectNode(window.sageNetwork.data.nodes.find(nd => nd.id === '${n.id}'))">
                    ${n.label}
                  </div>
                `).join('')
              : '<p style="color: #a0917d;">אין קישורים ישירים</p>'
            }
          </div>
        </div>
      </div>
    `;

    const sidebar = document.querySelector(this.sidebarSelector);
    sidebar.innerHTML = html;
    sidebar.classList.add('active');

    // Re-attach close listener
    sidebar.querySelector('.sidebar-close').addEventListener('click', () => this.closeSidebar());

    // Highlight connections in graph
    this.highlightConnections(node, related);
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.sageNetwork = new SageNetwork({
    dataUrl: 'data.json',
    svgSelector: '#graph',
    searchSelector: '#searchInput',
    sidebarSelector: '#sidebar'
  });

  window.sageNetwork.init();
});
