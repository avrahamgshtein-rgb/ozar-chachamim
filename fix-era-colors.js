import fs from 'fs';

// Map era names (English) to era_key
const eraMap = {
  'Second Temple': 'second-temple',
  'Tannaim': 'tannaim',
  'Amoraim': 'amoraim',
  'Geonim': 'geonim',
  'Rishonim': 'rishonim',
  'Acharonim': 'acharonim',
  'Modern': 'modern',
  'בית שני': 'second-temple',
  'תנאים': 'tannaim',
  'אמוראים': 'amoraim',
  'גאונים': 'geonim',
  'ראשונים': 'rishonim',
  'אחרונים': 'acharonim',
  'עת חדשה': 'modern'
};

const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));

const before = data.nodes.length;
data.nodes = data.nodes.map(node => ({
  ...node,
  era_key: eraMap[node.era] || 'unknown'
}));

const withoutKey = data.nodes.filter(n => n.era_key === 'unknown').length;
fs.writeFileSync('./data.json', JSON.stringify(data));

console.log(`✅ Fixed era_key for all sages`);
console.log(`📊 Total: ${before} sages`);
console.log(`⚠️  Unmapped: ${withoutKey}`);

// Show unique era values
const uniqueEras = [...new Set(data.nodes.map(n => n.era))];
console.log(`🏷️  Unique eras:`, uniqueEras);
