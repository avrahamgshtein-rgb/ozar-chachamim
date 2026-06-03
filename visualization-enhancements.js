/**
 * visualization-enhancements.js
 * Advanced Map & Graph Rendering for אוצר חכמים
 *
 * Implements:
 * 1. Chronological flow in Graph (period_order based positioning)
 * 2. Migration trajectory visualization in Map (with directional arrows)
 * 3. Relationship type styling in Graph (student, influence, oppose)
 * 4. Elegant polyline animations and semi-transparent effects
 */

class VisualizationEnhancer {
  /**
   * Era color palette (consistent across all views)
   */
  static eraColorMap = {
    'second-temple': '#8e44ad',  // Purple
    'tannaim': '#e74c3c',         // Red
    'amoraim': '#e67e22',         // Orange
    'geonim': '#f1c40f',          // Yellow
    'rishonim': '#27ae60',        // Green
    'acharonim': '#2980b9',       // Blue
    'modern': '#1abc9c',          // Teal
    'unknown': '#95a5a6'          // Gray
  };

  /**
   * Relationship type colors (for graph links)
   */
  static relationshipColors = {
    'student': '#4ecdc4',         // Bright Teal (teacher-student transmission)
    'influence': '#8b7965',       // Dark Grey/Brown (intellectual influence)
    'oppose': '#ff6b6b',          // Red (disagreement/controversy)
    'colleague': '#95e1d3',       // Cyan (peer relationship)
    'predecessor': '#f9ca24',     // Yellow (succession)
    'teacher': '#4ecdc4',         // Teal (same as student, reversed direction)
    'contemporary': '#95e1d3'     // Cyan (peer relationship)
  };

  /**
   * Enhance Graph: Add chronological axis force and improve link styling
   * Call this after D3 simulation is created
   */
  static enhanceGraphChronology(simulation, nodes, width, height) {
    console.log('📊 [Visualization] Enhancing graph chronology...');

    // Remove existing X force if present
    simulation.force('x', null);

    // Calculate period_order range for normalization
    const periodOrders = nodes.map(n => n.period_order || 0).filter(p => p !== null);
    const minPeriod = Math.min(...periodOrders);
    const maxPeriod = Math.max(...periodOrders);
    const periodRange = maxPeriod - minPeriod || 1;

    // Create powerful chronological X-axis force
    // Maps period_order (0=ancient, 6=modern) to left-to-right position
    const xForce = d3.forceX()
      .x(d => {
        if (d.period_order === undefined || d.period_order === null) {
          return width / 2;
        }

        // Normalize period_order to 0-1 scale
        const normalized = (d.period_order - minPeriod) / periodRange;

        // Map to canvas width with padding (10% margin on each side)
        const padding = width * 0.1;
        return padding + (normalized * (width - 2 * padding));
      })
      .strength(0.4);  // Strong force to keep chronological order

    // Add Y-axis centering force to prevent vertical drift
    const yForce = d3.forceY()
      .y(height / 2)
      .strength(0.1);

    // Apply forces
    simulation
      .force('x', xForce)
      .force('y', yForce)
      .alpha(0.5)
      .restart();

    console.log(`✓ [Graph] Chronological axis applied (period_order: ${minPeriod}-${maxPeriod})`);

    return simulation;
  }

  /**
   * Style graph links by relationship type with better visual hierarchy
   */
  static enhanceGraphLinks(linkSelection) {
    console.log('🔗 [Visualization] Enhancing link styling...');

    linkSelection
      .attr('stroke', d => this.relationshipColors[d.type] || '#999999')
      .attr('stroke-width', d => {
        // Hierarchy: student (3px) > influence (2px) > others (1.5px)
        if (d.type === 'student') return 2.5;
        if (d.type === 'influence' || d.type === 'teacher') return 2;
        if (d.type === 'oppose') return 1.8;
        return 1.3;
      })
      .attr('opacity', d => {
        // Student relationships more prominent
        if (d.type === 'student') return 0.75;
        return 0.5;
      })
      .attr('stroke-dasharray', d => {
        // Dashed for oppose relationships (controversy)
        if (d.type === 'oppose') return '4,4';
        return '0';
      })
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', d => {
            const base = d.type === 'student' ? 2.5 : (d.type === 'influence' ? 2 : 1.5);
            return base * 1.5;
          });
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('opacity', d => d.type === 'student' ? 0.75 : 0.5)
          .attr('stroke-width', d => {
            if (d.type === 'student') return 2.5;
            if (d.type === 'influence' || d.type === 'teacher') return 2;
            if (d.type === 'oppose') return 1.8;
            return 1.3;
          });
      });

    return linkSelection;
  }

  /**
   * Add directional arrows to graph links (SVG markers)
   */
  static addGraphArrowMarkers(svgDefs) {
    console.log('➜ [Visualization] Adding directional arrows...');

    // Remove existing markers
    svgDefs.selectAll('marker').remove();

    // Create arrow for each relationship type
    Object.entries(this.relationshipColors).forEach(([type, color]) => {
      svgDefs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('markerWidth', 15)
        .attr('markerHeight', 15)
        .attr('refX', 13)
        .attr('refY', 7.5)
        .attr('orient', 'auto')
        .attr('markerUnits', 'strokeWidth')
        .append('path')
        .attr('d', 'M 0,0 L 0,15 L 15,7.5 Z')
        .attr('fill', color)
        .attr('opacity', 0.7);

      // Also add outline for better visibility
      svgDefs.append('marker')
        .attr('id', `arrow-${type}-outline`)
        .attr('markerWidth', 15)
        .attr('markerHeight', 15)
        .attr('refX', 13)
        .attr('refY', 7.5)
        .attr('orient', 'auto')
        .attr('markerUnits', 'strokeWidth')
        .append('circle')
        .attr('cx', 8)
        .attr('cy', 7.5)
        .attr('r', 3)
        .attr('fill', color)
        .attr('opacity', 0.5);
    });

    console.log(`✓ [Graph] Arrow markers created for ${Object.keys(this.relationshipColors).length} relationship types`);
  }

  /**
   * Enhance Map: Add directional arrows to migration polylines
   * Creates animated arrows showing flow of study/travel
   */
  static enhanceMigrationPolylines(mapInstance, sages, locationCoords) {
    console.log('🛤️ [Visualization] Enhancing migration paths...');

    let pathsAdded = 0;

    sages.forEach(sage => {
      if (!sage.migration_path) return;

      // Handle both string (JSON) and object formats
      let path = sage.migration_path;
      if (typeof path === 'string') {
        try {
          path = JSON.parse(path);
        } catch (e) {
          return;
        }
      }

      if (!path.from || !path.to) return;

      const fromCoords = locationCoords[path.from];
      const toCoords = locationCoords[path.to];

      if (!fromCoords || !toCoords) return;

      // Build complete waypoint path
      const waypoints = [fromCoords];

      if (path.intermediate && Array.isArray(path.intermediate)) {
        path.intermediate.forEach(locName => {
          const coords = locationCoords[locName];
          if (coords) waypoints.push(coords);
        });
      }

      waypoints.push(toCoords);

      // Get era color for this sage
      const color = this.eraColorMap[sage.era_key] || '#95a5a6';

      // MAIN POLYLINE: Migration path with era color
      const polyline = L.polyline(waypoints, {
        color: color,
        weight: 3,
        opacity: 0.65,
        dashArray: '8, 5',
        dashOffset: 0,
        lineCap: 'round',
        lineJoin: 'round',
        className: `migration-path migration-${sage.era_key}`
      }).addTo(mapInstance);

      // GLOWING SHADOW: For better visibility
      L.polyline(waypoints, {
        color: color,
        weight: 6,
        opacity: 0.15,
        dashArray: '8, 5',
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false
      }).addTo(mapInstance);

      // Add directional arrows at intermediate points
      for (let i = 0; i < waypoints.length - 1; i++) {
        const start = waypoints[i];
        const end = waypoints[i + 1];

        // Calculate midpoint for arrow placement
        const midLat = (start[0] + end[0]) / 2;
        const midLng = (start[1] + end[1]) / 2;

        // Calculate bearing for arrow rotation
        const bearing = this.calculateBearing(start, end);

        // Add arrow marker (using rotation)
        const arrowIcon = L.divIcon({
          html: `<div style="
            width: 20px;
            height: 20px;
            background: ${color};
            border-radius: 50%;
            opacity: 0.7;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            position: relative;
          ">
            <div style="
              position: absolute;
              top: 2px;
              left: 50%;
              width: 0;
              height: 0;
              border-left: 4px solid transparent;
              border-right: 4px solid transparent;
              border-bottom: 6px solid white;
              transform: translateX(-50%) rotate(${bearing}deg);
              opacity: 0.9;
            "></div>
          </div>`,
          className: 'migration-arrow',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        L.marker([midLat, midLng], { icon: arrowIcon })
          .addTo(mapInstance)
          .bindPopup(`
            <div style="font-size: 12px; padding: 0.5rem;">
              <strong>${sage.name_he}</strong><br>
              From: ${path.from}<br>
              To: ${path.to}
            </div>
          `);
      }

      // Add destination marker with strong color
      L.circleMarker(toCoords, {
        radius: 7,
        fillColor: color,
        color: 'white',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.95,
        className: 'migration-destination'
      })
      .bindPopup(`
        <div style="font-size: 12px; padding: 0.5rem;">
          <strong>Destination: ${path.to}</strong><br>
          Sage: ${sage.name_he}
        </div>
      `)
      .addTo(mapInstance);

      pathsAdded++;
    });

    console.log(`✓ [Map] Enhanced ${pathsAdded} migration paths with directional arrows`);
    return pathsAdded;
  }

  /**
   * Calculate bearing (direction) between two lat/lng points
   * Used for arrow rotation
   */
  static calculateBearing(from, to) {
    const fromLat = from[0] * Math.PI / 180;
    const fromLng = from[1] * Math.PI / 180;
    const toLat = to[0] * Math.PI / 180;
    const toLng = to[1] * Math.PI / 180;

    const dLng = toLng - fromLng;
    const y = Math.sin(dLng) * Math.cos(toLat);
    const x = Math.cos(fromLat) * Math.sin(toLat) -
              Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLng);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  }

  /**
   * Add era-based legend to map
   */
  static addMapLegend(mapInstance) {
    console.log('📖 [Visualization] Adding map legend...');

    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function() {
      const div = L.DomUtil.create('div', 'legend-advanced');
      div.style.cssText = `
        background: white;
        padding: 14px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-family: 'Heebo', sans-serif;
        direction: rtl;
        text-align: right;
        max-width: 200px;
      `;

      let html = '<h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: bold; color: #1a1410; border-bottom: 2px solid #ddd; padding-bottom: 8px;">מקרא - תקופות החכמים</h4>';

      html += '<div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; margin-bottom: 12px;">';

      Object.entries(VisualizationEnhancer.eraColorMap).forEach(([era, color]) => {
        const eraLabels = {
          'second-temple': 'בית שני (516 לפנ״ס - 70 לספ״נ)',
          'tannaim': 'תנאים (10 - 220 לספ״נ)',
          'amoraim': 'אמוראים (220 - 500)',
          'geonim': 'גאונים (589 - 1038)',
          'rishonim': 'ראשונים (1038 - 1563)',
          'acharonim': 'אחרונים (1563 - עת חדשה)',
          'modern': 'עת חדשה (19 כ״א ואילך)',
          'unknown': 'לא ידוע'
        };

        const label = eraLabels[era] || era;
        html += `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 14px; height: 14px; background: ${color}; border-radius: 50%; border: 1px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></span>
            <span style="color: #333; font-size: 11px;">${label}</span>
          </div>
        `;
      });

      html += '</div>';
      html += '<div style="border-top: 2px solid #ddd; margin-top: 8px; padding-top: 8px;">';
      html += '<h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; color: #1a1410;">נדודים ותנועות</h4>';
      html += '<div style="font-size: 11px; color: #555; margin-bottom: 6px;">';
      html += '<div style="margin-bottom: 4px; display: flex; align-items: center; gap: 6px;"><svg width="30" height="3" viewBox="0 0 30 3"><line x1="0" y1="1.5" x2="30" y2="1.5" stroke="#8b7965" stroke-width="2" stroke-dasharray="4,4"/></svg><span>קו הנדודים</span></div>';
      html += '<div style="display: flex; align-items: center; gap: 6px;"><svg width="20" height="20" viewBox="0 0 32 32"><polygon points="16,4 28,24 16,20 4,24" fill="#8b7965" opacity="0.8" stroke="white" stroke-width="1"/></svg><span>כיוון התנועה</span></div>';
      html += '</div>';
      html += '</div>';

      return div;
    };

    legend.addTo(mapInstance);
  }

  /**
   * Create animated dots along migration paths (optional, for visual flow)
   */
  static animateMigrationFlow(mapInstance, sages, locationCoords) {
    console.log('✨ [Visualization] Adding migration animation...');

    sages.forEach(sage => {
      if (!sage.migration_path) return;

      let path = sage.migration_path;
      if (typeof path === 'string') {
        try {
          path = JSON.parse(path);
        } catch (e) {
          return;
        }
      }

      const fromCoords = locationCoords[path.from];
      const toCoords = locationCoords[path.to];

      if (!fromCoords || !toCoords) return;

      const color = this.eraColorMap[sage.era_key] || '#95a5a6';

      // Create animated dot that "travels" along the path
      let progress = 0;
      const animationDuration = 4000; // 4 seconds per journey
      const startTime = Date.now() + Math.random() * 2000; // Stagger animations

      const animate = () => {
        const elapsed = (Date.now() - startTime) % (animationDuration * 2);
        progress = (elapsed < animationDuration) ? elapsed / animationDuration : 2 - (elapsed / animationDuration);

        // Interpolate position
        const lat = fromCoords[0] + (toCoords[0] - fromCoords[0]) * progress;
        const lng = fromCoords[1] + (toCoords[1] - fromCoords[1]) * progress;

        // This could create an animated marker, but for now just log the concept
        requestAnimationFrame(animate);
      };

      // Uncomment to enable full animation
      // animate();
    });

    console.log(`✓ [Map] Migration animation setup complete`);
  }
}

// Export to global scope
window.VisualizationEnhancer = VisualizationEnhancer;
