#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const dataPath = './data.json';
const backupPath = './data.json.backup';

console.log('📦 Starting data compression...');

// Read original file
const original = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const originalSize = fs.statSync(dataPath).size;

// Compress nodes - keep only essential fields
const compressed = {
  nodes: original.nodes.map(node => ({
    id: node.id,
    label: node.label,
    era: node.era,
    era_key: node.era_key,
    field: node.field,
    location: node.location,
    bio: node.bio ? node.bio.substring(0, 100) : ''
  })),
  links: original.links
};

// Calculate compression
const compressedJson = JSON.stringify(compressed);
const newSize = compressedJson.length;
const saved = originalSize - newSize;
const percent = ((saved / originalSize) * 100).toFixed(1);

console.log(`✅ Compression Results:`);
console.log(`   Original:   ${(originalSize / 1024).toFixed(1)}K`);
console.log(`   Compressed: ${(newSize / 1024).toFixed(1)}K`);
console.log(`   Saved:      ${(saved / 1024).toFixed(1)}K (${percent}%)`);

// Backup and save
fs.copyFileSync(dataPath, backupPath);
fs.writeFileSync(dataPath, compressedJson);
console.log(`✅ Saved! Backup: data.json.backup`);
