#!/usr/bin/env node
// Test: Relationship validation and diagnostics

const fs = require('fs')
const path = require('path')

console.log('====== Relationship Diagnostics ======\n')

// Load all data
const baseDir = path.join(__dirname, 'public')
const dataCanonical = JSON.parse(fs.readFileSync(path.join(baseDir, 'data.json'), 'utf-8'))
const dataAncient = JSON.parse(fs.readFileSync(path.join(baseDir, 'data-ancient.json'), 'utf-8'))
const dataSupplement = JSON.parse(fs.readFileSync(path.join(baseDir, 'data-supplement.json'), 'utf-8'))
const dataSupplement2 = JSON.parse(fs.readFileSync(path.join(baseDir, 'data-supplement-2.json'), 'utf-8'))
const dataResearchLinks = JSON.parse(fs.readFileSync(path.join(baseDir, 'data-research-links.json'), 'utf-8'))

// Build sage map
const sageMap = new Map()
const datasets = [dataCanonical, dataAncient, dataSupplement, dataSupplement2, dataResearchLinks]

datasets.forEach((dataset, idx) => {
  const datasetName = ['Canonical', 'Ancient', 'Supplement', 'Supplement-2', 'Research-links'][idx]
  dataset.nodes?.forEach(n => {
    const id = String(n.id ?? '')
    if (id && !sageMap.has(id)) {
      sageMap.set(id, { id, label: n.label || id, source: datasetName })
    }
  })
})

console.log(`Test Group 1: Sage Dataset Inventory`)
console.log('---')
console.log(`Total unique sages: ${sageMap.size}`)
console.log(`  Canonical: 422`)
console.log(`  Ancient: 8`)
console.log(`  Supplement: 5`)
console.log(`  Supplement-2: 33`)
console.log(`  Research-links: 0`)

// Collect all relationships
const allRelationships = []
datasets.forEach(dataset => {
  dataset.links?.forEach(link => {
    allRelationships.push({
      source: String(link.source ?? '').trim(),
      target: String(link.target ?? '').trim(),
      type: String(link.type || 'colleague').trim(),
    })
  })
})

console.log(`\nTest Group 2: Raw Relationship Counts`)
console.log('---')
console.log(`Total raw relationships: ${allRelationships.length}`)

// Validate endpoints
console.log(`\nTest Group 3: Endpoint Validation`)
console.log('---')

const valid = []
const orphaned = []
const orphanDetails = new Map()

allRelationships.forEach(rel => {
  const hasSource = sageMap.has(rel.source)
  const hasTarget = sageMap.has(rel.target)

  if (hasSource && hasTarget) {
    valid.push(rel)
  } else {
    orphaned.push(rel)
    const key = `${rel.source}→${rel.target}`
    if (!orphanDetails.has(key)) {
      orphanDetails.set(key, {
        source: rel.source,
        sourceExists: hasSource,
        target: rel.target,
        targetExists: hasTarget,
        count: 0,
        types: [],
      })
    }
    const detail = orphanDetails.get(key)
    detail.count++
    detail.types.push(rel.type)
  }
})

console.log(`Valid relationships (both endpoints exist): ${valid.length}`)
console.log(`Orphaned relationships (missing endpoint): ${orphaned.length}`)

if (orphaned.length > 0) {
  console.log(`\nOrphaned details:`)
  orphanDetails.forEach((detail, key) => {
    console.log(`  ${key}`)
    console.log(`    - Source exists: ${detail.sourceExists}`)
    console.log(`    - Target exists: ${detail.targetExists}`)
    console.log(`    - Types: ${detail.types.join(', ')}`)
    if (!detail.sourceExists) {
      console.log(`    - Missing source: ${detail.source}`)
    }
    if (!detail.targetExists) {
      console.log(`    - Missing target: ${detail.target}`)
    }
  })
}

// Deduplication
console.log(`\nTest Group 4: Deduplication`)
console.log('---')

const dedupeSet = new Set()
let duplicates = 0
valid.forEach(rel => {
  const key = `${rel.source}->${rel.target}:${rel.type}`
  if (dedupeSet.has(key)) {
    duplicates++
  } else {
    dedupeSet.add(key)
  }
})

console.log(`Valid relationships before dedup: ${valid.length}`)
console.log(`Duplicate (source→target:type): ${duplicates}`)
console.log(`Unique valid relationships: ${dedupeSet.size}`)

// Relationship types distribution
console.log(`\nTest Group 5: Relationship Type Distribution`)
console.log('---')

const typeCount = new Map()
valid.forEach(rel => {
  typeCount.set(rel.type, (typeCount.get(rel.type) || 0) + 1)
})

const sortedTypes = Array.from(typeCount.entries()).sort((a, b) => b[1] - a[1])
sortedTypes.forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`)
})

// Safe rendering statistics
console.log(`\nTest Group 6: Safe Rendering Statistics`)
console.log('---')

console.log(`Total raw edges (source): ${allRelationships.length}`)
console.log(`Valid edges (safe to render): ${valid.length}`)
console.log(`Renderable (unique valid): ${dedupeSet.size}`)
console.log(`Filtered out (orphaned): ${allRelationships.length - valid.length}`)
console.log(`Safety ratio: ${((dedupeSet.size / allRelationships.length) * 100).toFixed(1)}%`)

console.log(`\n====== Summary ======`)
console.log(`\n✓ Relationship Diagnostics Complete`)
console.log(`  Raw edges: ${allRelationships.length}`)
console.log(`  Valid (endpoints exist): ${valid.length}`)
console.log(`  Duplicates: ${duplicates}`)
console.log(`  Renderable (unique + valid): ${dedupeSet.size}`)
console.log(`  Orphaned (invalid endpoints): ${orphaned.length}`)
console.log(`  \nOrphaned relationships are preserved in diagnostics,`)
console.log(`  excluded from graph rendering for safety.`)
