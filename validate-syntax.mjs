// Quick check: can we even parse the JSON files?
import fs from 'fs';

try {
  console.log('🔍 Validating JSON files...\n');
  
  const research = JSON.parse(fs.readFileSync('./research.json', 'utf8'));
  console.log(`✅ research.json: Valid (${research.length} docs)`);
  
  const summaries = JSON.parse(fs.readFileSync('./research_summaries.json', 'utf8'));
  console.log(`✅ research_summaries.json: Valid (${summaries.length} summaries)`);
  
  const bySage = JSON.parse(fs.readFileSync('./research_by_sage.json', 'utf8'));
  console.log(`✅ research_by_sage.json: Valid (${Object.keys(bySage).length} sages)`);
  
  // Check first summary has required fields
  if (summaries[0]) {
    const s = summaries[0];
    console.log(`\n✅ First summary structure:`);
    console.log(`   file: ${s.file ? '✓' : '✗'}`);
    console.log(`   title: ${s.title ? '✓' : '✗'}`);
    console.log(`   summary: ${s.summary ? '✓' : '✗'}`);
    console.log(`   sage_id: ${s.sage_id || 'null'}`);
  }
  
  // Check first research doc has required fields
  if (research[0]) {
    const r = research[0];
    console.log(`\n✅ First research doc structure:`);
    console.log(`   source_file: ${r.source_file ? '✓' : '✗'}`);
    console.log(`   content length: ${r.content ? r.content.length : 0} chars`);
    console.log(`   sage_id: ${r.sage_id || 'null'}`);
  }
  
  console.log('\n✅ All files are valid JSON!');
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
