#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SUPABASE_CONFIG } from '../config.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const graph = JSON.parse(await readFile(resolve(repoRoot, 'nextjs-app/public/data.json'), 'utf8'))

async function fetchAll(path) {
  const rows = []
  const batchSize = 1000
  for (let offset = 0; ; offset += batchSize) {
    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_CONFIG.anonKey,
        Range: `${offset}-${offset + batchSize - 1}`,
      },
    })
    if (!response.ok && response.status !== 206) {
      throw new Error(`${path}: HTTP ${response.status} ${await response.text()}`)
    }
    const batch = await response.json()
    rows.push(...batch)
    if (batch.length < batchSize) return rows
  }
}

function difference(left, right) {
  const rightSet = new Set(right)
  return left.filter(value => !rightSet.has(value))
}

function connectionKey(connection) {
  return `${connection.source_id ?? connection.source}\u0000${connection.target_id ?? connection.target}\u0000${connection.connection_type ?? connection.type ?? 'colleague'}`
}

const [liveSages, liveConnections] = await Promise.all([
  fetchAll('sages_with_stats?select=id,name_he&order=id'),
  fetchAll('connections_with_names?select=source_id,target_id,connection_type&order=id'),
])

const expectedSageIds = graph.nodes.map(node => String(node.id))
const liveSageIds = liveSages.map(node => String(node.id))
const expectedLabels = new Map(graph.nodes.map(node => [String(node.id), String(node.label || '')]))
const labelMismatches = liveSages
  .filter(node => expectedLabels.has(String(node.id)))
  .filter(node => expectedLabels.get(String(node.id)) !== String(node.name_he || ''))
  .map(node => ({ id: String(node.id), expected: expectedLabels.get(String(node.id)), actual: node.name_he }))

const expectedConnectionKeys = graph.links.map(connectionKey)
const liveConnectionKeys = liveConnections.map(connectionKey)
const report = {
  sages: {
    expected: expectedSageIds.length,
    actual: liveSageIds.length,
    missing: difference(expectedSageIds, liveSageIds),
    extra: difference(liveSageIds, expectedSageIds),
    labelMismatches,
  },
  connections: {
    expected: expectedConnectionKeys.length,
    actual: liveConnectionKeys.length,
    missing: difference(expectedConnectionKeys, liveConnectionKeys),
    extra: difference(liveConnectionKeys, expectedConnectionKeys),
    family: liveConnections.filter(connection => connection.connection_type === 'family').length,
  },
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)

if (process.argv.includes('--check')) {
  const hasDrift =
    report.sages.expected !== report.sages.actual ||
    report.sages.missing.length > 0 ||
    report.sages.extra.length > 0 ||
    report.sages.labelMismatches.length > 0 ||
    report.connections.expected !== report.connections.actual ||
    report.connections.missing.length > 0 ||
    report.connections.extra.length > 0 ||
    report.connections.family !== 17
  if (hasDrift) process.exitCode = 1
}
