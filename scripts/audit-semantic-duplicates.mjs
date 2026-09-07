#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = resolve(repoRoot, 'nextjs-app', 'public')

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

const stopWords = new Set([
  'רבי', 'רב', 'הרב', 'רבן', 'מרן', 'חכם', 'החכם', 'הגאון', 'המקובל',
  'האדמור', 'אדמור', 'זצל', 'זצ״ל', 'זצ"ל',
])

function normalize(value, dropParenthetical = false) {
  let normalizedText = String(value || '').normalize('NFKD').replace(/[\u0591-\u05C7]/gu, '')
  if (dropParenthetical) normalizedText = normalizedText.replace(/\([^)]*\)/gu, ' ')
  return normalizedText
    .replace(/[״“”„"׳'’´־–—/\\()[\]{}:;,.!?]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .split(' ')
    .filter(token => token && !stopWords.has(token))
    .join(' ')
}

function levenshtein(first, second) {
  if (first === second) return 0
  if (!first.length) return second.length
  if (!second.length) return first.length
  const previous = Array.from({ length: second.length + 1 }, (_, index) => index)
  const current = new Array(second.length + 1)
  for (let i = 1; i <= first.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= second.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (first[i - 1] === second[j - 1] ? 0 : 1),
      )
    }
    for (let j = 0; j <= second.length; j += 1) previous[j] = current[j]
  }
  return previous[second.length]
}

function jaccard(first, second) {
  const firstTokens = new Set(first.split(' ').filter(Boolean))
  const secondTokens = new Set(second.split(' ').filter(Boolean))
  const intersection = [...firstTokens].filter(token => secondTokens.has(token)).length
  const union = new Set([...firstTokens, ...secondTokens]).size
  return union ? intersection / union : 0
}

function similarity(firstLabel, secondLabel) {
  const first = normalize(firstLabel)
  const second = normalize(secondLabel)
  const firstBase = normalize(firstLabel, true)
  const secondBase = normalize(secondLabel, true)
  if (!firstBase || !secondBase) return 0
  if (firstBase === secondBase) return 1
  const shorter = firstBase.length <= secondBase.length ? firstBase : secondBase
  const longer = firstBase.length > secondBase.length ? firstBase : secondBase
  const containment = shorter.length >= 6 && longer.includes(shorter) ? shorter.length / longer.length : 0
  const edit = 1 - (levenshtein(firstBase, secondBase) / Math.max(firstBase.length, secondBase.length))
  const tokens = Math.max(jaccard(first, second), jaccard(firstBase, secondBase))
  return Math.max(containment * 0.95, edit * 0.9, tokens)
}

const master = await readJson(resolve(repoRoot, 'data.json'))
const sources = [
  ['public', await readJson(resolve(publicDir, 'data.json'))],
  ['supplement', await readJson(resolve(publicDir, 'data-supplement.json'))],
  ['supplement-2', await readJson(resolve(publicDir, 'data-supplement-2.json'))],
]

const masterNodes = (master.nodes || []).map(node => ({ ...node, source: 'master' }))
const effectiveById = new Map()
for (const [source, graph] of sources) {
  for (const node of graph.nodes || []) {
    const id = String(node.id)
    if (!effectiveById.has(id)) effectiveById.set(id, { ...node, id, source })
  }
}
const effectiveNodes = [...effectiveById.values()]

const candidates = []
for (const masterNode of masterNodes) {
  for (const effectiveNode of effectiveNodes) {
    if (String(masterNode.id) === String(effectiveNode.id)) continue
    const score = similarity(masterNode.label, effectiveNode.label)
    if (score >= 0.64) {
      candidates.push({
        score: Number(score.toFixed(3)),
        master_id: String(masterNode.id),
        master_label: masterNode.label,
        effective_id: String(effectiveNode.id),
        effective_label: effectiveNode.label,
        effective_source: effectiveNode.source,
      })
    }
  }
}

candidates.sort((first, second) => (
  second.score - first.score
  || first.master_label.localeCompare(second.master_label, 'he')
  || first.effective_label.localeCompare(second.effective_label, 'he')
))

console.log(JSON.stringify({
  master_nodes: masterNodes.length,
  effective_nodes: effectiveNodes.length,
  candidate_pairs: candidates.length,
  candidates,
}, null, 2))
