/**
 * HOOK: on-file-upload.js
 *
 * Triggered when a new file is added to /data/ folder
 * Auto-enriches Supabase with sage data from the file
 *
 * Usage:
 *   - Automatically called by watch-local-folder.js
 *   - Can also be called manually: node hooks/on-file-upload.js <filepath>
 *
 * Flow:
 *   1. File appears in /data/
 *   2. watch-local-folder.js detects it
 *   3. on-file-upload.js executes
 *   4. Extracts sage data
 *   5. Enriches Supabase
 *   6. Moves file to /data/processed/ or /data/failed/
 *   7. Logs to audit_log
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ============================================================
// HOOK HANDLER
// ============================================================

async function onFileUpload(filePath, options = {}) {
  /**
   * Main hook handler
   * Called when file is detected in /data/
   *
   * @param {string} filePath - Full path to file
   * @param {object} options - Optional: {silent: false, logLevel: 'info'}
   * @returns {object} Result: {success, message, sageId, sageLabel}
   */

  const startTime = Date.now();
  const verbose = !options.silent;

  try {
    // ======================================================
    // STEP 1: VALIDATE FILE
    // ======================================================

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath).toLowerCase();

    if (!['.docx', '.txt', '.md'].includes(fileExt)) {
      throw new Error(`Unsupported file type: ${fileExt}`);
    }

    if (verbose) {
      console.log(`🔔 [Hook] Processing: ${fileName}`);
    }

    // ======================================================
    // STEP 2: EXTRACT SAGE DATA
    // ======================================================

    const { extractSageDataFromFile } = require('../skills/extract-sage-from-local-file.js');
    const extractedData = await extractSageDataFromFile(filePath);

    if (verbose) {
      console.log(`  ✓ Extracted: ${extractedData.sage_name_english}`);
      console.log(`    - Bio: ${extractedData.bio?.substring(0, 50)}...`);
      console.log(`    - Works: ${extractedData.main_works?.length || 0}`);
      console.log(`    - Ideas: ${extractedData.key_ideas?.length || 0}`);
      console.log(`    - Locations: ${extractedData.locations?.join(', ') || 'N/A'}`);
    }

    // ======================================================
    // STEP 3: FIND SAGE IN SUPABASE
    // ======================================================

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const sageName = extractedData.sage_name_english
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const { data: sages, error: searchError } = await supabase
      .from('sages')
      .select('id, label')
      .ilike('label', `%${sageName}%`)
      .limit(1);

    if (searchError || !sages || sages.length === 0) {
      throw new Error(`Sage not found in database: ${sageName}`);
    }

    const sage = sages[0];
    if (verbose) {
      console.log(`  ✓ Found sage: ${sage.label} (ID: ${sage.id})`);
    }

    // ======================================================
    // STEP 4: ENRICH SUPABASE
    // ======================================================

    const { enrichSageInSupabase } = require('../skills/enrich-sage-in-supabase.js');

    const enrichResult = await enrichSageInSupabase(extractedData, supabase, sage.id);

    if (verbose) {
      console.log(`  ✓ Enriched: ${enrichResult.updated_fields.join(', ')}`);
      if (enrichResult.connections_created > 0) {
        console.log(`  ✓ Created ${enrichResult.connections_created} connection(s)`);
      }
    }

    // ======================================================
    // STEP 5: LOG TO AUDIT TRAIL
    // ======================================================

    const { error: auditError } = await supabase.from('audit_log').insert({
      action: 'enrich_from_local_file',
      sage_name: sage.label,
      source_file: fileName,
      timestamp: new Date().toISOString(),
    });

    if (auditError) {
      console.warn(`⚠️ Could not log to audit_log: ${auditError.message}`);
    }

    // ======================================================
    // STEP 6: MOVE FILE TO PROCESSED
    // ======================================================

    const processedDir = path.join(path.dirname(filePath), 'processed');
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    const processedPath = path.join(processedDir, fileName);
    fs.renameSync(filePath, processedPath);

    if (verbose) {
      console.log(`  ✓ Moved to: processed/`);
    }

    const duration = Date.now() - startTime;

    // ======================================================
    // RETURN SUCCESS
    // ======================================================

    const result = {
      success: true,
      message: `✅ Enriched: ${sage.label}`,
      sageId: sage.id,
      sageLabel: sage.label,
      fileName: fileName,
      fieldsUpdated: enrichResult.updated_fields,
      connectionsCreated: enrichResult.connections_created,
      duration: duration,
    };

    if (verbose) {
      console.log(`✅ [Hook] Complete in ${duration}ms\n`);
    }

    return result;
  } catch (err) {
    console.error(`❌ [Hook] Error: ${err.message}`);

    // Move file to failed folder
    try {
      const failedDir = path.join(path.dirname(filePath), 'failed');
      if (!fs.existsSync(failedDir)) {
        fs.mkdirSync(failedDir, { recursive: true });
      }
      const failedPath = path.join(failedDir, path.basename(filePath));
      fs.renameSync(filePath, failedPath);
      console.log(`  → Moved to: failed/`);
    } catch (moveErr) {
      console.warn(`⚠️ Could not move to failed/: ${moveErr.message}`);
    }

    return {
      success: false,
      message: `❌ Error: ${err.message}`,
      error: err.message,
    };
  }
}

// ============================================================
// BATCH PROCESSOR (for multiple files)
// ============================================================

async function onFileUploadBatch(folderPath, options = {}) {
  /**
   * Process all files in a folder
   * Used by watch mode to process batches
   *
   * @param {string} folderPath - Path to /data/ folder
   * @param {object} options - {limit: 10, verbose: true}
   * @returns {object} Results: {processed, failed, summary}
   */

  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }

  const files = fs
    .readdirSync(folderPath)
    .filter((f) => !['.gitkeep', 'processed', 'failed'].includes(f) && f.endsWith('.docx', '.txt', '.md'))
    .slice(0, options.limit || 10);

  if (files.length === 0) {
    return {
      processed: 0,
      failed: 0,
      summary: 'No files to process',
    };
  }

  const results = [];

  for (const fileName of files) {
    const filePath = path.join(folderPath, fileName);
    const result = await onFileUpload(filePath, options);
    results.push(result);

    // Small delay between files (prevent DB overload)
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const processed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    processed,
    failed,
    files: results,
    summary: `Processed: ${processed}, Failed: ${failed}`,
  };
}

// ============================================================
// CLI USAGE (when called directly)
// ============================================================

if (require.main === module) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.log('📖 File Upload Hook\n');
    console.log('Usage: node hooks/on-file-upload.js <filepath>');
    console.log('Example: node hooks/on-file-upload.js data/rambam-research.docx');
    process.exit(0);
  }

  onFileUpload(filePath).then((result) => {
    if (result.success) {
      console.log(result.message);
      process.exit(0);
    } else {
      console.error(result.message);
      process.exit(1);
    }
  });
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  onFileUpload,
  onFileUploadBatch,
};
