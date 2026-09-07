#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SUPABASE_CONFIG } from '../config.js'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const graph = JSON.parse(await readFile(resolve(repoRoot, 'nextjs-app/public/data.json'), 'utf8'))

function normalizeName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[״׳'"“”‘’()[\]{}.,:;־–—\-\s]/gu, '')
    .replace(/^(הרב|רבי|רבנו|רבן)/u, '')
}

async function fetchTable(path) {
  const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_CONFIG.anonKey },
  })
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${await response.text()}`)
  return response.json()
}

const [liveSages, liveConnections] = await Promise.all([
  fetchTable('sages?select=id,name_he&limit=1000'),
  fetchTable('connections?select=source_id,target_id,connection_type&limit=5000'),
])

const localById = new Map(graph.nodes.map(node => [String(node.id), node]))
const liveById = new Map(liveSages.map(node => [String(node.id), node]))
const liveOnly = liveSages.filter(node => !localById.has(String(node.id)))
const localOnly = graph.nodes.filter(node => !liveById.has(String(node.id)))
const idNameCollisions = liveSages
  .filter(node => localById.has(String(node.id)))
  .filter(node => normalizeName(node.name_he) !== normalizeName(localById.get(String(node.id)).label))
  .map(node => ({
    id: String(node.id),
    live: node.name_he,
    local: localById.get(String(node.id)).label,
  }))

const connectionTypes = {}
for (const connection of liveConnections) {
  connectionTypes[connection.connection_type] = (connectionTypes[connection.connection_type] || 0) + 1
}

process.stdout.write(`${JSON.stringify({
  liveSages: liveSages.length,
  canonicalSages: graph.nodes.length,
  commonIds: liveSages.length - liveOnly.length,
  liveOnlyCount: liveOnly.length,
  localOnlyCount: localOnly.length,
  idNameCollisionCount: idNameCollisions.length,
  idNameCollisions,
  liveConnections: liveConnections.length,
  canonicalConnections: graph.links.length,
  connectionTypes,
}, null, 2)}\n`)
