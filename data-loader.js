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
    const response = await fetch('data.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    window.graphData = await response.json();

    // Step 2: Validate structure
    if (!window.graphData.nodes || !Array.isArray(window.graphData.nodes)) {
      throw new Error('Invalid data: missing nodes array');
    }

    if (!window.graphData.links) {
      window.graphData.links = [];
    }

    // Step 3: Log success
    const nodeCount = window.graphData.nodes.length;
    const linkCount = window.graphData.links.length;
    console.log(`✅ [DataLoader] Master data ready: ${nodeCount} nodes + ${linkCount} edges`);

    // Step 4: Signal that data is ready
    document.dispatchEvent(new CustomEvent('graphDataReady', {
      detail: { nodes: nodeCount, links: linkCount }
    }));

  } catch (error) {
    console.error('❌ [DataLoader] CRITICAL ERROR:', error);

    // Fallback: empty structure to prevent crashes
    window.graphData = { nodes: [], links: [] };
    document.dispatchEvent(new CustomEvent('graphDataError', {
      detail: { error: error.message }
    }));
  }
})();
