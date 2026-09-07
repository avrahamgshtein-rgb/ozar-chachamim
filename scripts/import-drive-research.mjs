#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestFlagIndex = process.argv.indexOf('--manifest')
const manifestArgument = manifestFlagIndex >= 0 ? process.argv[manifestFlagIndex + 1] : null
if (manifestFlagIndex >= 0 && !manifestArgument) {
  throw new Error('--manifest requires a path relative to the repository root')
}
const manifestPath = manifestArgument
  ? resolve(repoRoot, manifestArgument)
  : resolve(repoRoot, 'data', 'drive-research-import-2026-07-21.json')
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

function appendToJsonArray(raw, additions) {
  const trimmed = raw.trimEnd()
  const parsed = JSON.parse(trimmed)
  if (!Array.isArray(parsed)) {
    return `${JSON.stringify([...asEntries(parsed), ...additions])}\n`
  }
  if (additions.length === 0) return raw
  if (parsed.length === 0) return `[${additions.map(item => JSON.stringify(item)).join(',')}]\n`
  return `${trimmed.slice(0, -1)},${additions.map(item => JSON.stringify(item)).join(',')}]\n`
}

async function writeFileWithRetry(path, content) {
  let lastError
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await writeFile(path, content, 'utf8')
      return
    } catch (error) {
      lastError = error
      if (!['UNKNOWN', 'EBUSY', 'EPERM'].includes(error.code) || attempt === 4) throw error
      await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 250))
    }
  }
  throw lastError
}

const manifest = await readJson(manifestPath)
const mapped = manifest.entries.filter(entry => entry.status === 'mapped')
const pending = manifest.entries.filter(entry => entry.status === 'new_sage' || entry.status === 'topic')
const skipped = manifest.entries.filter(entry => entry.status === 'already_present')
const graphFiles = [
  resolve(repoRoot, 'data.json'),
  resolve(repoRoot, 'nextjs-app', 'public', 'data-supplement.json'),
  resolve(repoRoot, 'nextjs-app', 'public', 'data-supplement-2.json'),
]
const sageIds = new Set()
for (const graphFile of graphFiles) {
  const graph = await readJson(graphFile)
  for (const node of graph.nodes || []) sageIds.add(String(node.id))
}

const missingSageIds = [...new Set(mapped
  .map(entry => String(entry.sage_id))
  .filter(id => !sageIds.has(id)))]

if (missingSageIds.length > 0) {
  throw new Error(`Mapped research references missing sage ids: ${missingSageIds.join(', ')}`)
}

const existingByDriveId = new Map()
for (const fileName of await readdir(researchDir)) {
  if (!fileName.endsWith('.json')) continue
  const filePath = resolve(researchDir, fileName)
  let entries
  try {
    entries = asEntries(await readJson(filePath))
  } catch (error) {
    throw new Error(`Invalid research JSON in ${fileName}: ${error.message}`)
  }
  for (const entry of entries) {
    if (entry.drive_file_id) existingByDriveId.set(String(entry.drive_file_id), fileName)
  }
}

const groups = new Map()
let duplicateCount = 0
for (const entry of mapped) {
  const driveId = String(entry.drive_file_id)
  const existingFile = existingByDriveId.get(driveId)
  if (existingFile) {
    if (existingFile !== `${entry.sage_id}.json`) {
      throw new Error(`Drive document ${driveId} already belongs to ${existingFile}, not ${entry.sage_id}.json`)
    }
    duplicateCount += 1
    continue
  }
  const id = String(entry.sage_id)
  if (!groups.has(id)) groups.set(id, [])
  groups.get(id).push({
    title: entry.title,
    source_file: `${entry.title}.gdoc`,
    word_count: entry.word_count,
    content: entry.content,
    source_type: 'google_drive',
    drive_file_id: driveId,
    drive_url: entry.drive_url,
    drive_modified_time: entry.drive_modified_time,
    alternate_drive_file_ids: entry.alternate_drive_file_ids || undefined,
    imported_at: manifest.generated_at,
  })
}

console.log([
  `Manifest entries: ${manifest.entries.length}`,
  `Mapped to existing sages: ${mapped.length}`,
  `Pending new sages/topics: ${pending.length}`,
  `Already present by title/content audit: ${skipped.length}`,
  `Already imported by Drive id: ${duplicateCount}`,
  `Research files to update: ${groups.size}`,
  `Research records to append: ${[...groups.values()].reduce((sum, entries) => sum + entries.length, 0)}`,
].join('\n'))

if (!shouldWrite) {
  console.log('\nDry run only. Re-run with --write after reviewing the manifest.')
  process.exit(0)
}

for (const [sageId, additions] of groups) {
  const filePath = resolve(researchDir, `${sageId}.json`)
  let raw = '[]\n'
  try {
    raw = await readFile(filePath, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  await writeFileWithRetry(filePath, appendToJsonArray(raw, additions))
}

console.log(`\nImported ${[...groups.values()].reduce((sum, entries) => sum + entries.length, 0)} Drive research records.`)
