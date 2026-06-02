#!/usr/bin/env node

/**
 * validate-config.js — Configuration validation for production
 *
 * Run locally before deploying: node validate-config.js
 * Checks that all required environment variables and files are present
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

log('\n🔍 Validating production configuration...\n', 'blue');

let hasErrors = false;

// Check 1: config.js exists
const configPath = path.join(__dirname, 'config.js');
const configExists = fs.existsSync(configPath);

if (configExists) {
  log('✅ config.js exists', 'green');
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    if (content.includes('your-project.supabase.co') || content.includes('your-anon-key-here')) {
      log('⚠️  config.js contains placeholder values — update with real credentials', 'yellow');
      hasErrors = true;
    } else if (content.includes('https://') && content.length > 100) {
      log('✅ config.js contains valid-looking credentials', 'green');
    }
  } catch (e) {
    log('❌ Failed to read config.js', 'red');
    hasErrors = true;
  }
} else {
  log('⚠️  config.js not found — will be generated at build time', 'yellow');
}

// Check 2: Essential HTML files
const htmlFiles = ['index.html', 'research-view.html'];
htmlFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    log(`✅ ${file} exists`, 'green');
  } else {
    log(`❌ ${file} missing`, 'red');
    hasErrors = true;
  }
});

// Check 3: Essential JS modules
const jsFiles = [
  'supabase-client.js',
  'graph.js',
  'search-manager.js',
  'visualization-enhancements.js',
  'research-display.js',
];

jsFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    log(`✅ ${file} exists`, 'green');
  } else {
    log(`❌ ${file} missing`, 'red');
    hasErrors = true;
  }
});

// Check 4: CSS files
const cssFiles = ['styles-graph.css', 'styles/tokens.css', 'styles/typography.css'];
cssFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    log(`✅ ${file} exists`, 'green');
  } else {
    log(`⚠️  ${file} missing (may affect styling)`, 'yellow');
  }
});

// Check 5: Vercel configuration
if (fs.existsSync(path.join(__dirname, 'vercel.json'))) {
  log('✅ vercel.json exists', 'green');
} else {
  log('⚠️  vercel.json not found', 'yellow');
}

// Check 6: Git configuration
const gitignore = fs.readFileSync(path.join(__dirname, '.gitignore'), 'utf8');
if (gitignore.includes('config.js')) {
  log('✅ config.js is in .gitignore (secrets protected)', 'green');
} else {
  log('❌ config.js is NOT in .gitignore (SECURITY RISK)', 'red');
  hasErrors = true;
}

// Summary
log('\n' + '='.repeat(50), 'blue');
if (hasErrors) {
  log('⚠️  Configuration validation FAILED', 'red');
  log('\nFix the errors above before deploying.', 'red');
  process.exit(1);
} else {
  log('✅ Configuration validation PASSED', 'green');
  log('\nYour project is ready for Vercel deployment!', 'green');
  process.exit(0);
}
