/**
 * Connected Papers Style Network Graph
 * Clean, hierarchical layout with better edge routing
 * Reduces visual clutter from 561 sages + 1001 connections
 */

class SageNetworkConnectedPapers {
  constructor(options = {}) {
    this.width = options.width || window.innerWidth - 300;
    this.height = options.height || window.innerHeight - 100;
    this.data = options.data || { nodes: [], links: [] };
    this.container = options.container || '#network-view';
    this.selectedNodeId = null;
    this.connectionColors = {
      student: '#e74c3c',
      teacher: '#3498db',
      influence: '#f39c12',
      colleague: '#27ae60',
      opposing: '#e67e22',
      family: '#9b59b6',
      contemporary: '#1abc9c',
      predecessor: '#34495e'
    };
  }

  /**
   * Initialize the network with Connected Papers-style layout
   */
  init() {
    console.log('📊 Initializing Connected Papers style network...');
    
    // Create SVG
    d3.select(this.container).selectAll('*').remove();
    
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('background', '#fafafa');

    // Add zoom behavior
    const g = this.svg.append('g');
    this.g = g;

    const zoom = d3.zoom()
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    this.svg.call(zoom);

    // Filter out weak connections to reduce clutter
    // Keep only: top 30% of connections by importance
    const filteredLinks = this._filterImportantConnections(this.data.links);
    
    console.log(`✅ Filtered from ${this.data.links.length} to ${filteredLinks.length} connections`);

    // Use hierarchical layout instead of pure force simulation
    this._layoutHierarchical();
    
    // Draw connections first (so they're behind nodes)
    this._drawConnections(filteredLinks);
    
    // Draw nodes
    this._drawNodes();
    
    // Add labels with better positioning
    this._addLabels();

    // Add interaction
    this._setupInteraction();

    console.log('✅ Connected Papers style network initialized');
  }

  /**
   * Filter to keep only important connections
   * (Reduces clutter while maintaining network integrity)
   */
  _filterImportantConnections(links) {
    if (links.length <= 400) return links; // Keep all if not too many

    // Score connections by importance:
    // - Teacher/student relationships: high importance (weight 3)
    // - Influence/colleague: medium (weight 2)
    // - Other: low (weight 1)
    const scores = links.map(link => {
      let score = 1;
      if (link.type === 'student' || link.type === 'teacher') score = 3;
      if (link.type === 'influence' || link.type === 'colleague') score = 2;
      return { link, score };
    });

    // Sort by score and keep top connections
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 400) // Keep ~400 connections
      .map(s => s.link);
  }

  /**
   * Hierarchical layout: position nodes based on era + field
   * Instead of pure force simulation
   */
  _layoutHierarchical() {
    const eraOrder = {
      'second-temple': 1,
      'tannaim': 2,
      'amoraim': 3,
      'geonim': 4,
      'rishonim': 5,
      'acharonim': 6,
      'modern': 7,
      'unknown': 8
    };

    const fields = [...new Set(this.data.nodes.map(n => n.field))];

    // Position nodes by era (x-axis) and field (y-axis)
    const colWidth = this.width / 8;
    const rowHeight = this.height / (fields.length || 8);

    this.data.nodes.forEach(node => {
      const eraIdx = eraOrder[node.era_key] || 8;
      const fieldIdx = fields.indexOf(node.field);

      // Add some randomness to avoid perfect grid (looks better)
      const jitter = 40;
      node.x = eraIdx * colWidth + (Math.random() - 0.5) * jitter;
      node.y = fieldIdx * rowHeight + (Math.random() - 0.5) * jitter;
    });

    // Now apply light force simulation to improve spacing
    this._applyLightForces();
  }

  /**
   * Apply light force simulation to improve node spacing
   */
  _applyLightForces() {
    const simulation = d3.forceSimulation(this.data.nodes)
      .force('charge', d3.forceManyBody().strength(-100)) // Repulsion
      .force('collide', d3.forceCollide(25).strength(0.9)) // Collision avoidance
      .force('x', d3.forceX(d => {
        const eraOrder = {
          'second-temple': 1, 'tannaim': 2, 'amoraim': 3, 'geonim': 4,
          'rishonim': 5, 'acharonim': 6, 'modern': 7, 'unknown': 8
        };
        const eraIdx = eraOrder[d.era_key] || 8;
        return eraIdx * (this.width / 8);
      }).strength(0.3)) // Weak x-axis pull
      .force('y', d3.forceY(this.height / 2).strength(0.05)); // Weak centering

    // Run simulation briefly
    simulation.tick(50);
    simulation.stop();
  }

  /**
   * Draw connections with curved paths (less visual clutter)
   */
  _drawConnections(links) {
    this.linkGroup = this.g.append('g').attr('class', 'links');

    // Create curved paths instead of straight lines
    this.link = this.linkGroup
      .selectAll('path')
      .data(links, d => `${d.source}-${d.target}-${d.type}`)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('stroke', d => this.connectionColors[d.type] || '#ccc')
      .attr('stroke-width', 1.5)
      .attr('fill', 'none')
      .attr('opacity', 0.3)
      .attr('stroke-linecap', 'round')
      .attr('d', d => {
        const source = this.data.nodes.find(n => n.id === d.source);
        const target = this.data.nodes.find(n => n.id === d.target);
        if (!source || !target) return '';
        
        // Use quadratic Bezier curve
        const mx = (source.x + target.x) / 2;
        const my = (source.y + target.y) / 2;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const offsetX = -dy / dist * 30;
        const offsetY = dx / dist * 30;

        return `M ${source.x} ${source.y} Q ${mx + offsetX} ${my + offsetY} ${target.x} ${target.y}`;
      });

    // Hover effect on connections
    this.link
      .on('mouseenter', function() {
        d3.select(this).attr('opacity', 1).attr('stroke-width', 2.5);
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 0.3).attr('stroke-width', 1.5);
      });
  }

  /**
   * Draw nodes with better sizing
   */
  _drawNodes() {
    this.nodeGroup = this.g.append('g').attr('class', 'nodes');

    // Calculate node degrees for sizing
    const nodeDegree = {};
    this.data.links.forEach(link => {
      nodeDegree[link.source] = (nodeDegree[link.source] || 0) + 1;
      nodeDegree[link.target] = (nodeDegree[link.target] || 0) + 1;
    });

    // Color map by era
    const eraColors = {
      'second-temple': '#8e44ad',
      'tannaim': '#e74c3c',
      'amoraim': '#e67e22',
      'geonim': '#f1c40f',
      'rishonim': '#27ae60',
      'acharonim': '#2980b9',
      'modern': '#1abc9c',
      'unknown': '#95a5a6'
    };

    this.node = this.nodeGroup
      .selectAll('circle')
      .data(this.data.nodes, d => d.id)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => {
        const degree = nodeDegree[d.id] || 0;
        return 5 + Math.sqrt(degree) * 2; // Size by connections
      })
      .attr('fill', d => eraColors[d.era_key] || '#999')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        this.selectNode(d);
      })
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .attr('r', r => r + 4)
          .attr('stroke-width', 3)
          .attr('filter', 'drop-shadow(0 0 8px rgba(0,0,0,0.3))');
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('r', d => {
            const degree = nodeDegree[d.id] || 0;
            return 5 + Math.sqrt(degree) * 2;
          })
          .attr('stroke-width', 2)
          .attr('filter', 'none');
      });
  }

  /**
   * Add labels to nodes
   */
  _addLabels() {
    this.labelGroup = this.g.append('g').attr('class', 'labels');

    this.labelGroup
      .selectAll('text')
      .data(this.data.nodes, d => d.id)
      .enter()
      .append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y + 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('fill', '#333')
      .attr('pointer-events', 'none')
      .style('opacity', 0.6)
      .text(d => {
        // Show first few Hebrew characters
        const label = d.label || '';
        return label.substring(0, 12);
      });
  }

  /**
   * Setup interaction (click to select)
   */
  _setupInteraction() {
    this.svg.on('click', () => {
      // Deselect on background click
      this.deselectNode();
    });
  }

  /**
   * Select a node and show details
   */
  selectNode(node) {
    this.selectedNodeId = node.id;
    console.log(`✅ Selected: ${node.label} (${node.id})`);
    
    // Highlight node and connections
    this.node.style('opacity', d => d.id === node.id ? 1 : 0.3);
    this.link.style('opacity', d => {
      if (d.source === node.id || d.target === node.id) return 0.6;
      return 0.1;
    });

    // Show details in sidebar (handled by main app)
    window.selectNodeById(node.id);
  }

  /**
   * Deselect node
   */
  deselectNode() {
    this.selectedNodeId = null;
    this.node.style('opacity', 1);
    this.link.style('opacity', 0.3);
  }
}

// Export for ES6 modules
export { SageNetworkConnectedPapers };
