#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = resolve(repoRoot, 'nextjs-app', 'public')
const publicPath = resolve(publicDir, 'data.json')
const shouldWrite = process.argv.includes('--write')

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

const aliasManifest = await readJson(resolve(repoRoot, 'data', 'sage-id-aliases-2026-07-21.json'))
const aliases = new Map(Object.entries(aliasManifest.aliases || {}).map(([from, to]) => [String(from), String(to)]))

function canonicalId(value) {
  let id = String(value ?? '')
  const visited = new Set()
  while (aliases.has(id)) {
    if (visited.has(id)) throw new Error(`Alias cycle detected at ${id}`)
    visited.add(id)
    id = aliases.get(id)
  }
  return id
}

function normalizeNode(node, id) {
  return {
    ...node,
    id,
    era_key: node.era_key || node.period || 'modern',
    central_idea: node.central_idea || node.core_concept || '',
  }
}

function longest(first, second) {
  const firstText = typeof first === 'string' ? first : ''
  const secondText = typeof second === 'string' ? second : ''
  return secondText.length > firstText.length ? secondText : firstText
}

function mergeNodes(candidates, id, researchIds) {
  const primary = candidates.find(item => item.originalId === id && item.source === 'public')
    || candidates.find(item => item.originalId === id && item.source === 'master')
    || candidates.find(item => item.originalId === id)
    || candidates[0]
  const merged = normalizeNode(primary.node, id)
  const textFields = ['bio', 'central_idea', 'field', 'location', 'tags', 'era', 'era_label', 'spotify_url']
  for (const candidate of candidates) {
    const normalized = normalizeNode(candidate.node, id)
    for (const field of textFields) merged[field] = longest(merged[field], normalized[field])
    if (Array.isArray(normalized.works)) {
      merged.works = [...new Set([...(merged.works || []), ...normalized.works])]
    }
    if (normalized.migration_path && !merged.migration_path) merged.migration_path = normalized.migration_path
  }
  merged.has_research = Boolean(
    researchIds.has(id)
    || candidates.some(item => item.node.has_research || researchIds.has(item.originalId)),
  )
  delete merged.period
  delete merged.core_concept
  return merged
}

const master = await readJson(resolve(repoRoot, 'data.json'))
const publicData = await readJson(publicPath)
const extraSpecs = [
  ['ancient', 'data-ancient.json'],
  ['supplement', 'data-supplement.json'],
  ['supplement-2', 'data-supplement-2.json'],
  ['research-links', 'data-research-links.json'],
]
const extras = []
for (const [source, fileName] of extraSpecs) {
  extras.push([source, await readJson(resolve(publicDir, fileName))])
}
const researchIds = new Set((await readdir(resolve(publicDir, 'research')))
  .filter(fileName => /^.+\.json$/i.test(fileName) && !/\.(en|ru)\.json$/i.test(fileName))
  .map(fileName => fileName.replace(/\.json$/i, '')))

const nodeSources = [
  ['public', publicData],
  ['master', master],
  ...extras,
]
const nodeGroups = new Map()
for (const [source, graph] of nodeSources) {
  for (const node of graph.nodes || []) {
    const originalId = String(node.id ?? '')
    const id = canonicalId(originalId)
    if (!nodeGroups.has(id)) nodeGroups.set(id, [])
    nodeGroups.get(id).push({ source, originalId, node })
  }
}

const nodes = [...nodeGroups.entries()].map(([id, candidates]) => mergeNodes(candidates, id, researchIds))
const nodeIds = new Set(nodes.map(node => String(node.id)))
const missingCanonicalIds = [...new Set([...aliases.values()].map(canonicalId).filter(id => !nodeIds.has(id)))]
if (missingCanonicalIds.length) {
  throw new Error(`Canonical ids missing from consolidated nodes: ${missingCanonicalIds.join(', ')}`)
}

const linkSources = [
  ['public', publicData],
  ['master', master],
  ...extras,
]
const linksByKey = new Map()
let selfLinksRemoved = 0
let duplicateLinksMerged = 0
let orphanLinksRemoved = 0
for (const [source, graph] of linkSources) {
  for (const rawLink of graph.links || []) {
    const sourceId = canonicalId(rawLink.source)
    const targetId = canonicalId(rawLink.target)
    if (sourceId === targetId) {
      selfLinksRemoved += 1
      continue
    }
    if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
      orphanLinksRemoved += 1
      continue
    }
    const type = String(rawLink.type || 'colleague')
    const key = `${sourceId}\u0000${targetId}\u0000${type}`
    if (linksByKey.has(key)) {
      duplicateLinksMerged += 1
      const existing = linksByKey.get(key)
      if (!existing.evidence_source && rawLink.evidence_source) existing.evidence_source = rawLink.evidence_source
      continue
    }
    linksByKey.set(key, { ...rawLink, source: sourceId, target: targetId, type, data_source: rawLink.data_source || source })
  }
}
const links = [...linksByKey.values()]
const finalOrphans = links.filter(link => !nodeIds.has(String(link.source)) || !nodeIds.has(String(link.target)))

const collapsedAliasesPresent = [...aliases.keys()].filter(alias => (
  nodeSources.some(([, graph]) => (graph.nodes || []).some(node => String(node.id) === alias))
))
const countsBySource = Object.fromEntries(nodeSources.map(([source, graph]) => [source, (graph.nodes || []).length]))

console.log(JSON.stringify({
  input_nodes_by_source: countsBySource,
  current_public_nodes: (publicData.nodes || []).length,
  consolidated_nodes: nodes.length,
  aliases_collapsed: collapsedAliasesPresent.length,
  current_public_links: (publicData.links || []).length,
  consolidated_links: links.length,
  duplicate_links_merged: duplicateLinksMerged,
  self_links_removed: selfLinksRemoved,
  orphan_links_removed: orphanLinksRemoved,
  final_orphan_links: finalOrphans.length,
}, null, 2))

if (finalOrphans.length) throw new Error(`Consolidation produced ${finalOrphans.length} orphan links`)
if (!shouldWrite) {
  console.log('\nDry run only. Re-run with --write after reviewing the consolidation report.')
  process.exit(0)
}

const reconciled = { ...publicData, nodes, links }
await writeFile(publicPath, `${JSON.stringify(reconciled, null, 1)}\n`, 'utf8')
console.log(`\nUpdated ${publicPath}`)
