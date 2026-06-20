import fs from 'fs';

const research = JSON.parse(fs.readFileSync('./research.json', 'utf8'));
const summaries = JSON.parse(fs.readFileSync('./research_summaries.json', 'utf8'));

// Rebuild with sage_id from research.json
const rebuilt = {};

// For each research document, find matching summary by title similarity
research.forEach(doc => {
  // Extract title from first 100 chars of content
  const contentTitle = doc.content.split('\n')[0].substring(0, 80);
  
  // Try to find matching summary
  let matched = null;
  for (const [key, summary] of Object.entries(summaries)) {
    // Simple title matching
    if (summary.title && contentTitle.includes(summary.title.substring(0, 20))) {
      matched = summary;
      break;
    }
  }

  if (matched) {
    const updated = { ...matched, sage_id: doc.sage_id };
    const newKey = `${doc.sage_id}_${matched.file}`;
    rebuilt[newKey] = updated;
  }
});

console.log(`✅ Rebuilt ${Object.keys(rebuilt).length} research summaries with sage_id`);
console.log(`📊 Sample:`, Object.entries(rebuilt)[0]);

fs.writeFileSync('./research_summaries.json', JSON.stringify(rebuilt, null, 2));
console.log('💾 Saved to research_summaries.json');
