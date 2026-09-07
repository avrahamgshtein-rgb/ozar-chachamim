#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const auditScript = resolve(repoRoot, 'scripts', 'audit-data-sync.mjs')
const result = spawnSync(process.execPath, [auditScript, '--check'], {
  cwd: repoRoot,
  encoding: 'utf8',
  stdio: 'inherit',
})

if (result.error) {
  console.error(`Unable to run graph audit: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
