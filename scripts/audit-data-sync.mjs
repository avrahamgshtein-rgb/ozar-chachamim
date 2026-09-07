#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const masterPath = resolve(repoRoot, 'data.json')
const publicPath = resolve(repoRoot, 'nextjs-app', 'public', 'data.json')
const supplementalPaths = [
  'data-ancient.json',
  'data-supplement.json',
  'data-supplement-2.json',
  'data-research-links.json',
].map(name => resolve(repoRoot, 'nextjs-app', 'public', name))
const aliasPath = resolve(repoRoot, 'data', 'sage-id-aliases-2026-07-21.json')

async function readGraph(path) {
  const graph = JSON.parse(await readFile(path, 'utf8'))
  return {
    nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
    links: Array.isArray(graph.links) ? graph.links : [],
  }
}

function inspectGraph(graph) {
  const ids = graph.nodes.map(node => String(node.id ?? ''))
  const idSet = new Set(ids)
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))]
  const orphanLinks = graph.links.filter(link => (
    !idSet.has(String(link.source ?? '')) || !idSet.has(String(link.target ?? ''))
  ))

  return {
    nodes: graph.nodes.length,
    uniqueIds: idSet.size,
    links: graph.links.length,
    duplicateIds,
    orphanLinks,
  }
}

function canonicalizer(aliasObject) {
  const aliases = new Map(Object.entries(aliasObject || {}).map(([from, to]) => [String(from), String(to)]))
  return value => {
    let id = String(value ?? '')
    const visited = new Set()
    while (aliases.has(id)) {
      if (visited.has(id)) throw new Error(`Alias cycle detected at ${id}`)
      visited.add(id)
      id = aliases.get(id)
    }
    return id
  }
}

function canonicalizeGraph(graph, canonicalId) {
  const nodesById = new Map()
  for (const node of graph.nodes) {
    const id = canonicalId(node.id)
    if (!nodesById.has(id)) nodesById.set(id, { ...node, id })
  }
  const ids = new Set(nodesById.keys())
  const linksByKey = new Map()
  for (const link of graph.links) {
    const source = canonicalId(link.source)
    const target = canonicalId(link.target)
    if (source === target || !ids.has(source) || !ids.has(target)) continue
    const type = String(link.type || 'colleague')
    const key = `${source}\u0000${target}\u0000${type}`
    if (!linksByKey.has(key)) linksByKey.set(key, { ...link, source, target, type })
  }
  return { nodes: [...nodesById.values()], links: [...linksByKey.values()] }
}

function mergeGraphs(base, supplements, canonicalId) {
  const nodesById = new Map(base.nodes.map(node => [canonicalId(node.id), { ...node, id: canonicalId(node.id) }]))

  for (const supplement of supplements) {
    for (const node of supplement.nodes) {
      const id = canonicalId(node.id)
      if (!nodesById.has(id)) nodesById.set(id, { ...node, id })
    }
  }

  const ids = new Set(nodesById.keys())
  const linksByKey = new Map()
  for (const graph of [base, ...supplements]) {
    for (const link of graph.links) {
      const source = canonicalId(link.source)
      const target = canonicalId(link.target)
      if (source === target || !ids.has(source) || !ids.has(target)) continue
      const type = String(link.type || 'colleague')
      const key = `${source}\u0000${target}\u0000${type}`
      if (!linksByKey.has(key)) linksByKey.set(key, { ...link, source, target, type })
    }
  }
  return { nodes: [...nodesById.values()], links: [...linksByKey.values()] }
}

function difference(leftNodes, rightNodes) {
  const rightIds = new Set(rightNodes.map(node => String(node.id ?? '')))
  return leftNodes
    .filter(node => !rightIds.has(String(node.id ?? '')))
    .map(node => ({ id: String(node.id ?? ''), label: String(node.label ?? '') }))
}

const master = await readGraph(masterPath)
const publicBase = await readGraph(publicPath)
const supplements = await Promise.all(supplementalPaths.map(readGraph))
const aliasManifest = JSON.parse(await readFile(aliasPath, 'utf8'))
const canonicalId = canonicalizer(aliasManifest.aliases)
const canonicalMaster = canonicalizeGraph(master, canonicalId)
const effectiveAppGraph = mergeGraphs(publicBase, supplements, canonicalId)

const report = {
  master: inspectGraph(master),
  canonicalMaster: inspectGraph(canonicalMaster),
  publicBase: inspectGraph(publicBase),
  effectiveAppGraph: inspectGraph(effectiveAppGraph),
  aliasesConfigured: Object.keys(aliasManifest.aliases || {}).length,
  masterCanonicalMissingFromPublic: difference(canonicalMaster.nodes, publicBase.nodes),
  publicOnlyNodes: difference(publicBase.nodes, canonicalMaster.nodes),
}

console.log(JSON.stringify(report, null, 2))

if (process.argv.includes('--check')) {
  const hasDrift = report.masterCanonicalMissingFromPublic.length > 0
  const hasInvalidData = [
    report.master,
    report.publicBase,
    report.effectiveAppGraph,
  ].some(stats => stats.duplicateIds.length > 0 || stats.orphanLinks.length > 0)

  if (hasDrift || hasInvalidData) process.exitCode = 1
}
