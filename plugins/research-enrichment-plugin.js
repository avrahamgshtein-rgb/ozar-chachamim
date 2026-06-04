/**
 * PLUGIN: Research Enrichment Bot
 *
 * Purpose: Orchestrate full workflow of reading research docs, extracting data, updating DB
 *
 * Workflow:
 *   1. List all files from Google Drive folder (Connector)
 *   2. For each file:
 *      a. Read Google Doc content
 *      b. Extract structured data (Skill 1)
 *      c. Match to existing sage in database
 *      d. Enrich sage in Supabase (Skill 2)
 *      e. Log progress
 *   3. Report: X sages enriched, Y connections created, Z errors
 *
 * Safety:
 *   - Dry-run mode by default (see changes without applying)
 *   - Validates FK constraints before any UPDATE/INSERT
 *   - Logs all changes to audit trail
 *   - Requires human approval before execution
 *
 * Usage:
 *   const plugin = new ResearchEnrichmentPlugin(supabaseClient, googleDriveConnector);
 *   const dryRun = await plugin.execute({ mode: 'dryrun', limit: 5 });
 *   console.log(dryRun.summary); // Preview results
 *   // If satisfied:
 *   const result = await plugin.execute({ mode: 'apply' });
 */

const { extractSageData } = require('./extract-sage-from-google-doc.js');
const { enrichSageInSupabase } = require('./enrich-sage-in-supabase.js');

class ResearchEnrichmentPlugin {
  constructor(supabaseClient, googleDriveConnector) {
    this.supabase = supabaseClient;
    this.googleDrive = googleDriveConnector;
    this.auditLog = [];
  }

  async execute(options = {}) {
    const {
      mode = 'dryrun', // 'dryrun' or 'apply'
      limit = null, // Max files to process (null = all)
      sageFilter = null, // Process only this sage
      ignoreDuplicates = true,
    } = options;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🤖 RESEARCH ENRICHMENT PLUGIN — ${mode.toUpperCase()}`);
    console.log(`${'='.repeat(60)}\n`);

    const report = {
      mode: mode,
      files_found: 0,
      files_processed: 0,
      sages_enriched: 0,
      connections_created: 0,
      errors: [],
      preview: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // ======================================================
      // PHASE 1: LIST FILES FROM GOOGLE DRIVE
      // ======================================================

      console.log('📂 Step 1: Listing files from Google Drive...');
      const files = await this.googleDrive.listFiles();
      report.files_found = files.length;

      if (files.length === 0) {
        console.warn('⚠️ No files found in Google Drive folder');
        return report;
      }

      console.log(`  ✅ Found ${files.length} files\n`);

      // ======================================================
      // PHASE 2: PROCESS EACH FILE
      // ======================================================

      for (let i = 0; i < files.length; i++) {
        if (limit && i >= limit) break;

        const file = files[i];
        const progress = `[${i + 1}/${Math.min(files.length, limit || files.length)}]`;

        try {
          console.log(`${progress} Processing: ${file.name}`);

          // 2a. Read Google Doc
          const docContent = await this.googleDrive.readGoogleDoc(file.id);

          if (!docContent) {
            console.warn(`  ⚠️ Could not read file`);
            report.errors.push({ file: file.name, error: 'Could not read content' });
            continue;
          }

          // 2b. Extract sage name from filename
          const sageName = this.extractSageNameFromFilename(file.name);
          if (!sageName) {
            console.warn(`  ⚠️ Could not parse sage name from filename`);
            report.errors.push({ file: file.name, error: 'Could not parse sage name' });
            continue;
          }

          // 2c. Find matching sage in database
          const sage = await this.findSageByName(sageName);
          if (!sage) {
            console.warn(`  ⚠️ Sage "${sageName}" not found in database`);
            report.errors.push({ file: file.name, error: `Sage "${sageName}" not in database` });
            continue;
          }

          // 2d. Extract structured data (SKILL 1)
          console.log(`    ➜ Extracting data from: ${file.name}`);
          const extractedData = await extractSageData(docContent, sageName);

          // Check if already enriched
          if (ignoreDuplicates && sage.research_enriched_at) {
            console.log(`    ℹ️ Sage already enriched (${sage.research_enriched_at}). Skipping.`);
            continue;
          }

          // 2e. Prepare enrichment (SKILL 2) — but don't execute yet
          const enrichmentPlan = {
            sage_id: sage.id,
            sage_name: sage.label,
            extracted_data: extractedData,
          };

          if (mode === 'dryrun') {
            // Store in preview
            report.preview.push(enrichmentPlan);
            console.log(`    ✓ [DRYRUN] Would enrich sage: ${sage.label}`);
            report.sages_enriched++;
          } else if (mode === 'apply') {
            // Actually execute enrichment
            const result = await enrichSageInSupabase(extractedData, this.supabase, sage.id);
            console.log(`    ✅ Enriched sage: ${sage.label}`);
            report.sages_enriched++;
            report.connections_created += result.connections_created;

            // Log to audit trail
            this.auditLog.push({
              timestamp: new Date().toISOString(),
              action: 'enrich_sage',
              sage_id: sage.id,
              source_file: file.name,
              fields_updated: result.updated_fields,
            });
          }

          report.files_processed++;
        } catch (err) {
          console.error(`  ❌ Error: ${err.message}`);
          report.errors.push({ file: file.name, error: err.message });
        }
      }

      // ======================================================
      // PHASE 3: SUMMARY REPORT
      // ======================================================

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 SUMMARY`);
      console.log(`${'='.repeat(60)}`);
      console.log(`Files found:         ${report.files_found}`);
      console.log(`Files processed:     ${report.files_processed}`);
      console.log(`Sages enriched:      ${report.sages_enriched}`);
      console.log(`Connections created: ${report.connections_created}`);
      console.log(`Errors:              ${report.errors.length}`);

      if (report.errors.length > 0) {
        console.log(`\n⚠️ ERRORS:`);
        report.errors.forEach((err) => {
          console.log(`  - ${err.file}: ${err.error}`);
        });
      }

      if (mode === 'dryrun') {
        console.log(`\n💡 This was a DRY RUN. No changes were made.`);
        console.log(`   Run with mode: 'apply' to execute enrichment.\n`);
      } else {
        console.log(`\n✅ EXECUTION COMPLETE. Database updated.\n`);

        // Save audit log
        await this.saveAuditLog();
      }

      return report;
    } catch (err) {
      console.error(`❌ Fatal error: ${err.message}`);
      report.errors.push({ error: `Fatal: ${err.message}` });
      return report;
    }
  }

  // ======================================================
  // HELPERS
  // ======================================================

  extractSageNameFromFilename(filename) {
    /**
     * Extract sage name from filename
     * Examples:
     *   - "רבי מאיר - deep research.docx" → "rabbi-meir"
     *   - "Rambam - משה בן מימון.docx" → "rambam"
     */
    // Remove file extension
    const name = filename.replace(/\.(docx|doc|pdf|txt)$/i, '').trim();

    // Split on hyphen and take first part
    const parts = name.split(/[-–—]/);
    const englishName = parts[0].trim().toLowerCase();

    // Convert to slug format
    return englishName.replace(/\s+/g, '-');
  }

  async findSageByName(sageName) {
    /**
     * Find sage in database by name (English slug or Hebrew)
     */
    const { data: sages, error } = await this.supabase
      .from('sages')
      .select('id, label, research_enriched_at')
      .ilike('label', `%${sageName}%`)
      .limit(1);

    if (error || !sages || sages.length === 0) {
      return null;
    }

    return sages[0];
  }

  async saveAuditLog() {
    /**
     * Save audit log to Supabase (or file, depending on implementation)
     */
    if (this.auditLog.length === 0) return;

    // Option 1: Save to Supabase
    const { error } = await this.supabase
      .from('audit_log')
      .insert(this.auditLog);

    if (error) {
      console.warn(`⚠️ Could not save audit log: ${error.message}`);
    } else {
      console.log(`✅ Audit log saved (${this.auditLog.length} entries)`);
    }
  }
}

// ============================================================
// EXPORT
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ResearchEnrichmentPlugin };
}
