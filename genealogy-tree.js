/**
 * GENEALOGICAL TREE LAYOUT
 * Hierarchical visualization of Jewish sages with teacher-student relationships
 * Y-axis: Time (oldest → newest)
 * X-axis: Spatial distribution within each time period
 * Edges: Arrows showing teacher → student relationships
 */

class GenealogyTree {
  constructor(config = {}) {
    this.svgSelector = config.svgSelector || '#graph';
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

    this.selectedNode = null;
    this.data = null;
    this.nodeMap = new Map();
    this.positions = new Map(); // Store computed x,y for each node
  }

  async init() {
    if (window.graphData && window.graphData.nodes && window.graphData.nodes.length > 0) {
      this.data = window.graphData;
      console.log('✓ Genealogy tree found data in window.graphData');
      this._initializeTree();
      return;
    }

    console.log('⏳ [GenealogyTree] Waiting for Supabase data...');
    document.addEventListener('supabaseReady', () => {
      console.log('📦 [GenealogyTree] Data arrived from Supabase');
      this.data = window.graphData;
      this._initializeTree();
    }, { once: true });

    setTimeout(() => {
      if (!this.data) {
        console.error('❌ Data loading timeout');
        this.showError('Failed to load data after 10 seconds');
      }
    }, 10000);
  }

  _initializeTree() {
    try {
      if (!this.data.nodes || this.data.nodes.length === 0) {
        throw new Error('No nodes in dataset');
      }

      // Build node map for fast lookup
      this.nodeMap = new Map(this.data.nodes.map(n => [n.id, n]));

      // Compute layout positions
      this.computePositions();

      // Render the tree
      this.render();

      console.log(`✓ Genealogy tree rendered: ${this.data.nodes.length} nodes + ${this.data.links?.length || 0} relationships`);
    } catch (error) {
      console.error('✗ Tree init failed:', error);
      this.showError('Failed to render tree: ' + error.message);
    }
  }

  /**
   * Compute X,Y positions for all nodes
   * Y = based on period_order (time)
   * X = based on hierarchical layout within each time period
   */
  computePositions() {
    const PERIOD_HEIGHT = 120; // Vertical space per time period
    const REGION_WIDTH = 180; // Horizontal space per region/group
    const PADDING = 40;

    // Group nodes by period_order
    const nodesByPeriod = {};
    for (const node of this.data.nodes) {
      const period = Math.floor((node.period_order || 0) / 10) * 10;
      if (!nodesByPeriod[period]) {
        nodesByPeriod[period] = [];
      }
      nodesByPeriod[period].push(node);
    }

    // Compute positions
    for (const period in nodesByPeriod) {
      const periodNodes = nodesByPeriod[period];
      const y = parseInt(period) * (PERIOD_HEIGHT / 10);

      // Group by region
      const nodesByRegion = {};
      for (const node of periodNodes) {
        const region = node.region || 'Unknown';
        if (!nodesByRegion[region]) {
          nodesByRegion[region] = [];
        }
        nodesByRegion[region].push(node);
      }

      // Position within each region
      let x = PADDING;
      for (const region in nodesByRegion) {
        const regionNodes = nodesByRegion[region];
        for (let i = 0; i < regionNodes.length; i++) {
          const node = regionNodes[i];
          const offsetX = (i % 3) * 80 - 80; // 3 columns per region
          const offsetY = Math.floor(i / 3) * 60; // Multiple rows

          this.positions.set(node.id, {
            x: x + offsetX,
            y: y + offsetY,
            cx: x + offsetX,
            cy: y + offsetY
          });
        }
        x += REGION_WIDTH;
      }
    }

    console.log(`✓ Positioned ${this.positions.size} nodes`);
  }

  /**
   * Render the genealogical tree with D3
   */
  render() {
    const svg = d3.select(this.svgSelector);
    if (!svg.node()) {
      console.error('SVG not found');
      return;
    }

    // Clear previous content
    svg.selectAll('*').remove();

    // Set SVG dimensions
    const width = window.innerWidth - 20;
    const height = Math.max(3000, this.data.nodes.length * 10); // Dynamic height

    svg
      .attr('width', width)
      .attr('height', height)
      .style('background', '#f8f6f0');

    const g = svg.append('g').attr('transform', 'translate(0,0)');

    // Draw edges (teacher → student arrows) FIRST (behind nodes)
    this.drawEdges(g);

    // Draw nodes
    this.drawNodes(g);

    // Draw labels
    this.drawLabels(g);

    console.log('✓ Tree rendered with edges, nodes, and labels');
  }

  /**
   * Draw directed edges (teacher → student relationships)
   */
  drawEdges(g) {
    if (!this.data.links || this.data.links.length === 0) return;

    // Define arrow marker (only once)
    const svg = d3.select(this.svgSelector);
    const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs');

    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 9)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 10 3, 0 6')
      .attr('fill', '#888');

    // Draw lines for each connection
    for (const link of this.data.links) {
      const sourcePos = this.positions.get(link.source);
      const targetPos = this.positions.get(link.target);

      if (!sourcePos || !targetPos) continue; // Skip if nodes not positioned

      g.append('line')
        .attr('x1', sourcePos.x)
        .attr('y1', sourcePos.y)
        .attr('x2', targetPos.x)
        .attr('y2', targetPos.y)
        .attr('stroke', '#aaa')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,5')
        .attr('marker-end', 'url(#arrowhead)')
        .attr('opacity', 0.6);
    }
  }

  /**
   * Draw nodes (circles for sages)
   */
  drawNodes(g) {
    const nodes = g.selectAll('.node')
      .data(this.data.nodes)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('cx', d => {
        const pos = this.positions.get(d.id);
        return pos ? pos.x : 0;
      })
      .attr('cy', d => {
        const pos = this.positions.get(d.id);
        return pos ? pos.y : 0;
      })
      .attr('r', 28)
      .attr('fill', d => this.colorMap[d.group] || '#999')
      .attr('stroke', 'white')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', (event, d) => this.selectNode(d))
      .on('mouseover', function() {
        d3.select(this)
          .transition().duration(150)
          .attr('r', 36)
          .attr('stroke-width', 4);
      })
      .on('mouseout', function() {
        d3.select(this)
          .transition().duration(150)
          .attr('r', 28)
          .attr('stroke-width', 3);
      });
  }

  /**
   * Draw labels (sage names)
   */
  drawLabels(g) {
    g.selectAll('.node-label')
      .data(this.data.nodes)
      .enter()
      .append('text')
      .attr('class', 'node-label')
      .attr('x', d => {
        const pos = this.positions.get(d.id);
        return pos ? pos.x : 0;
      })
      .attr('y', d => {
        const pos = this.positions.get(d.id);
        return pos ? pos.y + 45 : 0;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('font-family', 'Frank Ruhl Libre, serif')
      .attr('fill', '#333')
      .text(d => {
        const name = d.label || d.name_he || '';
        return name.length > 12 ? name.substring(0, 12) + '...' : name;
      });
  }

  /**
   * Select a node and show sidebar
   */
  selectNode(d) {
    this.selectedNode = d;
    this.showSidebar(d);
  }

  /**
   * Show sidebar with sage details
   */
  showSidebar(sage) {
    const sidebar = document.querySelector('#sidebar');
    if (!sidebar) return;

    // Build HTML
    let html = `
      <div class="sidebar-close">&times;</div>
      <div class="sidebar-header">
        <h2>${sage.name_he}</h2>
        <p>${sage.name_en || ''}</p>
      </div>
      <div class="sidebar-content">
        <p><strong>Era:</strong> ${sage.era}</p>
        <p><strong>Region:</strong> ${sage.region}</p>
        <p><strong>Field:</strong> ${sage.primary_field}</p>
    `;

    if (sage.summary) {
      html += `<p><strong>Bio:</strong> ${sage.summary}</p>`;
    }

    // Add related sages
    const incoming = this.data.links.filter(l => l.target === sage.id);
    const outgoing = this.data.links.filter(l => l.source === sage.id);

    if (incoming.length > 0) {
      html += `<h3>Teachers</h3><ul>`;
      for (const link of incoming) {
        const teacher = this.nodeMap.get(link.source);
        if (teacher) {
          html += `<li>${teacher.name_he}</li>`;
        }
      }
      html += `</ul>`;
    }

    if (outgoing.length > 0) {
      html += `<h3>Students</h3><ul>`;
      for (const link of outgoing) {
        const student = this.nodeMap.get(link.target);
        if (student) {
          html += `<li>${student.name_he}</li>`;
        }
      }
      html += `</ul>`;
    }

    html += `</div>`;
    sidebar.innerHTML = html;
    sidebar.classList.add('active');

    // Close button
    sidebar.querySelector('.sidebar-close').addEventListener('click', () => {
      this.closeSidebar();
    });
  }

  closeSidebar() {
    const sidebar = document.querySelector('#sidebar');
    if (sidebar) {
      sidebar.classList.remove('active');
    }
  }

  showError(message) {
    console.error(message);
    const svg = d3.select(this.svgSelector);
    svg.append('text')
      .attr('x', 10)
      .attr('y', 30)
      .attr('fill', 'red')
      .text(message);
  }
}

// Export for module import
export { GenealogyTree };
