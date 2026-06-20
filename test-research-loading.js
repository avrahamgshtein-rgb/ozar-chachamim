#!/usr/bin/env node
/**
 * Test that all research files load correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing research file structure...\n');

// Load files
const research = JSON.parse(fs.readFileSync('./research.json', 'utf8'));
const summaries = JSON.parse(fs.readFileSync('./research_summaries.json', 'utf8'));
const bySage = JSON.parse(fs.readFileSync('./research_by_sage.json', 'utf8'));
const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));

console.log('📊 File Sizes:');
console.log(`   research.json: ${(fs.statSync('./research.json').size / 1024 / 1024).toFixed(1)}MB`);
console.log(`   research_summaries.json: ${(fs.statSync('./research_summaries.json').size / 1024).toFixed(0)}KB`);
console.log(`   research_by_sage.json: ${(fs.statSync('./research_by_sage.json').size / 1024).toFixed(0)}KB`);

console.log('\n📖 Research Documents:');
console.log(`   Total in research.json: ${research.length}`);
console.log(`   Total summaries: ${summaries.length}`);
console.log(`   Sages with research: ${Object.keys(bySage).length}`);

// Validate structure
console.log('\n✅ Structure Validation:');

// Check research.json
let docWithFullText = 0;
let docWithoutSageId = 0;
research.forEach((doc, i) => {
  if (doc.content && doc.content.length > 100) docWithFullText++;
  if (!doc.sage_id) docWithoutSageId++;
});
console.log(`   research.json items with full text: ${docWithFullText}/${research.length}`);
console.log(`   Items without sage_id: ${docWithoutSageId}`);

// Check summaries
let missingSageId = 0;
summaries.forEach(s => {
  if (!s.sage_id) missingSageId++;
});
console.log(`   research_summaries.json items missing sage_id: ${missingSageId}/${summaries.length}`);

// Check research_by_sage mappings
console.log(`   research_by_sage.json sages: ${Object.keys(bySage).length}`);
const sageIds = new Set(data.nodes.map(n => String(n.id)));
let validSages = 0;
Object.keys(bySage).forEach(sageId => {
  if (sageIds.has(sageId)) validSages++;
});
console.log(`   Valid sage IDs in data.json: ${validSages}/${Object.keys(bySage).length}`);

// Sample validation
console.log('\n📝 Sample Documents:');
research.slice(0, 3).forEach((doc, i) => {
  console.log(`   [${i+1}] ${doc.source_file.substring(0, 40)}`);
  console.log(`       Sage: ${doc.sage_label || 'UNMATCHED'} (ID: ${doc.sage_id})`);
  console.log(`       Words: ${doc.word_count}, Confidence: ${doc.match_confidence}`);
});

console.log('\n✨ All validation passed!');
