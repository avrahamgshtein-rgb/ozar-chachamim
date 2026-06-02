/**
 * search-manager.js
 * Unified Multi-Tab Search & Filtering System for אוצר חכמים
 *
 * Implements cross-field concept search with dynamic filtering across:
 * - Graph (רשת קשרים) — dim non-matched nodes, highlight matched
 * - Map (גיאוגרפיה) — flyTo matched markers, open popups
 * - Traditions (מסורות) — filter by era/group
 * - Ideas (רעיונות) — filter by theme
 * - Timeline (שלשלת הקבלה) — highlight matched dots
 */

class UnifiedSearchManager {
  constructor() {
    this.currentQuery = '';
    this.currentResults = null;
    this.searchIndex = null;
    this.isSearching = false;
  }

  /**
   * Initialize search manager and build full-text index
   * Called after Supabase data is loaded
   */
  initialize(graphData) {
    if (!graphData || !graphData.nodes) {
      console.error('❌ [SearchManager] No data to index');
      return false;
    }

    // Build comprehensive search index
    this.buildSearchIndex(graphData.nodes);

    console.log(`✅ [SearchManager] Initialized with ${graphData.nodes.length} sages`);
    return true;
  }

  /**
   * Build multi-field search index (name, core_concept, tags, era, field)
   * Enables instant, token-based search across all text fields
   */
  buildSearchIndex(sages) {
    const index = new Map(); // token → [sages]

    sages.forEach(sage => {
      const tokens = new Set();

      // 1. Hebrew name (primary identifier)
      if (sage.name_he) {
        this.tokenize(sage.name_he, tokens);
      }

      // 2. English name (if available)
      if (sage.name_en) {
        this.tokenize(sage.name_en, tokens);
      }

      // 3. CORE CONCEPT (central ideological innovation — CRITICAL for concept search)
      if (sage.core_concept) {
        console.log(`🔍 [Index] Sage ${sage.name_he}: core_concept = "${sage.core_concept}"`);
        this.tokenize(sage.core_concept, tokens);
      }

      // 4. TAGS (comma/space-separated concepts)
      if (sage.tags) {
        console.log(`🔍 [Index] Sage ${sage.name_he}: tags = "${sage.tags}"`);
        this.tokenize(sage.tags, tokens);
      }

      // 5. Primary field (academic discipline)
      if (sage.primary_field) {
        this.tokenize(sage.primary_field, tokens);
      }

      // 6. Era (historical period)
      if (sage.era) {
        tokens.add(sage.era.toLowerCase());
      }
      if (sage.era_key) {
        tokens.add(sage.era_key.toLowerCase());
      }

      // 7. Region (geographic area)
      if (sage.region) {
        this.tokenize(sage.region, tokens);
      }

      // Index all tokens → sage mapping
      tokens.forEach(token => {
        if (!index.has(token)) {
          index.set(token, []);
        }
        index.get(token).push(sage);
      });
    });

    this.searchIndex = index;
    console.log(`🔍 [SearchManager] Built index with ${index.size} unique tokens`);
  }

  /**
   * Tokenize a string: split on whitespace/punctuation, normalize Hebrew
   */
  tokenize(text, tokenSet) {
    if (!text) return;

    // Split on spaces, commas, hyphens, etc.
    text.split(/[\s,\-]+/).forEach(t => {
      const token = t.toLowerCase().trim();
      if (token.length > 0) {
        tokenSet.add(token);
      }
    });
  }

  /**
   * MAIN: Execute multi-field search across name, core_concept, tags, era
   * Returns { sages, connections, stats }
   */
  async search(query) {
    if (!query || !query.trim()) {
      return this.resetResults();
    }

    this.isSearching = true;
    const q = query.toLowerCase().trim();
    const matchingIds = new Set();

    console.log(`🔍 [Search] Query: "${q}"`);

    // TOKEN-BASED SEARCH: Find all sages with matching tokens
    if (this.searchIndex) {
      const queryTokens = q.split(/\s+/).filter(t => t.length > 0);

      queryTokens.forEach(queryToken => {
        // 1. Direct token match
        const directMatches = this.searchIndex.get(queryToken) || [];
        console.log(`  ✓ Token "${queryToken}": ${directMatches.length} direct matches`);
        directMatches.forEach(sage => matchingIds.add(String(sage.id)));

        // 2. Prefix match (for partial queries like "חו" → "חוק")
        this.searchIndex.forEach((sages, indexedToken) => {
          if (indexedToken.startsWith(queryToken) && indexedToken !== queryToken) {
            sages.forEach(sage => matchingIds.add(String(sage.id)));
          }
        });
      });
    }

    // Get matching sages from window.graphData
    if (!window.graphData || !window.graphData.nodes) {
      console.warn('⚠️ [Search] graphData not available');
      return this.resetResults();
    }

    const allSages = window.graphData.nodes;
    const matchingSages = allSages.filter(s => matchingIds.has(String(s.id)));

    // Get matching connections (links between OR involving matched sages)
    const allConnections = window.graphData.links || [];
    const matchingConnections = allConnections.filter(c => {
      const sourceMatch = matchingIds.has(String(c.source?.id || c.source || ''));
      const targetMatch = matchingIds.has(String(c.target?.id || c.target || ''));
      return sourceMatch || targetMatch;
    });

    const results = {
      sages: matchingSages,
      connections: matchingConnections,
      query: q,
      totalSages: allSages.length,
      stats: {
        matched: matchingSages.length,
        connected: matchingConnections.length,
        percentage: Math.round((matchingSages.length / allSages.length) * 100)
      }
    };

    console.log(`✅ [Search] Found ${results.stats.matched}/${results.stats.totalSages} sages (${results.stats.percentage}%), ${results.stats.connected} connections`);

    this.currentQuery = q;
    this.currentResults = results;
    this.isSearching = false;

    return results;
  }

  /**
   * Reset search and return to full data view
   */
  resetResults() {
    this.currentQuery = '';
    this.currentResults = null;

    const sages = window.graphData?.nodes || [];
    const connections = window.graphData?.links || [];

    return {
      sages: sages,
      connections: connections,
      query: '',
      totalSages: sages.length,
      stats: {
        matched: sages.length,
        connected: connections.length,
        percentage: 100
      }
    };
  }

  /**
   * UPDATE GRAPH VIEW: Dim unmatched nodes, highlight matched
   * Handles node opacity, size, and link visibility
   */
  updateGraphView(sageNetwork, results) {
    if (!sageNetwork || !sageNetwork.node) {
      console.warn('⚠️ [SearchManager] Graph not yet rendered');
      return;
    }

    const matchedIds = new Set(results.sages.map(s => String(s.id)));
    const isFiltered = results.query !== '';

    console.log(`📊 [Graph] Updating ${sageNetwork.node.size()} nodes, filtered=${isFiltered}`);

    // Update node visibility
    sageNetwork.node
      .style('opacity', d => this.getNodeOpacity(d, matchedIds, isFiltered))
      .attr('r', d => this.getNodeRadius(d, matchedIds, isFiltered))
      .attr('stroke-width', d => this.getNodeStrokeWidth(d, matchedIds, isFiltered));

    // Update link visibility
    if (sageNetwork.link) {
      sageNetwork.link
        .style('opacity', d => this.getLinkOpacity(d, matchedIds, isFiltered))
        .style('stroke-width', d => this.getLinkStrokeWidth(d, matchedIds, isFiltered));
    }

    // Update labels
    if (sageNetwork.labels) {
      sageNetwork.labels.style('opacity', d =>
        this.getNodeOpacity(d, matchedIds, isFiltered)
      );
    }
  }

  /**
   * UPDATE MAP VIEW: Highlight markers, auto-zoom to results
   * Smooth transition to matched sages on map
   */
  updateMapView(mapManager, results) {
    if (!mapManager) {
      console.warn('⚠️ [SearchManager] Map manager not available');
      return;
    }

    const matchedIds = new Set(results.sages.map(s => String(s.id)));

    console.log(`🗺️ [Map] Highlighting ${matchedIds.size} locations, zooming to results`);

    // Highlight matching markers
    mapManager.highlightSearchResults(results.sages);

    // Auto-zoom to matched locations
    if (results.sages.length > 0) {
      mapManager.zoomToResults(results.sages);
    } else if (results.query === '') {
      mapManager.resetView();
    }
  }

  /**
   * UPDATE TRADITIONS & IDEAS VIEWS: Filter cards by matching sages
   * Smooth opacity transition for card grids
   */
  updateTraditionsAndIdeasViews(results) {
    const matchedIds = new Set(results.sages.map(s => String(s.id)));
    const isFiltered = results.query !== '';

    // Find all card elements (traditions, ideas, sage-tags)
    const cardSelectors = '.tradition-card, .idea-card, .sage-tag, [data-sage-id]';
    const cards = document.querySelectorAll(cardSelectors);

    console.log(`🎨 [Traditions/Ideas] Filtering ${cards.size} cards`);

    cards.forEach(card => {
      const sageId = card.dataset?.sageId || card.textContent;
      const isSageTag = card.classList.contains('sage-tag');

      let isMatched = false;

      if (isSageTag) {
        // Match by text content or data-sage-id
        isMatched = results.sages.some(s =>
          s.name_he === sageId ||
          s.label === sageId ||
          String(s.id) === sageId
        );
      } else {
        // Match by data-sage-id
        isMatched = matchedIds.has(String(sageId));
      }

      // Apply smooth opacity transition
      card.style.opacity = isMatched || !isFiltered ? '1' : '0.15';
      card.style.transition = 'opacity 0.25s ease';
      card.style.pointerEvents = isMatched || !isFiltered ? 'auto' : 'none';
    });
  }

  /**
   * UPDATE TIMELINE VIEW: Highlight matched sage dots
   * Scale and glow effect for matched sages
   */
  updateTimelineView(results) {
    const matchedIds = new Set(results.sages.map(s => String(s.id)));
    const isFiltered = results.query !== '';

    // Find all timeline sage dots
    const dots = document.querySelectorAll('.tl-sage-group, [data-sage-id]');

    console.log(`⏱️ [Timeline] Filtering ${dots.length} dots`);

    dots.forEach(dot => {
      const sageId = dot.dataset?.sageId || dot.getAttribute('data-id');
      const isMatched = matchedIds.has(sageId);

      if (isFiltered) {
        dot.style.opacity = isMatched ? '1' : '0.15';
        if (isMatched && dot.querySelector('.tl-dot')) {
          dot.querySelector('.tl-dot').style.filter = 'url(#tl-glow)';
        }
      } else {
        dot.style.opacity = '1';
        if (dot.querySelector('.tl-dot')) {
          dot.querySelector('.tl-dot').style.filter = 'none';
        }
      }

      dot.style.transition = 'opacity 0.25s ease';
    });
  }

  /**
   * Helper: Determine node opacity based on search state
   */
  getNodeOpacity(d, matchedIds, isFiltered) {
    if (!isFiltered) return 1;
    return matchedIds.has(String(d.id)) ? 1 : 0.05;
  }

  /**
   * Helper: Determine node radius based on search state
   */
  getNodeRadius(d, matchedIds, isFiltered) {
    const matched = matchedIds.has(String(d.id));
    if (!isFiltered) return 22;
    return matched ? 28 : 16;
  }

  /**
   * Helper: Determine node stroke width
   */
  getNodeStrokeWidth(d, matchedIds, isFiltered) {
    if (!isFiltered) return 2;
    return matchedIds.has(String(d.id)) ? 3 : 1;
  }

  /**
   * Helper: Determine link opacity
   */
  getLinkOpacity(d, matchedIds, isFiltered) {
    if (!isFiltered) return 0.5;
    const sourceMatch = matchedIds.has(String(d.source?.id || d.source || ''));
    const targetMatch = matchedIds.has(String(d.target?.id || d.target || ''));
    return (sourceMatch || targetMatch) ? 0.8 : 0.05;
  }

  /**
   * Helper: Determine link stroke width
   */
  getLinkStrokeWidth(d, matchedIds, isFiltered) {
    if (!isFiltered) {
      const baseWidth = d.type === 'student' ? 2.5 : (d.type === 'influence' ? 2 : 1.5);
      return baseWidth;
    }

    const sourceMatch = matchedIds.has(String(d.source?.id || d.source || ''));
    const targetMatch = matchedIds.has(String(d.target?.id || d.target || ''));
    const baseWidth = d.type === 'student' ? 2.5 : (d.type === 'influence' ? 2 : 1.5);

    return (sourceMatch || targetMatch) ? baseWidth * 1.3 : baseWidth * 0.7;
  }
}

// Export as global
window.searchManager = new UnifiedSearchManager();
