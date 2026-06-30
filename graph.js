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
    
    this.eraColors = {
      'second-temple': '#8e44ad',
      'tannaim': '#e74c3c',
      'amoraim': '#e67e22',
      'geonim': '#f1c40f',
      'rishonim': '#27ae60',
      'acharonim': '#2980b9',
      'modern': '#1abc9c',
      'unknown': '#95a5a6'
    };

    this.connectionColors = {
      'student': '#e74c3c',
      'teacher': '#3498db',
      'influence': '#f39c12',
      'colleague': '#27ae60',
      'oppose': '#e67e22',
      'family': '#9b59b6',
      'contemporary': '#1abc9c',
      'predecessor': '#34495e'
    };
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

    // Remove existing SVG
    d3.select(this.container).selectAll('svg').remove();
    
    // Create main SVG
    const svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('background', '#fafafa')
      .style('border', '1px solid #e5e5e5');

    this.svg = svg;

    // Create main group for zoom/pan
    const g = svg.append('g');
    this.g = g;

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Compute hierarchical layout
    console.log('📐 Computing hierarchical layout...');
    this._computeLayout();
    
    // Filter connections
    const filteredLinks = this._filterConnections(this.data.links);
    console.log(`🔗 Filtered: ${this.data.links.length} → ${filteredLinks.length} connections`);

    // Draw graph
    this._drawConnections(filteredLinks);
    this._drawNodes();
    this._addLabels();
    this._setupInteraction();

    console.log('✅ Network initialized');
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
      
      node.x = colWidth + (eraIdx * colWidth) + (Math.random() - 0.5) * 30;
      node.y = rowHeight + (fieldIdx * rowHeight) + (Math.random() - 0.5) * 30;
      node.degree = 0;
    });

    // Calculate degrees
    this.data.links.forEach(link => {
      const source = this.data.nodes.find(n => n.id === link.source);
      const target = this.data.nodes.find(n => n.id === link.target);
      if (source) source.degree++;
      if (target) target.degree++;
    });

    // Light force simulation
    const simulation = d3.forceSimulation(this.data.nodes)
      .force('charge', d3.forceManyBody().strength(-80))
      .force('collide', d3.forceCollide(24).strength(0.95))
      .alphaDecay(0.05)
      .stop();

    for (let i = 0; i < 50; i++) {
      simulation.tick();
    }
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

    this.link = linkGroup
      .selectAll('path')
      .data(links, d => `${d.source}-${d.target}`)
      .enter()
      .append('path')
      .attr('stroke', d => this.connectionColors[d.type] || '#ccc')
      .attr('stroke-width', 1.2)
      .attr('fill', 'none')
      .attr('opacity', 0.25)
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
          .attr('opacity', 0.25)
          .attr('stroke-width', 1.2)
          .style('filter', 'none');
      });
  }

  _getCurvedPath(link) {
    const source = this.data.nodes.find(n => n.id === link.source);
    const target = this.data.nodes.find(n => n.id === link.target);
    
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
      .attr('r', d => 5 + Math.sqrt(d.degree || 0) * 1.5)
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
        d3.select(this)
          .attr('r', 5 + Math.sqrt(d.degree || 0) * 1.5 + 4)
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
        d3.select(this)
          .attr('r', 5 + Math.sqrt(d.degree || 0) * 1.5)
          .attr('stroke-width', 2)
          .style('filter', 'none');

        // Remove tooltip
        const tooltip = document.getElementById('sage-tooltip-' + d.id);
        if (tooltip) tooltip.remove();
      });
  }

  _addLabels() {
    const labelGroup = this.g.append('g').attr('class', 'labels');

    labelGroup
      .selectAll('text')
      .data(this.data.nodes, d => d.id)
      .enter()
      .append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y + 24)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('pointer-events', 'none')
      .style('opacity', 0.5)
      .text(d => {
        const label = d.label || '';
        return label.substring(0, 10);
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

    if (this.node) {
      this.node.style('opacity', d => d.id === node.id ? 1 : 0.2);
    }

    if (this.link) {
      this.link.style('opacity', d => {
        if (d.source === node.id || d.target === node.id) return 0.7;
        return 0.05;
      });
    }

    if (window.selectNodeById) {
      window.selectNodeById(node.id);
    } else if (window.FloatingPanel) {
      window.FloatingPanel.showPanel(node.id, node.label);
    }
  }

  deselectNode() {
    this.selectedNodeId = null;
    if (this.node) {
      this.node.style('opacity', 1);
    }
    if (this.link) {
      this.link.style('opacity', 0.25);
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
