import { useEffect, useRef, useState, useCallback } from 'react'

interface NodeData {
  id: string
  [key: string]: any
}

interface LinkData {
  source: string | NodeData
  target: string | NodeData
  type?: string
}

interface WorkerMessage {
  type: 'positions' | 'done' | 'stopped'
  nodes?: Array<{ id: string; x: number; y: number; vx: number; vy: number }>
}

export function useD3ForceWorker() {
  const workerRef = useRef<Worker | null>(null)
  const [positions, setPositions] = useState<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map())
  const [isRunning, setIsRunning] = useState(false)
  const callbackRef = useRef<(positions: Map<string, any>) => void>(() => {})

  // Initialize worker on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const workerCode = `
        ${import('d3').toString()}
        // Inline worker code would go here
      `
      // For now, use a simple worker URL pattern
      const worker = new Worker(new URL('../../lib/workers/d3-force-worker.ts', import.meta.url), { type: 'module' })

      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, nodes } = event.data

        if (type === 'positions' && nodes) {
          const posMap = new Map(nodes.map(n => [n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy }]))
          setPositions(posMap)
          callbackRef.current(posMap)
        } else if (type === 'done') {
          setIsRunning(false)
          console.log('[D3Worker] Simulation complete')
        }
      }

      workerRef.current = worker
      return () => {
        worker.terminate()
      }
    } catch (error) {
      console.error('[useD3ForceWorker] Failed to initialize worker:', error)
      // Fallback: worker not available, will use main thread
    }
  }, [])

  const start = useCallback(
    (nodes: NodeData[], links: LinkData[], width: number, height: number, onTick: (positions: Map<string, any>) => void, iterations = 200) => {
      if (!workerRef.current) {
        console.warn('[useD3ForceWorker] Worker not initialized, skipping')
        return
      }

      callbackRef.current = onTick
      setIsRunning(true)
      setPositions(new Map())

      workerRef.current.postMessage({
        type: 'start',
        nodes,
        links,
        width,
        height,
        iterations
      })
    },
    []
  )

  const stop = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' })
      setIsRunning(false)
    }
  }, [])

  return { positions, isRunning, start, stop }
}
