/**
 * Data Validator & Cleaner
 * Ensures data integrity before it reaches any view
 */

class DataValidator {
  /**
   * Validate and clean the master dataset
   */
  static validate(data) {
    console.log('🔍 [Validator] Starting validation...');

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data: not an object');
    }

    // Validate nodes
    if (!Array.isArray(data.nodes)) {
      throw new Error('Invalid data: nodes is not an array');
    }

    if (data.nodes.length === 0) {
      throw new Error('Invalid data: nodes array is empty');
    }

    console.log(`  ✓ Nodes: ${data.nodes.length}`);

    // Build valid node ID set
    const validNodeIds = new Set();
    const nodeMap = new Map(); // For deduplication

    data.nodes.forEach(node => {
      if (!node.id && node.id !== 0) {
        console.warn(`  ⚠️  Node missing ID: ${node.label}`);
        return;
      }

      const nodeId = String(node.id);
      validNodeIds.add(nodeId);
      nodeMap.set(nodeId, node);
    });

    console.log(`  ✓ Valid node IDs: ${validNodeIds.size}`);

    // Validate and clean links
    if (!Array.isArray(data.links)) {
      console.warn('  ⚠️  Links is not an array, creating empty array');
      data.links = [];
    } else {
      const originalCount = data.links.length;
      const invalidLinks = [];

      data.links = data.links.filter(link => {
        // Check source
        if (!link.source && link.source !== 0) {
          invalidLinks.push(`Link missing source (target: ${link.target})`);
          return false;
        }

        const sourceId = String(link.source);
        if (!validNodeIds.has(sourceId)) {
          invalidLinks.push(`Link source not found: ${sourceId}`);
          return false;
        }

        // Check target
        if (!link.target && link.target !== 0) {
          invalidLinks.push(`Link missing target (source: ${link.source})`);
          return false;
        }

        const targetId = String(link.target);
        if (!validNodeIds.has(targetId)) {
          invalidLinks.push(`Link target not found: ${targetId}`);
          return false;
        }

        // Convert to string IDs for consistency
        link.source = sourceId;
        link.target = targetId;

        // Check type
        if (!link.type) {
          link.type = 'colleague'; // Default type
        }

        return true;
      });

      if (invalidLinks.length > 0) {
        console.warn(`  ⚠️  Removed ${invalidLinks.length} invalid links:`);
        invalidLinks.slice(0, 5).forEach(msg => {
          console.warn(`      - ${msg}`);
        });
        if (invalidLinks.length > 5) {
          console.warn(`      ... and ${invalidLinks.length - 5} more`);
        }
      }

      console.log(`  ✓ Valid links: ${data.links.length}/${originalCount}`);
    }

    // Validate each node has required fields
    const requiredFields = ['id', 'label', 'group', 'era'];
    let nodesMissingFields = 0;

    data.nodes = data.nodes.filter(node => {
      for (const field of requiredFields) {
        if (!node[field] && node[field] !== 0 && node[field] !== '') {
          console.warn(`  ⚠️  Node ${node.id} missing required field: ${field}`);
          nodesMissingFields++;
          return false;
        }
      }
      return true;
    });

    if (nodesMissingFields > 0) {
      console.log(`  ✓ Removed ${nodesMissingFields} nodes with missing fields`);
    }

    // Ensure all node IDs are strings
    data.nodes.forEach(node => {
      node.id = String(node.id);
    });

    // Final statistics
    console.log(`\n✅ [Validator] Validation complete:`);
    console.log(`   • Nodes: ${data.nodes.length}`);
    console.log(`   • Links: ${data.links.length}`);
    console.log(`   • Status: ${data.nodes.length > 0 ? 'VALID' : 'EMPTY'}`);

    return data;
  }

  /**
   * Verify a link references valid nodes
   */
  static isValidLink(link, validNodeIds) {
    return (
      link &&
      validNodeIds.has(String(link.source)) &&
      validNodeIds.has(String(link.target))
    );
  }

  /**
   * Find node by ID
   */
  static findNode(nodeId, nodes) {
    const id = String(nodeId);
    return nodes.find(n => String(n.id) === id);
  }
}
