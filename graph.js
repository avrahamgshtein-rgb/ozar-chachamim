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

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.data) {
          throw new Error('Data loading timeout (5s)');
        }
      }, 5000);

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

    // TASK B: Add SVG marker definitions for directed links
    const defs = svg.append('defs');

    // Arrow markers for each link type
    const linkTypeColors = {
      'student': '#4ecdc4',      // Teal
      'influence': '#8b7965',    // Dark grey/brown
      'oppose': '#ff6b6b',       // Red
      'colleague': '#95e1d3',    // Cyan
      'predecessor': '#f9ca24',  // Yellow
      'precursor': '#f9ca24'     // Yellow
    };

    Object.entries(linkTypeColors).forEach(([type, color]) => {
      // Arrow marker for line endings
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('markerWidth', 13)
        .attr('markerHeight', 13)
        .attr('refX', 12)
        .attr('refY', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M 0 0 L 12 6 L 0 12 Z')
        .attr('fill', color)
        .attr('opacity', 0.6);
    });

    // TASK B: Chronological X-position force (enhanced)
    // Sages positioned left-to-right by era (ancient → modern)
    // Uses period_order from database for precise chronological sequence
    const xForce = d3.forceX()
      .x(d => {
        // Primary: use period_order if available
        if (d.period_order !== undefined && d.period_order !== null) {
          const maxOrder = Math.max(...this.data.nodes.map(n => n.period_order || 0));
          return (d.period_order / maxOrder) * width;
        }
        // Fallback: use era_key order
        const eraIndex = this.eraOrder[d.group] !== undefined ? this.eraOrder[d.group] : 3.5;
        return (eraIndex / 7) * width;
      })
      .strength(0.25);  // Stronger force for clearer historical layout

    // DEFENSIVE: Validate links before D3 processes them
    const validNodeIds = new Set(this.data.nodes.map(n => String(n.id)));
    const validLinks = (this.data.links || []).filter(link => {
      const sourceId = String(link.source || link.source === 0 ? link.source : '');
      const targetId = String(link.target || link.target === 0 ? link.target : '');

      if (!validNodeIds.has(sourceId)) {
        console.warn(`⚠️  Link source not found: ${sourceId} (target: ${targetId})`);
        return false;
      }
      if (!validNodeIds.has(targetId)) {
        console.warn(`⚠️  Link target not found: ${targetId} (source: ${sourceId})`);
        return false;
      }
      return true;
    });

    console.log(`✓ Links validated: ${validLinks.length}/${this.data.links?.length || 0} valid`);

    // Initialize force simulation with validated links
    this.simulation = d3.forceSimulation(this.data.nodes)
      .force('link', d3.forceLink(validLinks)
        .id(d => String(d.id))
        .distance(100)
        .strength(0.3))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(32))
      .force('x', xForce);  // Add chronological ordering

    // TASK B: Render links as curved paths with type-based styling
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(validLinks)
      .enter()
      .append('path')
      .attr('class', d => `link link-${d.type}`)
      .attr('fill', 'none')
      .attr('stroke', d => {
        const colorMap = {
          'student': '#4ecdc4',           // Teal - teacher-student
          'influence': '#8b7965',         // Dark grey - intellectual influence
          'oppose': '#ff6b6b',            // Red - disagreement
          'colleague': '#95e1d3',         // Cyan - peers
          'predecessor': '#f9ca24',       // Yellow - succession
          'precursor': '#f9ca24'          // Yellow - precursor
        };
        return colorMap[d.type] || '#999999';
      })
      .attr('stroke-width', d => {
        // Higher weight for teacher-student relationships
        if (d.type === 'student') return 2.5;
        if (d.type === 'influence') return 2;
        return 1.5;
      })
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('marker-end', d => `url(#arrow-${d.type})`)
      .attr('opacity', 0.6)
      .style('cursor', 'pointer')
      // Hover effects
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-width', d => {
            if (d.type === 'student') return 4;
            if (d.type === 'influence') return 3;
            return 2.5;
          })
          .attr('opacity', 1);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('stroke-width', d => {
            if (d.type === 'student') return 2.5;
            if (d.type === 'influence') return 2;
            return 1.5;
          })
          .attr('opacity', 0.6);
      });

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

    // TASK B: Update positions on simulation tick with curved paths
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

    // TASK E: Build research content section (enriched with full-text display)
    const researchSection = profile.research ? `
      <div class="sidebar-section" style="background: #f5f8fb; padding: 1rem; border-radius: 8px; border-left: 4px solid #2196F3;">
        <h3 style="margin-top: 0; color: #1976D2;">📚 Research Document</h3>
        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
            <span><strong>📄 ${profile.research.source_file || 'Research Document'}</strong></span>
            <span style="color: #999;">${profile.research.word_count || 0} words</span>
          </div>
          ${profile.research.content_type ? `<div style="color: #888; font-size: 0.8rem;">Type: ${profile.research.content_type}</div>` : ''}
        </div>

        <!-- TASK E: Full-text research content display -->
        <div style="background: white; padding: 0.75rem; border-radius: 4px; max-height: 200px; overflow-y: auto; line-height: 1.6; font-size: 0.9rem; color: #333; direction: rtl; text-align: right;">
          ${profile.research.content_text
            ? `<p style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(profile.research.content_text.substring(0, 400))}</p>`
            : '<p style="margin: 0; color: #aaa; font-style: italic;">No content available</p>'}
        </div>

        <!-- TASK E: Link to full research view -->
        <a href="research-view.html?sage=${profile.id}"
           style="display: inline-block; margin-top: 0.75rem; padding: 0.6rem 1rem; background: #2196F3; color: white; text-decoration: none; border-radius: 6px; font-size: 0.9rem; font-weight: 600; transition: all 0.2s; cursor: pointer; width: 100%; text-align: center; box-sizing: border-box;"
           onmouseover="this.style.background='#1976D2'"
           onmouseout="this.style.background='#2196F3'">
          📖 Read Full Research
        </a>
      </div>
    ` : '';

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

    // Build complete sidebar HTML
    const html = `
      <button class="sidebar-close">
        <i class="fas fa-times"></i>
      </button>
      <div class="sidebar-header">
        <h2>${profile.label || profile.name_he}</h2>
        <div class="sidebar-meta">
          <div class="sidebar-meta-item">
            <i class="fas fa-calendar"></i> ${profile.era || 'Unknown'}
          </div>
          <div class="sidebar-meta-item">
            <i class="fas fa-map-pin"></i> ${profile.region || profile.location || 'Unknown'}
          </div>
          <div class="sidebar-meta-item">
            <i class="fas fa-book"></i> ${profile.primary_field || profile.field || 'Other'}
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
            <h4>💡 Core Concept</h4>
            <p style="margin: 0; font-style: italic; color: #e65100;">${profile.core_concept}</p>
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

    sidebar.innerHTML = html;
    sidebar.classList.add('active');

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
