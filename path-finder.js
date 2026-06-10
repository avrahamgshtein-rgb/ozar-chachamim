/**
 * Path Finding Algorithm for Degrees of Separation
 * BFS to find shortest path between two sages
 */

class PathFinder {
  constructor(nodes, links) {
    this.nodes = nodes;
    this.links = links;
    this.buildAdjacencyList();
  }

  buildAdjacencyList() {
    this.graph = new Map();

    // Initialize all nodes
    this.nodes.forEach(node => {
      this.graph.set(String(node.id), []);
    });

    // Add bidirectional edges
    this.links.forEach(link => {
      const sourceId = String(link.source);
      const targetId = String(link.target);

      if (this.graph.has(sourceId) && this.graph.has(targetId)) {
        this.graph.get(sourceId).push({ id: targetId, type: link.type });
        this.graph.get(targetId).push({ id: sourceId, type: link.type });
      }
    });

    console.log(`✓ Built adjacency list with ${this.graph.size} nodes`);
  }

  /**
   * BFS to find shortest path between two sage IDs
   * Returns { path: [id1, id2, ...], distance: number, connectionTypes: [type1, type2, ...] }
   */
  findPath(sourceId, targetId) {
    sourceId = String(sourceId);
    targetId = String(targetId);

    if (!this.graph.has(sourceId) || !this.graph.has(targetId)) {
      return { path: [], distance: -1, connectionTypes: [], error: 'Source or target sage not found' };
    }

    if (sourceId === targetId) {
      return { path: [sourceId], distance: 0, connectionTypes: [] };
    }

    const visited = new Set();
    const queue = [{ id: sourceId, path: [sourceId], types: [] }];
    visited.add(sourceId);

    while (queue.length > 0) {
      const { id: current, path, types } = queue.shift();

      if (current === targetId) {
        return {
          path: path,
          distance: path.length - 1,
          connectionTypes: types
        };
      }

      const neighbors = this.graph.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          queue.push({
            id: neighbor.id,
            path: [...path, neighbor.id],
            types: [...types, neighbor.type]
          });
        }
      }
    }

    return { path: [], distance: -1, connectionTypes: [], error: 'No path found' };
  }

  /**
   * Get multiple path options (top N shortest paths)
   */
  findPaths(sourceId, targetId, maxPaths = 3) {
    // For now, just return the single shortest path
    const path = this.findPath(sourceId, targetId);
    return path.path.length > 0 ? [path] : [];
  }

  /**
   * Get neighbors of a node (for visualization)
   */
  getNeighbors(nodeId, depth = 1) {
    nodeId = String(nodeId);
    if (!this.graph.has(nodeId)) return [];

    const neighbors = new Set();
    const queue = [{ id: nodeId, distance: 0 }];
    const visited = new Set([nodeId]);

    while (queue.length > 0) {
      const { id: current, distance } = queue.shift();

      if (distance < depth) {
        const adjacent = this.graph.get(current) || [];
        for (const neighbor of adjacent) {
          if (!visited.has(neighbor.id)) {
            visited.add(neighbor.id);
            neighbors.add(neighbor.id);
            queue.push({ id: neighbor.id, distance: distance + 1 });
          }
        }
      }
    }

    return Array.from(neighbors);
  }
}

// Export for use in graph.js
window.PathFinder = PathFinder;
