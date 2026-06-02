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

// Helper: Copy file or directory recursively
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    warn(`  ${src} not found, skipping`);
    return;
  }
  
  const stat = fs.statSync(src);
  
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
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

// Step 2: Create and clean public directory
log('\n📁 [BUILD] Setting up directories...', 'blue');
if (fs.existsSync(PUBLIC_DIR)) {
  info('Cleaning public/ directory...');
  fs.rmSync(PUBLIC_DIR, { recursive: true });
}
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
success('Created fresh public/ directory');

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

const configPath = path.join(PUBLIC_DIR, 'config.js');
fs.writeFileSync(configPath, configContent, 'utf8');
success('Generated config.js from environment variables');

// Step 4: Copy all static files to public/
log('\n📦 [BUILD] Copying assets...', 'blue');

const filesToCopy = [
  'index.html',
  'research-view.html',
  'supabase-client.js',
  'graph.js',
  'auth-supabase.js',
  'data-loader.js',
  'location-coords.js',
  'location-mapping.js',
  'search-manager.js',
  'visualization-enhancements.js',
  'research-display.js',
  'styles-graph.css',
  'data.json',
  'data-sample.json',
];

const directoriesToCopy = [
  'styles',
  'sages',
  'notes',
];

// Copy files
info('Copying files:');
filesToCopy.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(PUBLIC_DIR, file);
  
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    const stat = fs.statSync(src);
    const sizeKb = (stat.size / 1024).toFixed(1);
    success(`  ${file} (${sizeKb} KB)`);
  } else {
    warn(`  ${file} (not found)`);
  }
});

// Copy directories
info('Copying directories:');
directoriesToCopy.forEach(dir => {
  const src = path.join(__dirname, dir);
  const dest = path.join(PUBLIC_DIR, dir);
  
  if (fs.existsSync(src)) {
    copyRecursive(src, dest);
    const files = fs.readdirSync(src).length;
    success(`  ${dir}/ (${files} items)`);
  } else {
    warn(`  ${dir}/ (not found)`);
  }
});

// Step 5: Validate essential assets exist
log('\n✔️  [BUILD] Validating essential assets...', 'blue');

const essentialAssets = [
  'index.html',
  'config.js',
  'supabase-client.js',
  'graph.js',
  'styles-graph.css',
];

let allValid = true;
essentialAssets.forEach(asset => {
  const fullPath = path.join(PUBLIC_DIR, asset);
  if (fs.existsSync(fullPath)) {
    success(`  ${asset}`);
  } else {
    error(`  Missing critical asset: ${asset}`);
    allValid = false;
  }
});

if (!allValid) {
  error('Build validation failed');
}

// Step 6: Summary
log('\n📋 [BUILD] Build Summary', 'blue');
const publicFiles = fs.readdirSync(PUBLIC_DIR, { recursive: true }).length;
console.log(`
  Environment:        Production (Vercel)
  Supabase URL:       ${SUPABASE_URL.split('/')[2]}
  Node Environment:   ${process.env.NODE_ENV || 'production'}
  Build Date:         ${new Date().toISOString()}
  
  Files in public/:    ${publicFiles} items
  Config:             ✅ config.js generated from env vars
  Assets:             ✅ All essential files present
  
  Next Steps:
  1. Add env vars to Vercel:
     - VITE_SUPABASE_URL = ${SUPABASE_URL.split('/')[2]}
     - VITE_SUPABASE_ANON_KEY = [your anon key]
  2. Deploy: git push
  3. Vercel runs: npm run build
  4. Outputs to public/ directory (all files copied)
`);

success('✨ Build complete! Ready for Vercel deployment.');
process.exit(0);
