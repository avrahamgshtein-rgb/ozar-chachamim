/**
 * HOOK: schedule-enrichment.js
 *
 * Scheduled task: Auto-sync Google Drive research + enrich Supabase
 * Runs every Sunday at 2:00 AM
 *
 * Setup:
 *   npm run schedule:start      # Start daemon (via pm2)
 *   npm run schedule:stop       # Stop daemon
 *   npm run schedule:logs       # View logs
 *
 * Manual run:
 *   node hooks/schedule-enrichment.js
 */

const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ============================================================
// SCHEDULED TASK
// ============================================================

async function runScheduledEnrichment() {
  /**
   * Main task: Sync Google Drive + enrich Supabase
   * Runs on Sunday 2 AM (cron: "0 2 * * 0")
   */

  const startTime = new Date().toISOString();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`⏰ SCHEDULED ENRICHMENT STARTED: ${startTime}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // ======================================================
    // STEP 1: INITIALIZE SUPABASE
    // ======================================================

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔌 [Schedule] Connecting to Supabase...');

    // Test connection
    const { data: count } = await supabase
      .from('sages')
      .select('id', { count: 'exact', head: true });

    console.log(`✓ Connected. ${count} sages in database.\n`);

    // ======================================================
    // STEP 2: SYNC GOOGLE DRIVE
    // ======================================================

    console.log('📂 [Schedule] Syncing Google Drive...');

    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      console.warn('⚠️ GOOGLE_DRIVE_FOLDER_ID not configured. Skipping Google Drive sync.');
    } else {
      try {
        const { research_enrichment_plugin } = require('../plugins/research-enrichment-plugin.js');

        const result = await research_enrichment_plugin(supabase, {
          mode: 'apply', // Execute changes (not dryrun)
          limit: 20, // Process up to 20 files per run
          verbose: true,
        });

        console.log(`✓ Processed ${result.processed} files from Google Drive`);
        console.log(`✓ Created ${result.enriched} enrichments`);
        console.log(`✓ ${result.failed} files failed\n`);
      } catch (err) {
        console.error(`⚠️ Google Drive sync error: ${err.message}\n`);
      }
    }

    // ======================================================
    // STEP 3: LOCAL FOLDER WATCH
    // ======================================================

    console.log('📁 [Schedule] Processing /data/ folder...');

    try {
      const { onFileUploadBatch } = require('./on-file-upload.js');
      const result = await onFileUploadBatch('./data', {
        limit: 10,
        silent: false,
      });

      console.log(`✓ Processed ${result.processed} local files`);
      console.log(`✓ ${result.failed} files failed\n`);
    } catch (err) {
      console.error(`⚠️ Local folder processing error: ${err.message}\n`);
    }

    // ======================================================
    // STEP 4: DATABASE STATISTICS
    // ======================================================

    console.log('📊 [Schedule] Database statistics:');

    const { count: sageCount } = await supabase
      .from('sages')
      .select('id', { count: 'exact', head: true });

    const { count: connCount } = await supabase
      .from('connections')
      .select('id', { count: 'exact', head: true });

    const { count: auditCount } = await supabase
      .from('audit_log')
      .select('id', { count: 'exact', head: true });

    console.log(`  • Sages: ${sageCount}`);
    console.log(`  • Connections: ${connCount}`);
    console.log(`  • Audit log entries: ${auditCount}\n`);

    // ======================================================
    // STEP 5: LOG COMPLETION
    // ======================================================

    const endTime = new Date().toISOString();
    const duration = (new Date(endTime) - new Date(startTime)) / 1000;

    const { error: logError } = await supabase.from('audit_log').insert({
      action: 'scheduled_enrichment_complete',
      sage_name: 'SYSTEM',
      source_file: `schedule-enrichment.js (duration: ${Math.round(duration)}s)`,
      timestamp: endTime,
    });

    if (logError) {
      console.warn(`⚠️ Could not log completion: ${logError.message}`);
    }

    console.log(`✅ SCHEDULED ENRICHMENT COMPLETED`);
    console.log(`⏱️  Duration: ${Math.round(duration)}s`);
    console.log(`${'-'.repeat(60)}\n`);
  } catch (err) {
    console.error(`\n❌ SCHEDULED ENRICHMENT FAILED`);
    console.error(`Error: ${err.message}`);
    console.error(`${'-'.repeat(60)}\n`);
  }
}

// ============================================================
// CRON SCHEDULER (if running as daemon)
// ============================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const isDaemon = args.includes('--daemon') || args.includes('--start');

  if (isDaemon) {
    console.log(`\n🚀 Starting Scheduled Enrichment Daemon\n`);
    console.log(`📅 Schedule: Every Sunday at 2:00 AM`);
    console.log(`⏰ Cron expression: "0 2 * * 0"`);
    console.log(`\nTo stop: npm run schedule:stop\n`);

    // Schedule: Sunday (0) 2:00 AM
    const task = cron.schedule('0 2 * * 0', () => {
      runScheduledEnrichment();
    });

    console.log('✅ Daemon started. Waiting for next scheduled run...\n');

    // Optional: Also run on startup for testing
    if (args.includes('--immediate')) {
      console.log('🔄 Running immediately for testing...\n');
      runScheduledEnrichment();
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, stopping...');
      task.stop();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, stopping...');
      task.stop();
      process.exit(0);
    });
  } else {
    // Single run (not daemon mode)
    console.log(`\n🔄 Running Scheduled Enrichment Task (Single Run)\n`);
    runScheduledEnrichment().then(() => {
      process.exit(0);
    });
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  runScheduledEnrichment,
};
