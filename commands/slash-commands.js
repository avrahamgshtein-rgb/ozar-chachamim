/**
 * SLASH COMMANDS — Ozar Chachamim
 *
 * Interactive commands for Claude Code
 * Usage: Type /command-name in Claude Code prompt
 *
 * Available Commands:
 *   /extract <file>     - Extract sage data from local file
 *   /enrich <sage-id>   - Enrich sage in Supabase
 *   /watch [--once]     - Monitor /data/ folder for new files
 *   /sync-drive         - Sync research from Google Drive
 *   /status             - Show current project status
 *   /list-sages         - List all sages in database
 *   /help               - Show this help text
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ============================================================
// COMMAND REGISTRY
// ============================================================

const SLASH_COMMANDS = {
  extract: {
    name: 'extract',
    description: 'Extract sage data from local file',
    usage: '/extract <filepath>',
    aliases: ['/ext'],
    handler: commandExtract,
  },
  enrich: {
    name: 'enrich',
    description: 'Enrich sage profile in Supabase',
    usage: '/enrich <sage-id>',
    aliases: ['/enr'],
    handler: commandEnrich,
  },
  watch: {
    name: 'watch',
    description: 'Monitor /data/ folder for new files and auto-enrich',
    usage: '/watch [--once] [--limit=N]',
    aliases: ['/w'],
    handler: commandWatch,
  },
  'sync-drive': {
    name: 'sync-drive',
    description: 'Sync research files from Google Drive',
    usage: '/sync-drive [--dryrun] [--limit=N]',
    aliases: ['/sync', '/gd'],
    handler: commandSyncDrive,
  },
  status: {
    name: 'status',
    description: 'Show project status and statistics',
    usage: '/status',
    aliases: ['/stat', '/info'],
    handler: commandStatus,
  },
  'list-sages': {
    name: 'list-sages',
    description: 'List all sages in database',
    usage: '/list-sages [--filter=<period>] [--limit=10]',
    aliases: ['/ls', '/sages'],
    handler: commandListSages,
  },
  help: {
    name: 'help',
    description: 'Show all available commands',
    usage: '/help [command]',
    aliases: ['/?', '/h'],
    handler: commandHelp,
  },
};

// ============================================================
// COMMAND HANDLERS
// ============================================================

async function commandExtract(args) {
  /**
   * /extract <filepath>
   * Extract sage data from local file (.docx, .txt, .md)
   */
  if (!args || args.length === 0) {
    return '❌ Usage: /extract <filepath>\nExample: /extract data/rambam.docx';
  }

  const filepath = args.join(' ');

  if (!fs.existsSync(filepath)) {
    return `❌ File not found: ${filepath}`;
  }

  try {
    const { extractSageDataFromFile } = require('../skills/extract-sage-from-local-file.js');
    const data = await extractSageDataFromFile(filepath);

    return `
✅ **Extraction Complete**

📄 File: ${path.basename(filepath)}
👤 Sage: ${data.sage_name_english}
📝 Bio: ${data.bio?.substring(0, 100)}...
📚 Works: ${data.main_works?.length || 0} found
💡 Ideas: ${data.main_works?.length || 0} found
🔗 Related: ${data.related_sages?.length || 0} sages
📍 Locations: ${data.locations?.join(', ') || 'N/A'}

**Next step:** /enrich <sage-id> (after approving changes)
    `;
  } catch (err) {
    return `❌ Extraction failed: ${err.message}`;
  }
}

async function commandEnrich(args) {
  /**
   * /enrich <sage-id>
   * Enrich sage profile in Supabase
   */
  if (!args || args.length === 0) {
    return '❌ Usage: /enrich <sage-id>\nExample: /enrich 45 (Rabbi Meir)';
  }

  const sageId = parseInt(args[0]);

  if (isNaN(sageId)) {
    return `❌ Invalid sage ID: ${args[0]}. Must be a number.`;
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch sage
    const { data: sage, error: fetchError } = await supabase
      .from('sages')
      .select('id, label')
      .eq('id', sageId)
      .single();

    if (fetchError || !sage) {
      return `❌ Sage ID ${sageId} not found in database`;
    }

    return `
✅ **Ready to Enrich**

🧔 Sage: ${sage.label}
🆔 ID: ${sage.id}

**Status:** Database is ready for enrichment
**Next:** Run enrichment via /sync-drive or manually in Claude Code
    `;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

async function commandWatch(args) {
  /**
   * /watch [--once] [--limit=N]
   * Monitor /data/ folder or run once
   */
  const once = args?.includes('--once');
  const limitArg = args?.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

  return `
✅ **Watch Mode${once ? ' (ONE-TIME)' : ' (CONTINUOUS)'}**

📁 Folder: ./data/
⏱️ Check interval: 5 seconds${limit ? `\n📊 File limit: ${limit}` : ''}

**Status:** Ready to process files
**Next:**
  1. Add files to ./data/ folder
  2. Watch will auto-detect and enrich
  3. Processed files move to ./data/processed/
  4. Failed files move to ./data/failed/

**Command to run:**
\`npm run watch:${once ? 'once' : 'start'}\`
  `;
}

async function commandSyncDrive(args) {
  /**
   * /sync-drive [--dryrun] [--limit=N]
   * Sync research files from Google Drive
   */
  const dryrun = args?.includes('--dryrun');
  const limitArg = args?.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;

  return `
✅ **Google Drive Sync${dryrun ? ' (DRY-RUN)' : ''}**

🔌 Connector: Google Drive API
📂 Folder: ${process.env.GOOGLE_DRIVE_FOLDER_ID || 'Not configured'}
${limit ? `📊 File limit: ${limit}` : '📊 File limit: All files'}

**Status:** ${dryrun ? 'Preview mode (no changes)' : 'Execute mode (will update DB)'}

**Command to run:**
\`npm run enrich:${dryrun ? 'preview' : 'apply'}\`

**What it does:**
  1. Lists files from Google Drive folder
  2. Reads each Google Doc
  3. Extracts: bio, works, ideas, related_sages, locations
  4. Updates Supabase (bio, core_concept, tags, main_works)
  5. Creates connections between related sages
  6. Logs all changes to audit_log
  `;
}

async function commandStatus(args) {
  /**
   * /status
   * Show project statistics
   */
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Count sages
    const { count: sageCount } = await supabase
      .from('sages')
      .select('id', { count: 'exact', head: true });

    // Count connections
    const { count: connCount } = await supabase
      .from('connections')
      .select('id', { count: 'exact', head: true });

    // Count audit logs
    const { count: auditCount } = await supabase
      .from('audit_log')
      .select('id', { count: 'exact', head: true });

    // Check recent enrichments
    const { data: recent } = await supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);

    return `
✅ **PROJECT STATUS**

📊 **Database Statistics**
  🧔 Sages: ${sageCount || 0}
  🔗 Connections: ${connCount || 0}
  📝 Audit log entries: ${auditCount || 0}

📚 **Recent Activity**
  Last enrichment: ${recent?.[0]?.timestamp || 'Never'}
  ${recent?.[0] ? `Last action: ${recent[0].action}` : ''}

🔧 **Configuration**
  Supabase: ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Not configured'}
  Google Drive: ${process.env.GOOGLE_DRIVE_FOLDER_ID ? '✅ Connected' : '❌ Not configured'}
  Local watch: ./data/ (ready)

🎯 **Next Steps**
  /extract <file>   - Extract from local file
  /watch            - Start monitoring /data/
  /sync-drive       - Sync Google Drive
  `;
  } catch (err) {
    return `❌ Error fetching status: ${err.message}`;
  }
}

async function commandListSages(args) {
  /**
   * /list-sages [--filter=<period>] [--limit=10]
   * List sages with optional filtering
   */
  const filterArg = args?.find((a) => a.startsWith('--filter='));
  const filter = filterArg ? filterArg.split('=')[1] : null;
  const limitArg = args?.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let query = supabase.from('sages').select('id, label, period').limit(limit);

    if (filter) {
      query = query.eq('period', filter);
    }

    const { data: sages, error } = await query;

    if (error) {
      return `❌ Error: ${error.message}`;
    }

    if (!sages || sages.length === 0) {
      return `❌ No sages found${filter ? ` for period: ${filter}` : ''}`;
    }

    const list = sages
      .map((s) => `  ${s.id}. ${s.label} (${s.period})`)
      .join('\n');

    return `
✅ **Sages List** (${sages.length} total)${filter ? ` - Period: ${filter}` : ''}

${list}

**Usage:**
  /enrich <sage-id>  - Enrich a specific sage
  /extract <file>    - Extract and enrich from file
    `;
  } catch (err) {
    return `❌ Error: ${err.message}`;
  }
}

function commandHelp(args) {
  /**
   * /help [command]
   * Show help for all commands or specific command
   */
  if (args && args.length > 0) {
    const cmd = args[0].toLowerCase();
    const command = SLASH_COMMANDS[cmd];

    if (!command) {
      return `❌ Command not found: /${cmd}\n\nType /help to see all commands`;
    }

    return `
✅ **${command.name.toUpperCase()}**

📝 Description: ${command.description}
🔗 Usage: ${command.usage}
${command.aliases.length > 0 ? `💡 Aliases: ${command.aliases.join(', ')}` : ''}

**Examples:**
  /${command.name} arg1
  ${command.aliases[0] || ''}  arg1
    `;
  }

  // Show all commands
  const commandList = Object.values(SLASH_COMMANDS)
    .map((cmd) => `  /${cmd.name}\t\t${cmd.description}`)
    .join('\n');

  return `
✅ **AVAILABLE COMMANDS**

Ozar Chachamim Slash Commands

${commandList}

**Usage:** Type /command-name in Claude Code
**Examples:**
  /extract data/rambam.docx
  /enrich 45
  /watch --once
  /sync-drive --dryrun
  /status
  /list-sages --filter=rishonim
  /help extract

**Need help?** Type /help <command>
  `;
}

// ============================================================
// MAIN PARSER
// ============================================================

async function parseSlashCommand(input) {
  /**
   * Main entry point for slash command parsing
   * Returns response string
   */
  if (!input.startsWith('/')) {
    return null; // Not a slash command
  }

  // Parse command and arguments
  const parts = input.trim().split(/\s+/);
  const commandInput = parts[0].toLowerCase().substring(1); // Remove leading /
  const args = parts.slice(1);

  // Find command (by name or alias)
  let command = SLASH_COMMANDS[commandInput];

  if (!command) {
    // Check aliases
    for (const cmd of Object.values(SLASH_COMMANDS)) {
      if (cmd.aliases.includes('/' + commandInput)) {
        command = cmd;
        break;
      }
    }
  }

  if (!command) {
    return `❌ Unknown command: /${commandInput}\n\nType /help to see all commands`;
  }

  // Execute handler
  try {
    const response = await command.handler(args);
    return response;
  } catch (err) {
    return `❌ Command failed: ${err.message}`;
  }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  SLASH_COMMANDS,
  parseSlashCommand,
  // Individual handlers (for testing)
  commandExtract,
  commandEnrich,
  commandWatch,
  commandSyncDrive,
  commandStatus,
  commandListSages,
  commandHelp,
};

// ============================================================
// CLI USAGE (when called directly)
// ============================================================

if (require.main === module) {
  const input = process.argv.slice(2).join(' ');

  if (!input) {
    console.log('📖 Slash Commands for Ozar Chachamim\n');
    console.log('Usage: node slash-commands.js "<command>"');
    console.log('Example: node slash-commands.js "/help"');
    console.log('Example: node slash-commands.js "/extract data/rambam.docx"');
    process.exit(0);
  }

  parseSlashCommand(input).then((response) => {
    if (response) {
      console.log(response);
    }
  });
}
