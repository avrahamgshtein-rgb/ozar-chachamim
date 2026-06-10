/**
 * config.example.js
 *
 * Supabase Configuration Template
 *
 * INSTRUCTIONS:
 * 1. Copy this file: cp config.example.js config.js
 * 2. Paste your Supabase credentials from https://app.supabase.com
 * 3. DO NOT commit config.js to git (it's in .gitignore)
 *
 * To find your credentials:
 * - Log in to https://app.supabase.com
 * - Select your project
 * - Go to Settings > API
 * - Copy "Project URL" and "anon public" key
 */

export const SUPABASE_CONFIG = {
  // Your Supabase project URL
  // Example: https://myproject.supabase.co
  url: 'https://ulluacifirzywhmzkvkr.supabase.co',

  // Your Supabase anonymous (public) key
  // Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  anonKey: 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C'
}

// ============================================================================
// SECURITY NOTE
// ============================================================================
// The anonymous key is intentionally public (it's meant for browser clients).
// It only has access to data defined by Row-Level Security (RLS) policies.
// For אוצר חכמים, the RLS policies allow:
//   ✅ SELECT on public tables (sages, connections, research_content)
//   ✅ INSERT/UPDATE on user_data (bookmarks, view_history) if authenticated
//   ❌ Everything else is restricted
// ============================================================================
