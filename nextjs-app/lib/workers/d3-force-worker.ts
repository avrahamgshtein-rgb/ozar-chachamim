// @ts-nocheck
// Web Worker: Offload D3 force simulation to prevent main-thread blocking
// Runs force simulation in background, emits position updates every 50ms

import * as d3 from 'd3'

interface NodeData extends d3.SimulationNodeDatum {
  id: string
  label: string
  group?: string
  [key: string]: any
}

interface LinkData extends d3.SimulationLinkDatum<NodeData> {
  type?: string
  [key: string]: any
}

interface MessageData {
  type: 'start' | 'stop'
  nodes?: NodeData[]
  links?: LinkData[]
  width?: number
  height?: number
  iterations?: number
}

let simulation: d3.Simulation<NodeData, LinkData> | null = null
let animationFrameId: number | null = null
let tickCount = 0
let maxIterations = 200

const postUpdate = (nodes: NodeData[]) => {
  self.postMessage({
    type: 'positions',
    nodes: nodes.map(d => ({
      id: d.id,
      x: d.x,
      y: d.y,
      vx: d.vx,
      vy: d.vy
    }))
  })
}

self.onmessage = (event: MessageEvent<MessageData>) => {
  const { type, nodes: rawNodes, links: rawLinks, width = 800, height = 600, iterations = 200 } = event.data

  if (type === 'start' && rawNodes && rawLinks) {
    maxIterations = iterations
    tickCount = 0

    // Reset animation loop
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
    }

    // Clone data (worker doesn't share references)
    const nodes: NodeData[] = rawNodes.map(d => ({ ...d }))
    const links: LinkData[] = rawLinks.map(d => ({
      source: typeof d.source === 'string' ? d.source : d.source.id,
      target: typeof d.target === 'string' ? d.target : d.target.id,
      type: d.type
    }))

    // Create D3 simulation
    simulation = d3
      .forceSimulation<NodeData, LinkData>(nodes)
      .force(
        'link',
        d3
          .forceLink<NodeData, LinkData>(links as d3.SimulationLinkDatum<NodeData>[])
          .id((d: NodeData) => d.id)
          .distance(80)
          .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300).distanceMax(300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30))
      .on('tick', () => {
        tickCount++

        // Send updates every 50ms (20fps is enough for visual update)
        if (tickCount % 3 === 0) {
          postUpdate(nodes)
        }

        // Stop after max iterations
        if (tickCount >= maxIterations) {
          if (simulation) {
            simulation.stop()
          }
          postUpdate(nodes) // Send final positions
          self.postMessage({ type: 'done' })
        }
      })
      .stop() // Start paused

    // Run simulation
    for (let i = 0; i < 20; i++) {
      simulation.tick()
    }

    simulation.restart()
  } else if (type === 'stop') {
    if (simulation) {
      simulation.stop()
    }
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
    }
    self.postMessage({ type: 'stopped' })
  }
}
