# 🔌 Google Drive Connector Setup

This guide walks you through connecting your Google Drive research documents to Ozar Chachamim.

---

## Overview

The **Google Drive Connector** allows the Research Enrichment Plugin to:
- List all files in your research folder
- Read Google Doc content
- Extract structured sage data
- Automatically enrich the Supabase database

---

## Step 1: Create Google Cloud Project

### 1a. Go to Google Cloud Console
```
https://console.cloud.google.com/
```

### 1b. Create a new project
```
1. Click dropdown at top: "Select a Project"
2. Click "NEW PROJECT"
3. Name: "Ozar Chachamim" (or your choice)
4. Click CREATE
5. Wait for project to be ready (~1 min)
```

### 1c. Enable Google Drive API
```
1. Search bar: "Google Drive API"
2. Click "Enable"
3. Wait for activation (~1 min)
```

---

## Step 2: Create Service Account

Service Account = OAuth credentials for server/automation (not your personal account).

### 2a. Create credentials
```
1. Left sidebar: APIs & Services → Credentials
2. Click CREATE CREDENTIALS → Service Account
3. Fill in:
   - Service account name: "ozar-chachamim-bot"
   - Service account ID: (auto-filled)
   - Description: "Automation for research enrichment"
4. Click CREATE AND CONTINUE
```

### 2b. Create API key
```
1. On Service Account page:
   - Click on your service account name
   - Go to KEYS tab
   - ADD KEY → Create new key
   - Key type: JSON
   - Click CREATE
2. A JSON file downloads automatically
   - **Save this file as: `google-drive-service-account.json`**
   - ⚠️ KEEP THIS SECURE — add to `.gitignore`
   - Never commit this file to git
```

### 2c. Copy service account email
```
In the Service Account page, copy the email:
  ozar-chachamim-bot@YOUR-PROJECT.iam.gserviceaccount.com

You'll need this in the next step.
```

---

## Step 3: Share Your Google Drive Folder with Service Account

The service account needs **Reader** access to your research folder.

### 3a. Open your research folder in Google Drive
```
https://drive.google.com/drive/folders/1_E2VtWpJ6RLyHCxvOV9_NUmIUZkZU3Jc
(Your folder URL)
```

### 3b. Share with service account
```
1. Right-click folder → Share
2. Paste service account email:
   ozar-chachamim-bot@YOUR-PROJECT.iam.gserviceaccount.com
3. Select "Editor" (need write access for potential future updates)
4. Uncheck: "Notify people"
5. Click SHARE
```

---

## Step 4: Set Up Connector Code

### 4a. Save credentials file
```bash
# Copy your downloaded google-drive-service-account.json to project root:
cp ~/Downloads/google-drive-service-account.json \
   C:\Users\User\Desktop\ozar-chachamim\google-drive-service-account.json

# Add to .gitignore (prevent accidental commit):
echo "google-drive-service-account.json" >> .gitignore
```

### 4b. Create connector config
```javascript
// google-drive-connector.js

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleDriveConnector {
  constructor(serviceAccountPath, folderId) {
    this.folderId = folderId;
    this.drive = null;
    this.serviceAccountPath = serviceAccountPath;
  }

  async initialize() {
    /**
     * Load service account credentials and authenticate with Google Drive API
     */
    try {
      const credentials = JSON.parse(
        fs.readFileSync(this.serviceAccountPath, 'utf8')
      );

      const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      console.log('✅ Google Drive API authenticated');
    } catch (err) {
      throw new Error(`Failed to authenticate: ${err.message}`);
    }
  }

  async listFiles() {
    /**
     * List all Google Docs in the folder
     * Returns: [{ id, name, mimeType }, ...]
     */
    if (!this.drive) await this.initialize();

    try {
      const response = await this.drive.files.list({
        q: `'${this.folderId}' in parents and trashed=false and mimeType='application/vnd.google-apps.document'`,
        spaces: 'drive',
        fields: 'files(id, name, mimeType, createdTime)',
        pageSize: 1000,
      });

      console.log(`📂 Found ${response.data.files.length} Google Docs in folder`);
      return response.data.files;
    } catch (err) {
      throw new Error(`Failed to list files: ${err.message}`);
    }
  }

  async readGoogleDoc(fileId) {
    /**
     * Export Google Doc as plain text
     * Returns: document content as string
     */
    if (!this.drive) await this.initialize();

    try {
      const response = await this.drive.files.export({
        fileId: fileId,
        mimeType: 'text/plain',
      });

      return response.data;
    } catch (err) {
      throw new Error(`Failed to read file ${fileId}: ${err.message}`);
    }
  }

  async readGoogleDocAsMarkdown(fileId) {
    /**
     * Export Google Doc as HTML, then convert to Markdown
     * (Optional: for richer formatting)
     */
    if (!this.drive) await this.initialize();

    try {
      const response = await this.drive.files.export({
        fileId: fileId,
        mimeType: 'text/html',
      });

      // Simple HTML to Markdown conversion
      // (Use a library like 'html-to-text' for production)
      return response.data;
    } catch (err) {
      throw new Error(`Failed to read file as HTML: ${err.message}`);
    }
  }
}

module.exports = GoogleDriveConnector;
```

### 4c. Install dependencies
```bash
npm install googleapis --save
```

---

## Step 5: Test the Connector

### 5a. Create a test script
```javascript
// test-connector.js

const GoogleDriveConnector = require('./google-drive-connector.js');

async function test() {
  const connector = new GoogleDriveConnector(
    './google-drive-service-account.json',
    '1_E2VtWpJ6RLyHCxvOV9_NUmIUZkZU3Jc' // Your folder ID
  );

  try {
    // List files
    const files = await connector.listFiles();
    console.log('\n📄 Files found:');
    files.forEach((f) => console.log(`  - ${f.name}`));

    // Read first file
    if (files.length > 0) {
      console.log(`\n📖 Reading: ${files[0].name}`);
      const content = await connector.readGoogleDoc(files[0].id);
      console.log(`Content preview (first 500 chars):\n${content.substring(0, 500)}`);
    }
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  }
}

test();
```

### 5b. Run test
```bash
node test-connector.js
```

**Expected output:**
```
✅ Google Drive API authenticated
📂 Found 12 Google Docs in folder
📄 Files found:
  - רבי מאיר - מחקר עמוק
  - רמב״ם - חייו ופעולו
  - [... more files]
📖 Reading: רבי מאיר - מחקר עמוק
Content preview (first 500 chars):
רבי מאיר בעל הנס היה תנא מהדור הרביעי...
```

---

## Step 6: Integrate with Plugin

### 6a. Update plugin initialization
```javascript
// In research-enrichment-plugin.js or main script:

const GoogleDriveConnector = require('./connectors/google-drive-connector.js');
const { ResearchEnrichmentPlugin } = require('./plugins/research-enrichment-plugin.js');

async function runEnrichment() {
  // 1. Initialize connectors
  const googleDrive = new GoogleDriveConnector(
    './google-drive-service-account.json',
    '1_E2VtWpJ6RLyHCxvOV9_NUmIUZkZU3Jc' // Your folder ID
  );

  // 2. Initialize Supabase client
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for server-side operations
  );

  // 3. Create and run plugin
  const plugin = new ResearchEnrichmentPlugin(supabase, googleDrive);

  // 3a. DRY RUN: Preview changes
  console.log('🔍 Running DRY RUN to preview changes...\n');
  const dryRunResult = await plugin.execute({
    mode: 'dryrun',
    limit: 3, // Test with first 3 files
  });

  console.log('\nDry run preview:');
  dryRunResult.preview.forEach((plan) => {
    console.log(`  - ${plan.sage_name}: ${Object.keys(plan.extracted_data).join(', ')}`);
  });

  // 3b. If satisfied, run with approval
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('\n✅ Ready to execute? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() === 'yes') {
      console.log('\n🚀 Executing enrichment...\n');
      const result = await plugin.execute({ mode: 'apply' });
      console.log('\n✅ Done!');
    } else {
      console.log('❌ Aborted.');
    }
    rl.close();
  });
}

runEnrichment().catch(console.error);
```

---

## Step 7: Schedule Weekly Automation (Optional)

Once you're comfortable, schedule the enrichment to run automatically every Sunday.

### 7a. Create scheduled task file
```javascript
// schedule-enrichment.js

const cron = require('node-cron');
const { runEnrichment } = require('./run-enrichment.js');

// Run every Sunday at 2 AM
cron.schedule('0 2 * * 0', async () => {
  console.log(`\n🤖 [${new Date()}] Running scheduled enrichment...\n`);
  try {
    await runEnrichment();
    console.log('✅ Enrichment completed');
  } catch (err) {
    console.error(`❌ Enrichment failed: ${err.message}`);
    // Send email alert (optional)
  }
});

console.log('⏰ Scheduler initialized. Waiting for Sunday 2 AM...');
```

### 7b. Install cron scheduler
```bash
npm install node-cron
```

### 7c. Keep script running
```bash
# Option 1: PM2 (recommended for production)
npm install -g pm2
pm2 start schedule-enrichment.js
pm2 save

# Option 2: System service (Windows)
# Use Task Scheduler to run the script at startup
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Permission denied" error | Check that service account has Reader/Editor access to folder. Resend share invitation. |
| "File not found" error | Verify folder ID is correct. Check files are Google Docs (not Word docs). |
| "quota exceeded" | Google Drive API has rate limits (1000 reads/min). Wait 1 hour, retry. |
| "Invalid service account" | Check JSON file is valid. Regenerate key if needed. |
| Timeout when reading large docs | Google Docs API can be slow. Increase timeout in connector. |

---

## Security Checklist

✅ **Add to `.gitignore`:**
```
google-drive-service-account.json
.env
config.js
```

✅ **Environment variables (use instead of hardcoding):**
```bash
export GOOGLE_DRIVE_FOLDER_ID="1_E2VtWpJ6RLyHCxvOV9_NUmIUZkZU3Jc"
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sb_service_role_..."
```

✅ **RLS policy for audit_log table:**
```sql
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT WITH CHECK (true); -- Only server can insert
```

---

## Next Steps

1. ✅ Complete setup steps 1–5
2. ✅ Test connector with `test-connector.js`
3. ✅ Run plugin in **dry-run mode** first (`mode: 'dryrun'`)
4. ✅ Review preview results
5. ✅ Execute with approval (`mode: 'apply'`)
6. ⏰ (Optional) Schedule weekly automation

---

**Questions?** See SESSION2_INTEGRATION_PLAN.md for architecture overview.
