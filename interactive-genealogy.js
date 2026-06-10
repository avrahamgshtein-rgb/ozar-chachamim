/**
 * INTERACTIVE GENEALOGICAL DIAGRAM
 * 323 Jewish sages in draggable boxes
 * Organized by Era + Region
 * Teacher-Student connections visible
 * Full draggable interface
 */

class InteractiveGenealogy {
  constructor(config = {}) {
    this.svgSelector = config.svgSelector || '#graph';
    this.data = null;
    this.boxes = []; // Draggable box elements
    this.selectedBox = null;

    this.colorMap = {
      'second-temple': '#8e44ad',
      'tannaim': '#e74c3c',
      'amoraim': '#e67e22',
      'geonim': '#f1c40f',
      'rishonim': '#27ae60',
      'acharonim': '#2980b9',
      'modern': '#1abc9c',
      'unknown': '#999999'
    };

    // Box dimensions
    this.BOX_WIDTH = 280;
    this.BOX_HEIGHT = 140;
    this.MARGIN_X = 40;
    this.MARGIN_Y = 40;
    this.PADDING = 15;
  }

  async init() {
    if (window.graphData && window.graphData.nodes && window.graphData.nodes.length > 0) {
      this.data = window.graphData;
      console.log('✓ Interactive genealogy found data');
      this._initializeDiagram();
      return;
    }

    console.log('⏳ Waiting for Supabase data...');
    document.addEventListener('supabaseReady', () => {
      this.data = window.graphData;
      this._initializeDiagram();
    }, { once: true });

    setTimeout(() => {
      if (!this.data) {
        console.error('❌ Data loading timeout');
        this.showError('Failed to load data after 10 seconds');
      }
    }, 10000);
  }

  _initializeDiagram() {
    try {
      if (!this.data.nodes || this.data.nodes.length === 0) {
        throw new Error('No nodes in dataset');
      }

      console.log(`✓ Building interactive diagram: ${this.data.nodes.length} sages`);

      // Compute layout positions
      this.computeLayout();

      // Render the diagram
      this.render();

      // Expose as window.sageNetwork for path-finding integration
      window.sageNetwork = this;

      console.log(`✓ Interactive genealogy rendered`);
    } catch (error) {
      console.error('✗ Init failed:', error);
      this.showError('Failed to render diagram: ' + error.message);
    }
  }

  /**
   * Compute initial positions for all boxes
   * Group by Era, then by Region within each era
   */
  computeLayout() {
    // Group nodes by era
    const nodesByEra = {};
    for (const node of this.data.nodes) {
      const era = node.era_key || 'unknown';
      if (!nodesByEra[era]) {
        nodesByEra[era] = {};
      }
      const region = node.region || 'Unknown';
      if (!nodesByEra[era][region]) {
        nodesByEra[era][region] = [];
      }
      nodesByEra[era][region].push(node);
    }

    // Assign positions
    this.positions = new Map();
    let y = this.MARGIN_Y;

    for (const era in nodesByEra) {
      let x = this.MARGIN_X;
      const regions = nodesByEra[era];

      for (const region in regions) {
        const regionNodes = regions[region];

        for (let i = 0; i < regionNodes.length; i++) {
          const node = regionNodes[i];
          this.positions.set(node.id, {
            x: x,
            y: y + (i % 3) * (this.BOX_HEIGHT + 20)
          });

          if ((i + 1) % 3 === 0) {
            x += this.BOX_WIDTH + 30;
          }
        }
        y += 400; // Space between regions
      }
      y += 600; // Space between eras
    }

    console.log(`✓ Positioned ${this.positions.size} nodes`);
  }

  /**
   * Render the interactive diagram with force-directed layout
   */
  render() {
    const svg = d3.select(this.svgSelector);
    if (!svg.node()) {
      console.error('SVG not found');
      return;
    }

    const width = window.innerWidth - 20;
    const height = window.innerHeight - 100;

    svg
      .attr('width', width)
      .attr('height', height)
      .style('background', '#f8f6f0');

    svg.selectAll('*').remove();
    const g = svg.append('g');

    // Create force simulation
    const simulation = d3.forceSimulation(this.data.nodes)
      .force('link', d3.forceLink(this.data.links || [])
        .id(d => String(d.id))
        .distance(200)
        .strength(0.2))
      .force('charge', d3.forceManyBody().strength(-1200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(60));

    // Color map for connection types
    const connectionTypeColors = {
      'student': '#e74c3c',      // Red - teacher-student
      'teacher': '#3498db',      // Blue - teacher
      'colleague': '#2ecc71',    // Green - colleague
      'influence': '#f39c12',    // Orange - influence
      'traditional': '#9b59b6',  // Purple - traditional
      'family': '#e67e22',       // Dark orange - family
      'default': '#95a5a6'       // Gray - unknown
    };

    // Draw links first (teacher-student connections)
    const links = g.selectAll('.link')
      .data(this.data.links || [])
      .enter()
      .append('g')
      .attr('class', 'link-group')
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).select('line').attr('stroke-width', 3).attr('opacity', 0.8);
        d3.select(this).select('text').style('display', 'block');
      })
      .on('mouseout', function(event, d) {
        d3.select(this).select('line').attr('stroke-width', 1.5).attr('opacity', 0.5);
        d3.select(this).select('text').style('display', 'none');
      });

    // Add line to link group
    links.append('line')
      .attr('class', 'link')
      .attr('stroke', d => connectionTypeColors[d.type] || connectionTypeColors['default'])
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.5)
      .attr('stroke-dasharray', '5,5');

    // Add text label for link type
    links.append('text')
      .attr('class', 'link-label')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .attr('display', 'none')
      .text(d => d.type || 'קשר');

    // Draw nodes as circles with labels
    const nodes = g.selectAll('.node')
      .data(this.data.nodes)
      .enter()
      .append('circle')
      .attr('class', d => `node node-${d.era_key || 'unknown'}`)
      .attr('r', 32)
      .attr('fill', d => this.colorMap[d.era_key || 'unknown'] || '#999')
      .attr('stroke', 'white')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }))
      .on('click', (event, d) => {
        event.stopPropagation();
        this.selectNode(d);
      });

    // Add labels to nodes (Hebrew names in circles, English below)
    const labels = g.selectAll('.label')
      .data(this.data.nodes)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'Frank Ruhl Libre, serif')
      .attr('fill', 'white')
      .attr('pointer-events', 'none')
      .text(d => {
        // Show first 10 chars of Hebrew name
        const name = d.name_he || d.label || '';
        return name.substring(0, 10);
      });

    // Add English names below nodes
    const englishLabels = g.selectAll('.english-label')
      .data(this.data.nodes)
      .enter()
      .append('text')
      .attr('class', 'english-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '2em')
      .attr('font-size', '9px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('fill', '#666')
      .attr('pointer-events', 'none')
      .text(d => d.name_en ? d.name_en.substring(0, 15) : '');

    // Update on simulation tick
    simulation.on('tick', () => {
      // Update links with text labels
      links.select('line')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      // Update link labels (position at midpoint)
      links.select('text')
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      nodes
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      labels
        .attr('x', d => d.x)
        .attr('y', d => d.y);

      englishLabels
        .attr('x', d => d.x)
        .attr('y', d => d.y + 45);
    });

    // Add zoom/pan
    svg.call(d3.zoom()
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      }));

    this.node = nodes;
    this.simulation = simulation;
    console.log('✓ Force-directed network rendered');
  }

  /**
   * Draw teacher-student connection lines
   */
  drawConnections(g) {
    if (!this.data.links || this.data.links.length === 0) return;

    // Arrow marker
    const svg = d3.select(this.svgSelector);
    const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');

    defs.append('marker')
      .attr('id', 'arrow')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 9)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3, 0 6')
      .attr('fill', '#999');

    // Draw lines for connections
    for (const link of this.data.links) {
      const sourcePos = this.positions.get(link.source);
      const targetPos = this.positions.get(link.target);

      if (!sourcePos || !targetPos) continue;

      const x1 = sourcePos.x + this.BOX_WIDTH / 2;
      const y1 = sourcePos.y + this.BOX_HEIGHT;
      const x2 = targetPos.x + this.BOX_WIDTH / 2;
      const y2 = targetPos.y;

      g.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', '#ccc')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,5')
        .attr('marker-end', 'url(#arrow)')
        .attr('opacity', 0.4)
        .attr('pointer-events', 'none');
    }
  }

  /**
   * Draw draggable boxes for each sage
   */
  drawBoxes(g) {
    const self = this;

    // Container group for each box
    const boxes = g.selectAll('.sage-box')
      .data(this.data.nodes)
      .enter()
      .append('g')
      .attr('class', 'sage-box')
      .attr('transform', d => {
        const pos = this.positions.get(d.id);
        return pos ? `translate(${pos.x},${pos.y})` : 'translate(0,0)';
      })
      .call(d3.drag()
        .on('start', function(event, d) {
          d3.select(this).raise().classed('active', true);
        })
        .on('drag', function(event, d) {
          d3.select(this).attr('transform', `translate(${event.x},${event.y})`);
        })
        .on('end', function(event, d) {
          d3.select(this).classed('active', false);
        })
      );

    // Box background
    boxes.append('rect')
      .attr('width', this.BOX_WIDTH)
      .attr('height', this.BOX_HEIGHT)
      .attr('rx', 8)
      .attr('fill', d => this.colorMap[d.group] || '#999')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('opacity', 0.95)
      .style('cursor', 'grab');

    // Hebrew name
    boxes.append('text')
      .attr('x', this.PADDING)
      .attr('y', 25)
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'Frank Ruhl Libre, serif')
      .attr('fill', 'white')
      .attr('text-anchor', 'start')
      .text(d => d.name_he || '')
      .attr('pointer-events', 'none');

    // English name (smaller)
    boxes.append('text')
      .attr('x', this.PADDING)
      .attr('y', 42)
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('fill', 'rgba(255,255,255,0.8)')
      .text(d => d.name_en || '')
      .attr('pointer-events', 'none');

    // Era + Region
    boxes.append('text')
      .attr('x', this.PADDING)
      .attr('y', 60)
      .attr('font-size', '9px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('fill', 'rgba(255,255,255,0.7)')
      .text(d => `${d.era} | ${d.region}`)
      .attr('pointer-events', 'none');

    // Field
    boxes.append('text')
      .attr('x', this.PADDING)
      .attr('y', 75)
      .attr('font-size', '9px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('fill', 'rgba(255,255,255,0.7)')
      .attr('font-weight', 'bold')
      .text(d => d.primary_field || 'Unknown')
      .attr('pointer-events', 'none');

    // Connection counts
    const teacherCount = d => this.data.links.filter(l => l.target === d.id).length;
    const studentCount = d => this.data.links.filter(l => l.source === d.id).length;

    boxes.append('text')
      .attr('x', this.PADDING)
      .attr('y', 95)
      .attr('font-size', '8px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('fill', 'rgba(255,255,255,0.6)')
      .text(d => `👨‍🏫 ${teacherCount(d)} | 👨‍🎓 ${studentCount(d)}`)
      .attr('pointer-events', 'none');

    // Summary (truncated)
    boxes.append('text')
      .attr('x', this.PADDING)
      .attr('y', 110)
      .attr('font-size', '8px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('fill', 'rgba(255,255,255,0.5)')
      .text(d => {
        const summary = d.summary || d.core_concept || '';
        return summary.substring(0, 35) + (summary.length > 35 ? '...' : '');
      })
      .attr('pointer-events', 'none');

    // Hover effect
    boxes.on('mouseover', function() {
      d3.select(this).select('rect')
        .transition()
        .duration(100)
        .attr('opacity', 1)
        .attr('stroke-width', 3);
    })
    .on('mouseout', function() {
      d3.select(this).select('rect')
        .transition()
        .duration(100)
        .attr('opacity', 0.95)
        .attr('stroke-width', 2);
    })
    .on('click', (event, d) => {
      event.stopPropagation();
      this.selectNode(d);
    });

    this.boxes = boxes;
    this.node = boxes;  // For path-finding compatibility
  }

  /**
   * Setup pan/zoom interaction
   */
  setupInteraction(svg, g) {
    const zoom = d3.zoom()
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
  }

  showError(message) {
    console.error(message);
    const svg = d3.select(this.svgSelector);
    svg.append('text')
      .attr('x', 10)
      .attr('y', 30)
      .attr('fill', 'red')
      .attr('font-size', '16px')
      .text(message);
  }

  /**
   * Select a node and show its sidebar details
   */
  selectNode(node) {
    if (!node || !node.id) {
      console.error('Invalid node');
      return;
    }

    this.selectedNode = node;

    // Call app's showNodeDetails if available
    if (window.app && window.app.showNodeDetails) {
      window.app.showNodeDetails(node);
      return;
    }
    const sidebar = document.getElementById('sidebar');

    // Build comprehensive sidebar with all enriched data
    const eraColor = this.colorMap[node.era_key] || this.colorMap['unknown'];

    const html = `
      <button class="sidebar-close" style="position: absolute; top: 10px; left: 10px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; padding: 0.5rem; z-index: 10;">
        <i class="fas fa-times"></i>
      </button>

      <div style="padding: 2rem 1.5rem; text-align: right;">
        <!-- Era Badge -->
        <span style="display: inline-block; background: ${eraColor}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">
          ${node.era || 'Unknown'}
        </span>

        <!-- Name -->
        <h2 style="margin: 1rem 0 0.5rem 0; font-size: 1.8rem; color: ${eraColor}; font-family: 'Frank Ruhl Libre', serif; line-height: 1.2;">
          ${node.label || 'Unknown'}
        </h2>

        <!-- Dates/Period -->
        ${node.dates ? `<p style="color: #e74c3c; font-weight: 600; margin: 0.5rem 0; font-size: 0.95rem;">📅 ${node.dates}</p>` : ''}

        <!-- Location/Region -->
        ${node.location ? `<p style="color: #3498db; margin: 0.5rem 0; font-size: 0.95rem;">📍 ${node.location}</p>` : ''}

        <!-- Primary Field -->
        ${node.field ? `<p style="color: #27ae60; margin: 0.5rem 0; font-size: 0.95rem;">🎓 ${node.field}</p>` : ''}

        <!-- Bio/Summary -->
        ${node.bio || node.summary ? `<div style="margin: 1.5rem 0; padding: 1rem; background: #f8f9fa; border-radius: 6px; font-size: 0.9rem; line-height: 1.6; color: #444; text-align: right;">
          ${node.bio || node.summary}
        </div>` : ''}

        <!-- Core Concept -->
        ${node.core_concept ? `<div style="background: #fff3cd; padding: 1rem; border-right: 4px solid ${eraColor}; margin: 1rem 0; border-radius: 4px; font-size: 0.9rem; text-align: right;">
          <strong>💡 רעיון מרכזי:</strong><br/>${node.core_concept}
        </div>` : ''}

        <!-- Related Figures -->
        ${node.related_sages ? `<div style="margin: 1rem 0; padding: 1rem; background: #e8f4f8; border-radius: 6px; font-size: 0.9rem; text-align: right;">
          <strong>🔗 דמויות קשורות:</strong><br/>${node.related_sages}
        </div>` : ''}

        <!-- Spotify Link -->
        ${node.spotify_url ? `<div style="margin: 1.5rem 0;">
          <a href="${node.spotify_url}" target="_blank" style="display: inline-block; background: #1DB954; color: white; padding: 0.5rem 1rem; border-radius: 20px; text-decoration: none; font-size: 0.85rem; font-weight: 600;">
            🎧 שמע בספוטיפיי
          </a>
        </div>` : ''}
      </div>
    `;

    sidebar.innerHTML = html;
    sidebar.classList.add('active');

    if (window.mobileHandler) {
      window.mobileHandler.openSidebar();
    }

    sidebar.querySelector('.sidebar-close').addEventListener('click', () => this.closeSidebar());
  }

  /**
   * Close the sidebar
   */
  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.remove('active');
      sidebar.innerHTML = '';
    }
    if (window.mobileHandler) {
      window.mobileHandler.closeSidebar();
    }
    this.selectedNode = null;
  }
}

// Export for module import
export { InteractiveGenealogy };
