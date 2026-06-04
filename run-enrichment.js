/**
 * MAIN SCRIPT: Research Enrichment Workflow
 *
 * Usage:
 *   node run-enrichment.js --dryrun         # Preview changes
 *   node run-enrichment.js --apply          # Execute enrichment
 *   node run-enrichment.js --test --limit 3 # Test with first 3 files
 *
 * Environment variables required:
 *   SUPABASE_URL              - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (server-only)
 *   GOOGLE_DRIVE_FOLDER_ID    - Your Google Drive research folder ID
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const GoogleDriveConnector = require('./connectors/google-drive-connector.js');
const { ResearchEnrichmentPlugin } = require('./plugins/research-enrichment-plugin.js');

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  googleDrive: {
    serviceAccountFile: './google-drive-service-account.json',
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '1_E2VtWpJ6RLyHCxvOV9_NUmIUZkZU3Jc',
  },
};

// ============================================================
// PARSE COMMAND-LINE ARGUMENTS
// ============================================================

const args = process.argv.slice(2);
const options = {
  mode: 'dryrun', // default
  limit: null,
  interactive: true,
};

for (const arg of args) {
  if (arg === '--apply') options.mode = 'apply';
  if (arg === '--dryrun') options.mode = 'dryrun';
  if (arg === '--test') options.limit = 5;
  if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1]);
  if (arg === '--force') options.interactive = false;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

async function runEnrichment() {
  try {
    // Validate configuration
    if (!CONFIG.supabase.url || !CONFIG.supabase.serviceRoleKey) {
      throw new Error(
        'Missing environment variables:\n' +
          '  SUPABASE_URL\n' +
          '  SUPABASE_SERVICE_ROLE_KEY\n' +
          'Set these in .env file or export them.'
      );
    }

    console.log('\n' + '='.repeat(60));
    console.log('🚀 OZAR CHACHAMIM — RESEARCH ENRICHMENT WORKFLOW');
    console.log('='.repeat(60) + '\n');

    // ======================================================
    // STEP 1: CONNECT TO SUPABASE
    // ======================================================

    console.log('📊 Connecting to Supabase...');
    const supabase = createClient(CONFIG.supabase.url, CONFIG.supabase.serviceRoleKey);

    // Verify connection
    const { data: testData, error: testError } = await supabase
      .from('sages')
      .select('count(*)', { count: 'exact' })
      .limit(1);

    if (testError) {
      throw new Error(`Supabase connection failed: ${testError.message}`);
    }

    console.log('✅ Connected to Supabase\n');

    // ======================================================
    // STEP 2: CONNECT TO GOOGLE DRIVE
    // ======================================================

    console.log('🔌 Connecting to Google Drive...');
    const googleDrive = new GoogleDriveConnector(
      CONFIG.googleDrive.serviceAccountFile,
      CONFIG.googleDrive.folderId
    );

    await googleDrive.initialize();
    console.log('✅ Connected to Google Drive\n');

    // ======================================================
    // STEP 3: INITIALIZE PLUGIN
    // ======================================================

    console.log('🤖 Initializing Research Enrichment Plugin...\n');
    const plugin = new ResearchEnrichmentPlugin(supabase, googleDrive);

    // ======================================================
    // STEP 4: DRY RUN
    // ======================================================

    if (options.mode === 'dryrun') {
      console.log('🔍 PREVIEW MODE (DRY RUN)\n');
      console.log('This will show what WOULD happen, without making changes.\n');

      const result = await plugin.execute({
        mode: 'dryrun',
        limit: options.limit,
      });

      console.log(`\n${'='.repeat(60)}`);
      console.log('PREVIEW SUMMARY');
      console.log('='.repeat(60));
      console.log(`Would enrich: ${result.sages_enriched} sages`);
      console.log(`Would create: ${result.connections_created} connections`);
      console.log(`Errors: ${result.errors.length}`);

      if (result.preview.length > 0) {
        console.log(`\n📋 Sample enrichments (first 3):`);
        result.preview.slice(0, 3).forEach((plan, i) => {
          console.log(`\n  ${i + 1}. ${plan.sage_name}`);
          console.log(`     Bio: ${plan.extracted_data.bio?.substring(0, 80)}...`);
          console.log(`     Works: ${plan.extracted_data.main_works?.length || 0} found`);
          console.log(`     Ideas: ${plan.extracted_data.key_ideas?.length || 0} found`);
        });
      }

      // Offer to execute
      if (options.interactive) {
        console.log(`\n${'='.repeat(60)}`);
        const readlineSync = require('readline-sync');
        const confirm = readlineSync.question(
          '\n✅ Ready to execute? (type "yes" to proceed): ',
          { defaultInput: 'no' }
        );

        if (confirm.toLowerCase() === 'yes') {
          console.log('\n🚀 Executing enrichment...\n');
          const applyResult = await plugin.execute({ mode: 'apply', limit: options.limit });
          printExecutionSummary(applyResult);
        } else {
          console.log('\n❌ Aborted.');
        }
      }
    }
    // ======================================================
    // STEP 5: APPLY MODE (WITH CONFIRMATION)
    // ======================================================
    else if (options.mode === 'apply') {
      if (options.interactive) {
        console.log('⚠️ EXECUTION MODE (WILL MAKE CHANGES)\n');
        const readlineSync = require('readline-sync');
        const confirm = readlineSync.question(
          'This will update your Supabase database. Continue? (yes/no): ',
          { defaultInput: 'no' }
        );

        if (confirm.toLowerCase() !== 'yes') {
          console.log('\n❌ Aborted.');
          process.exit(0);
        }
      }

      console.log('\n🚀 Executing enrichment...\n');
      const result = await plugin.execute({ mode: 'apply', limit: options.limit });
      printExecutionSummary(result);
    }
  } catch (err) {
    console.error(`\n❌ FATAL ERROR: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

// ============================================================
// HELPER: PRINT EXECUTION SUMMARY
// ============================================================

function printExecutionSummary(result) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ EXECUTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Sages enriched:      ${result.sages_enriched}`);
  console.log(`Connections created: ${result.connections_created}`);
  console.log(`Errors:              ${result.errors.length}`);
  console.log(`Timestamp:           ${result.timestamp}\n`);

  if (result.errors.length > 0) {
    console.log('⚠️  ERRORS:');
    result.errors.forEach((err) => {
      const file = err.file ? ` (${err.file})` : '';
      console.log(`  - ${err.error}${file}`);
    });
  }

  console.log('\n✅ Done! Your Ozar Chachamim sages are now enriched.\n');
}

// ============================================================
// PRINT USAGE
// ============================================================

function printUsage() {
  console.log(`\nUsage:
  node run-enrichment.js [options]

Options:
  --dryrun              Preview changes without executing (default)
  --apply               Execute enrichment (requires confirmation)
  --test                Run with first 5 files (for testing)
  --limit=N             Process only N files
  --force               Skip interactive prompts (use with care)

Examples:
  node run-enrichment.js --dryrun        # Preview
  node run-enrichment.js --apply         # Execute with confirmation
  node run-enrichment.js --test          # Test with 5 files
  node run-enrichment.js --apply --force # Execute without prompts
`);
}

// ============================================================
// RUN
// ============================================================

if (args.includes('--help') || args.includes('-h')) {
  printUsage();
} else {
  runEnrichment().catch(console.error);
}
