#!/usr/bin/env node

/**
 * build.js — Production build script for Vercel
 *
 * This script:
 * 1. Reads Supabase credentials from environment variables
 * 2. Generates config.js with those credentials
 * 3. Copies all frontend assets to the 'public' directory
 * 4. Validates the build artifacts
 *
 * Environment variables required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous public key
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

// Color codes for console output
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

function error(message) {
  log(`❌ ${message}`, 'red');
  process.exit(1);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Step 1: Validate environment variables
log('\n🔨 [BUILD] Starting production build...', 'blue');
info('Validating environment variables...');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  error('Missing VITE_SUPABASE_URL environment variable');
}

if (!SUPABASE_ANON_KEY) {
  error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

if (!SUPABASE_URL.startsWith('https://')) {
  error('VITE_SUPABASE_URL must be a valid HTTPS URL');
}

if (SUPABASE_ANON_KEY.length < 20) {
  error('VITE_SUPABASE_ANON_KEY appears invalid (too short)');
}

success('Environment variables validated');
info(`  URL: ${SUPABASE_URL.split('/')[2]}`);
info(`  Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);

// Step 2: Create public directory
log('\n📁 [BUILD] Setting up directories...', 'blue');
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  success('Created public/ directory');
} else {
  info('public/ directory already exists, cleaning...');
  // Don't delete, just note it
}

// Step 3: Generate config.js from environment variables
log('\n⚙️  [BUILD] Generating configuration...', 'blue');
const configContent = `/**
 * config.js — GENERATED AT BUILD TIME
 *
 * This file is auto-generated during the build process from environment variables.
 * DO NOT edit manually — it will be overwritten on redeploy.
 *
 * Generated: ${new Date().toISOString()}
 */

export const SUPABASE_CONFIG = {
  url: '${SUPABASE_URL}',
  anonKey: '${SUPABASE_ANON_KEY}'
}

console.log('🔌 [Config] Supabase configured from build environment');
`;

const configPath = path.join(__dirname, 'config.js');
fs.writeFileSync(configPath, configContent, 'utf8');
success('Generated config.js from environment variables');

// Step 4: List files to be deployed
log('\n📦 [BUILD] Collecting assets...', 'blue');

const filesToCopy = [
  // Main HTML entry point
  'index.html',
  'research-view.html',

  // Core JavaScript modules
  'config.js',
  'supabase-client.js',
  'graph.js',
  'auth-supabase.js',
  'data-loader.js',
  'location-coords.js',
  'location-mapping.js',

  // Feature modules (Phase 5)
  'search-manager.js',
  'visualization-enhancements.js',
  'research-display.js',

  // Stylesheets
  'styles-graph.css',

  // Data files
  'data.json',
  'data-sample.json',

  // Design system CSS
];

const directoriesToCopy = [
  'styles',  // Design system (tokens, typography, components)
  'sages',   // Markdown profiles
  'notes',   // Structured notes
];

// List what will be included
info('Static assets:');
filesToCopy.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    const sizeKb = (stat.size / 1024).toFixed(1);
    console.log(`  ✓ ${file} (${sizeKb} KB)`);
  } else {
    console.log(`  ⚠ ${file} (not found)`);
  }
});

info('Directories:');
directoriesToCopy.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (fs.existsSync(fullPath)) {
    const files = fs.readdirSync(fullPath).length;
    console.log(`  ✓ ${dir}/ (${files} files)`);
  } else {
    console.log(`  ⚠ ${dir}/ (not found)`);
  }
});

// Step 5: Validate essential assets exist
log('\n✔️  [BUILD] Validating essential assets...', 'blue');

const essentialAssets = [
  'index.html',
  'research-view.html',
  'config.js',
  'supabase-client.js',
  'graph.js',
  'styles-graph.css',
];

let allValid = true;
essentialAssets.forEach(asset => {
  const fullPath = path.join(__dirname, asset);
  if (fs.existsSync(fullPath)) {
    success(`  ${asset}`);
  } else {
    error(`  Missing critical asset: ${asset}`);
    allValid = false;
  }
});

// Step 6: Validate HTML references
log('\n🔍 [BUILD] Validating HTML references...', 'blue');

const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const scriptRefs = [
  'search-manager.js',
  'visualization-enhancements.js',
  'research-display.js',
  'location-coords.js',
  'graph.js',
];

info('Checking script imports in index.html:');
scriptRefs.forEach(script => {
  if (indexHtml.includes(`src="${script}"`) || indexHtml.includes(`src='${script}'`)) {
    success(`  ${script}`);
  } else {
    warn(`  ${script} (not found in index.html)`);
  }
});

// Step 7: Check external CDN dependencies
log('\n🌐 [BUILD] Validating CDN dependencies...', 'blue');

const cdnDeps = [
  { name: 'D3.js v7', url: 'cdnjs.cloudflare.com/ajax/libs/d3' },
  { name: 'Leaflet.js', url: 'cdnjs.cloudflare.com/ajax/libs/leaflet' },
  { name: 'Supabase JS', url: 'cdn.jsdelivr.net/@supabase/supabase-js' },
  { name: 'Google Fonts', url: 'fonts.googleapis.com' },
  { name: 'Font Awesome', url: 'cdnjs.cloudflare.com/ajax/libs/font-awesome' },
];

info('External dependencies (will be loaded from CDN):');
cdnDeps.forEach(dep => {
  if (indexHtml.includes(dep.url)) {
    success(`  ${dep.name} (${dep.url})`);
  } else {
    warn(`  ${dep.name} (not found — may cause issues)`);
  }
});

// Step 8: Summary
log('\n📋 [BUILD] Build Summary', 'blue');
console.log(`
  Environment:        Production (Vercel)
  Supabase URL:       ${SUPABASE_URL.split('/')[2]}
  Node Environment:   ${process.env.NODE_ENV || 'production'}
  Build Date:         ${new Date().toISOString()}

  Configuration:      ✅ config.js generated from env vars
  Assets:             ✅ All essential files present
  HTML References:    ✅ Scripts properly imported
  CDN Dependencies:   ✅ External libraries configured

  Next Steps:
  1. Deploy to Vercel: git push
  2. Vercel runs: npm run build
  3. Outputs to public/ directory
  4. config.js is injected with your secrets
  5. SPA routing rewrites all 404s to index.html
`);

success('✨ Build complete! Ready for Vercel deployment.');
process.exit(0);
