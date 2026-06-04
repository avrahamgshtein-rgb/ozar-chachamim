/**
 * WATCH LOCAL FOLDER — Automatic Sage Enrichment
 *
 * Purpose: Monitor data/ folder for new research files and automatically:
 * 1. Extract sage data from Word/Google Doc files
 * 2. Enrich Supabase
 * 3. Update website in real-time
 *
 * Usage:
 *   node watch-local-folder.js                    # Watch mode (continuous)
 *   node watch-local-folder.js --once             # Process once, exit
 *   node watch-local-folder.js --folder=<path>   # Custom folder
 *
 * File Format:
 *   Place files in: C:\Users\User\Desktop\ozar-chachamim\data\
 *   ├── רבי מאיר - מחקר עמוק.docx
 *   ├── רמב״ם - חייו ופעולו.docx
 *   └── [sage name].docx or .md or .txt
 *
 * Each file:
 * 1. Gets processed automatically
 * 2. Sage name extracted from filename
 * 3. Content extracted (docx/txt/md supported)
 * 4. Matched to existing sage in Supabase
 * 5. Database enriched
 * 6. File moved to data/processed/
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { extractSageDataFromFile } = require('./skills/extract-sage-from-local-file.js');
const { enrichSageInSupabase } = require('./skills/enrich-sage-in-supabase.js');

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  dataFolder: process.env.DATA_FOLDER || './data',
  processedFolder: './data/processed',
  failedFolder: './data/failed',
  watchInterval: 5000, // Check every 5 seconds
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
};

// ============================================================
// INITIALIZE
// ============================================================

const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.serviceRoleKey);

// Create folders if they don't exist
[CONFIG.dataFolder, CONFIG.processedFolder, CONFIG.failedFolder].forEach((folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    console.log(`✅ Created folder: ${folder}`);
  }
});

// ============================================================
// MAIN WATCH FUNCTION
// ============================================================

async function processFile(filePath) {
  const fileName = path.basename(filePath);
  const fileExt = path.extname(filePath).toLowerCase();

  console.log(`\n📄 Processing: ${fileName}`);

  try {
    // ======================================================
    // STEP 1: VALIDATE FILE
    // ======================================================

    if (!['.docx', '.doc', '.txt', '.md'].includes(fileExt)) {
      throw new Error(`Unsupported file type: ${fileExt} (use .docx, .txt, or .md)`);
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    // ======================================================
    // STEP 2: EXTRACT SAGE NAME FROM FILENAME
    // ======================================================

    const sageName = extractSageNameFromFilename(fileName);
    if (!sageName) {
      throw new Error(`Could not parse sage name from filename: ${fileName}`);
    }

    console.log(`  ✓ Sage name: ${sageName}`);

    // ======================================================
    // STEP 3: READ FILE CONTENT
    // ======================================================

    console.log(`  ✓ Reading file...`);
    const fileContent = await extractSageDataFromFile(filePath);

    // ======================================================
    // STEP 4: EXTRACT STRUCTURED DATA
    // ======================================================

    console.log(`  ✓ Extracting data...`);
    const extractedData = await extractSageDataFromFile(filePath, sageName);

    // ======================================================
    // STEP 5: FIND SAGE IN DATABASE
    // ======================================================

    const sage = await findSageByName(sageName);
    if (!sage) {
      throw new Error(`Sage "${sageName}" not found in Supabase`);
    }

    console.log(`  ✓ Found sage: ${sage.label}`);

    // ======================================================
    // STEP 6: ENRICH IN SUPABASE
    // ======================================================

    console.log(`  ✓ Enriching Supabase...`);
    const result = await enrichSageInSupabase(extractedData, supabase, sage.id);

    console.log(`  ✅ ENRICHED: ${sage.label}`);
    console.log(`     Fields updated: ${result.updated_fields.join(', ')}`);
    console.log(`     Connections created: ${result.connections_created}`);

    // ======================================================
    // STEP 7: MOVE TO PROCESSED
    // ======================================================

    const processedPath = path.join(CONFIG.processedFolder, fileName);
    fs.copyFileSync(filePath, processedPath);
    fs.unlinkSync(filePath); // Delete original

    console.log(`  ✓ Moved to: data/processed/\n`);

    return { success: true, sageName: sage.label };
  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);

    // Move to failed folder
    try {
      const failedPath = path.join(CONFIG.failedFolder, fileName);
      fs.copyFileSync(filePath, failedPath);
      fs.unlinkSync(filePath);
      console.log(`  ✓ Moved to: data/failed/ (manual review needed)\n`);
    } catch (moveErr) {
      console.error(`  ⚠️ Could not move file: ${moveErr.message}\n`);
    }

    return { success: false, error: err.message };
  }
}

async function watchFolder(onceMode = false) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('👁️  WATCHING LOCAL FOLDER FOR SAGE UPDATES');
  console.log(`${'='.repeat(60)}`);
  console.log(`Folder: ${CONFIG.dataFolder}`);
  console.log(`Mode: ${onceMode ? 'ONCE (exit after processing)' : 'CONTINUOUS (watch)'}\n`);

  const processedFiles = new Set();

  const checkFolder = async () => {
    try {
      const files = fs.readdirSync(CONFIG.dataFolder);
      const newFiles = files.filter((f) => !processedFiles.has(f) && !f.startsWith('.'));

      if (newFiles.length > 0) {
        console.log(`\n🔔 Found ${newFiles.length} new file(s):`);
        for (const file of newFiles) {
          const filePath = path.join(CONFIG.dataFolder, file);
          const stat = fs.statSync(filePath);

          if (stat.isFile()) {
            const result = await processFile(filePath);
            processedFiles.add(file);

            // Log to audit
            if (result.success) {
              await logEnrichment(result.sageName, file);
            }
          }
        }
      } else if (files.length > 0) {
        // Files exist but already processed
        // (silent)
      }
    } catch (err) {
      console.error(`Error checking folder: ${err.message}`);
    }

    // If once mode, exit after first check
    if (onceMode) {
      console.log('\n✅ Single run complete. Exiting.');
      process.exit(0);
    }
  };

  // Check immediately
  await checkFolder();

  // Continue checking if not onceMode
  if (!onceMode) {
    console.log(`⏰ Waiting for new files (checking every ${CONFIG.watchInterval}ms)...`);
    console.log('💡 Tip: Drop .docx files into data/ folder and they\'ll upload automatically!\n');

    setInterval(checkFolder, CONFIG.watchInterval);
  }
}

// ============================================================
// HELPERS
// ============================================================

function extractSageNameFromFilename(filename) {
  /**
   * Extract sage name from filename
   * Examples:
   *   - "רבי מאיר - מחקר עמוק.docx" → "rabbi-meir"
   *   - "Rambam - משה בן מימון.docx" → "rambam"
   */
  const name = filename.replace(/\.[^.]+$/, '').trim(); // Remove extension
  const parts = name.split(/[-–—]/); // Split on hyphen
  const englishName = parts[0].trim().toLowerCase();
  return englishName.replace(/\s+/g, '-'); // Convert to slug
}

async function findSageByName(sageName) {
  /**
   * Find sage in database by English name
   */
  const { data: sages } = await supabase
    .from('sages')
    .select('id, label')
    .ilike('label', `%${sageName}%`)
    .limit(1);

  return sages && sages.length > 0 ? sages[0] : null;
}

async function logEnrichment(sageName, sourceFile) {
  /**
   * Log enrichment to audit trail
   */
  const { error } = await supabase
    .from('audit_log')
    .insert([
      {
        action: 'enrich_from_local_file',
        sage_name: sageName,
        source_file: sourceFile,
        source_type: 'local_watch',
        timestamp: new Date().toISOString(),
      },
    ]);

  if (error) {
    console.warn(`⚠️ Could not log enrichment: ${error.message}`);
  }
}

// ============================================================
// CLI ARGUMENT PARSING
// ============================================================

const args = process.argv.slice(2);
const onceMode = args.includes('--once');
const folderArg = args.find((a) => a.startsWith('--folder='));

if (folderArg) {
  CONFIG.dataFolder = folderArg.split('=')[1];
}

// ============================================================
// START WATCHING
// ============================================================

watchFolder(onceMode).catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Watcher stopped. Goodbye!\n');
  process.exit(0);
});
