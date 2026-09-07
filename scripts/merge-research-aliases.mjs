#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const researchDir = resolve(repoRoot, 'nextjs-app', 'public', 'research')
const shouldWrite = process.argv.includes('--write')

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function asEntries(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return [value]
  return []
}

function fingerprint(entry) {
  const normalized = String(entry.content || '').normalize('NFKC').replace(/\s+/gu, ' ').trim()
  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}

function appendToJsonArray(raw, additions) {
  const trimmed = raw.trimEnd()
  const parsed = JSON.parse(trimmed)
  if (!Array.isArray(parsed)) return `${JSON.stringify([...asEntries(parsed), ...additions])}\n`
  if (!additions.length) return raw
  if (!parsed.length) return `[${additions.map(item => JSON.stringify(item)).join(',')}]\n`
  return `${trimmed.slice(0, -1)},${additions.map(item => JSON.stringify(item)).join(',')}]\n`
}

async function readOptional(path) {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

const aliasManifest = await readJson(resolve(repoRoot, 'data', 'sage-id-aliases-2026-07-21.json'))
const aliases = Object.entries(aliasManifest.aliases || {})
const plans = []
for (const localeSuffix of ['', '.en', '.ru']) {
  for (const [aliasId, canonicalId] of aliases) {
    const aliasPath = resolve(researchDir, `${aliasId}${localeSuffix}.json`)
    const canonicalPath = resolve(researchDir, `${canonicalId}${localeSuffix}.json`)
    const aliasRaw = await readOptional(aliasPath)
    if (!aliasRaw) continue
    const aliasEntries = asEntries(JSON.parse(aliasRaw))
    const canonicalRaw = await readOptional(canonicalPath) || '[]\n'
    const canonicalEntries = asEntries(JSON.parse(canonicalRaw))
    const driveIds = new Set(canonicalEntries.map(entry => entry.drive_file_id).filter(Boolean).map(String))
    const fingerprints = new Set(canonicalEntries.map(fingerprint))
    const additions = aliasEntries
      .filter(entry => (
        !(entry.drive_file_id && driveIds.has(String(entry.drive_file_id)))
        && !fingerprints.has(fingerprint(entry))
      ))
      .map(entry => ({ ...entry, migrated_from_sage_id: aliasId }))
    if (additions.length) plans.push({ aliasId, canonicalId, localeSuffix, canonicalPath, canonicalRaw, additions })
  }
}

console.log(JSON.stringify({
  alias_files_with_unique_research: plans.length,
  records_to_merge: plans.reduce((sum, plan) => sum + plan.additions.length, 0),
  plans: plans.map(plan => ({
    from: `${plan.aliasId}${plan.localeSuffix}.json`,
    to: `${plan.canonicalId}${plan.localeSuffix}.json`,
    records: plan.additions.length,
  })),
}, null, 2))

if (!shouldWrite) {
  console.log('\nDry run only. Re-run with --write after reviewing the research merge.')
  process.exit(0)
}

for (const plan of plans) {
  await writeFile(plan.canonicalPath, appendToJsonArray(plan.canonicalRaw, plan.additions), 'utf8')
}
console.log(`\nMerged ${plans.reduce((sum, plan) => sum + plan.additions.length, 0)} research records; alias files were preserved.`)
