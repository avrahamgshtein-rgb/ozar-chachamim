#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const researchDir = resolve(repoRoot, 'nextjs-app', 'public', 'research')

function normalizeContent(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/\s+/gu, ' ')
    .trim()
}

function hashContent(value) {
  return createHash('sha256').update(normalizeContent(value), 'utf8').digest('hex')
}

function fingerprintContent(value) {
  const normalized = normalizeContent(value)
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ code, 0x85ebca6b)
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}:${normalized.length}`
}

function asEntries(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return [value]
  return []
}

const index = []
for (const fileName of await readdir(researchDir)) {
  if (!fileName.endsWith('.json') || /\.(en|ru)\.json$/i.test(fileName)) continue
  const raw = await readFile(resolve(researchDir, fileName), 'utf8')
  const entries = asEntries(JSON.parse(raw))
  for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
    const entry = entries[entryIndex]
    const normalized = normalizeContent(entry.content)
    index.push({
      sage_id: fileName.replace(/\.json$/i, ''),
      file_name: fileName,
      entry_index: entryIndex,
      title: String(entry.title || ''),
      source_file: String(entry.source_file || ''),
      drive_file_id: entry.drive_file_id ? String(entry.drive_file_id) : null,
      content_hash: hashContent(entry.content),
      content_fingerprint: fingerprintContent(entry.content),
      normalized_length: normalized.length,
    })
  }
}

process.stdout.write(JSON.stringify(index))
