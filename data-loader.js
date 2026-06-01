/**
 * SINGLE SOURCE OF TRUTH: Data Loader
 *
 * This file MUST be loaded BEFORE other scripts (graph.js, etc.)
 * It ensures window.graphData is available before any view tries to use it
 */

(async function initializeApp() {
  console.log('🔄 [DataLoader] Starting...');

  try {
    // Step 1: Load data.json
    console.log('  Loading data.json...');
    const response = await fetch('data.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    window.graphData = await response.json();

    // Step 2: Validate and clean data
    console.log('  Validating data integrity...');
    if (typeof DataValidator === 'undefined') {
      console.warn('  ⚠️  DataValidator not loaded yet, skipping validation');
    } else {
      window.graphData = DataValidator.validate(window.graphData);
    }

    // Step 3: Verify structure
    if (!window.graphData.nodes || !Array.isArray(window.graphData.nodes)) {
      throw new Error('Invalid data: missing nodes array');
    }

    if (!window.graphData.links) {
      window.graphData.links = [];
    }

    if (window.graphData.nodes.length === 0) {
      throw new Error('Data validation failed: nodes array is empty');
    }

    // Step 4: Create node ID lookup for quick access
    window.nodeIdMap = new Map();
    window.graphData.nodes.forEach(node => {
      window.nodeIdMap.set(String(node.id), node);
    });

    // Step 5: Log success
    const nodeCount = window.graphData.nodes.length;
    const linkCount = window.graphData.links.length;
    console.log(`✅ [DataLoader] Master data ready: ${nodeCount} nodes + ${linkCount} edges`);

    // Step 6: Signal that data is ready
    document.dispatchEvent(new CustomEvent('graphDataReady', {
      detail: { nodes: nodeCount, links: linkCount }
    }));

  } catch (error) {
    console.error('❌ [DataLoader] CRITICAL ERROR:', error);

    // Fallback: empty structure to prevent crashes
    window.graphData = { nodes: [], links: [] };
    window.nodeIdMap = new Map();

    document.dispatchEvent(new CustomEvent('graphDataError', {
      detail: { error: error.message }
    }));
  }
})();
