/**
 * Supabase Client & Data Loading
 * Replaces local data.json with live Supabase backend
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Supabase Configuration
const SUPABASE_URL = 'https://ulluacifirzywhmzkvkr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C'

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================================================
// PART 1: DATA LOADING FROM SUPABASE
// ============================================================================

/**
 * Load all sages from Supabase (with stats from view)
 * Uses sages_with_stats view for connection_count & research availability
 */
async function loadSages() {
  console.log('📚 Loading sages from Supabase...')

  // Try to load from view first (includes stats)
  const { data: sagesWithStats, error: viewError } = await supabase
    .from('sages_with_stats')
    .select('*')
    .order('period_order', { ascending: true })

  if (!viewError && sagesWithStats && sagesWithStats.length > 0) {
    console.log(`✓ Loaded ${sagesWithStats.length} sages (with stats from view)`)
    return sagesWithStats
  }

  // Fallback to sages table if view unavailable
  console.log('⚠️  View unavailable, falling back to sages table')
  const { data: sages, error } = await supabase
    .from('sages')
    .select('id, name_he, name_en, era, era_key, period_order, region, primary_field, tags, summary, core_concept, spotify_url, coordinates')
    .order('period_order', { ascending: true })

  if (error) {
    console.error('❌ Error loading sages:', error)
    return []
  }

  console.log(`✓ Loaded ${sages.length} sages`)
  return sages
}

/**
 * Load all connections (relationships) from Supabase
 * Uses connections_with_names view for enriched data
 * FK constraints guarantee all source/target exist
 */
async function loadConnections() {
  console.log('🔗 Loading connections from Supabase...')

  // Try to load from view first (includes sage names)
  const { data: connWithNames, error: viewError } = await supabase
    .from('connections_with_names')
    .select('*')

  if (!viewError && connWithNames && connWithNames.length > 0) {
    console.log(`✓ Loaded ${connWithNames.length} connections (from enriched view)`)
    return connWithNames
  }

  // Fallback to raw connections table
  console.log('⚠️  View unavailable, falling back to connections table')
  const { data: connections, error } = await supabase
    .from('connections')
    .select('source_id, target_id, connection_type, historical_period')

  if (error) {
    console.error('❌ Error loading connections:', error)
    return []
  }

  console.log(`✓ Loaded ${connections.length} connections (FK-validated)`)
  return connections
}

/**
 * Load research content for a specific sage
 * Returns enriched research with metadata and timestamps
 */
async function loadResearchContent(sageId) {
  console.log(`📖 Loading research for sage ${sageId}...`)

  const { data: research, error } = await supabase
    .from('research_content')
    .select('id, sage_id, content_text, content_type, content_summary, source_file, word_count, created_at, updated_at')
    .eq('sage_id', sageId)
    .single()

  if (error) {
    console.log(`📝 No research content for sage ${sageId}`)
    return null
  }

  console.log(`✓ Loaded research: ${research.word_count} words`)
  return research
}

/**
 * Load complete sage profile with research + metadata
 * Called when user clicks on a sage node
 */
async function loadSageProfile(sageId) {
  console.log(`👤 Loading full profile for sage ${sageId}...`)

  try {
    // Fetch from sages_with_stats view
    const { data: sage, error: sageError } = await supabase
      .from('sages_with_stats')
      .select('*')
      .eq('id', sageId)
      .single()

    if (sageError) {
      console.error('❌ Error loading sage:', sageError)
      return null
    }

    // Fetch research content (if exists)
    const research = await loadResearchContent(sageId)

    // Fetch related connections (incoming + outgoing)
    const { data: relatedConnections, error: connError } = await supabase
      .from('connections_with_names')
      .select('*')
      .or(`source_id.eq.${sageId},target_id.eq.${sageId}`)

    if (connError) {
      console.warn('⚠️  Error loading connections:', connError)
    }

    // Return enriched profile
    return {
      ...sage,
      research: research,
      related_sages: relatedConnections || [],
      loaded_at: new Date().toISOString()
    }
  } catch (error) {
    console.error('❌ Error in loadSageProfile:', error)
    return null
  }
}

/**
 * Master data initialization
 */
async function initializeApp() {
  console.log('🔄 [AppInit] Initializing Supabase backend...')

  try {
    // Load core data
    const [sages, connections] = await Promise.all([
      loadSages(),
      loadConnections()
    ])

    // Validate connections (should all be valid due to FK, but defensive check)
    const validSageIds = new Set(sages.map(s => s.id))
    const validConnections = connections.filter(c => {
      const valid = validSageIds.has(c.source_id) && validSageIds.has(c.target_id)
      if (!valid) {
        console.warn(`⚠️ Invalid connection: ${c.source_id} → ${c.target_id}`)
      }
      return valid
    })

    // Convert Supabase format to graph.js format
    const nodes = sages.map(s => ({
      id: s.id,
      label: s.name_he,           // graph.js expects "label"
      name_he: s.name_he,
      era: s.era,
      era_key: s.era_key,
      group: s.era_key,           // graph.js expects "group" for colors
      period_order: s.period_order,
      region: s.region,
      primary_field: s.primary_field,
      tags: s.tags,
      summary: s.summary,
      core_concept: s.core_concept,
      spotify_url: s.spotify_url,
      coordinates: s.coordinates
    }))

    const links = validConnections.map(c => ({
      source: c.source_id,
      target: c.target_id,
      type: c.connection_type
    }))

    // Store globally
    window.graphData = {
      nodes: nodes,
      links: links
    }

    // Create search index
    window.searchIndex = createSearchIndex(sages)

    // Store Supabase client
    window.supabase = supabase

    console.log(`✅ [AppInit] Ready: ${sages.length} nodes + ${validConnections.length} edges`)

    // Signal data ready
    document.dispatchEvent(new CustomEvent('supabaseReady', {
      detail: { nodes: sages.length, links: validConnections.length }
    }))

    return true
  } catch (error) {
    console.error('❌ [AppInit] Critical error:', error)
    return false
  }
}

// ============================================================================
// PART 2: FULL-TEXT SEARCH (Cross-Tab)
// ============================================================================

/**
 * Create local search index for instant results
 */
function createSearchIndex(sages) {
  const index = new Map()

  sages.forEach(sage => {
    // Tokenize: name, field, era, tags
    const tokens = new Set()

    // Name
    if (sage.name_he) {
      sage.name_he.split(' ').forEach(t => tokens.add(t.toLowerCase()))
    }
    if (sage.name_en) {
      sage.name_en.split(' ').forEach(t => tokens.add(t.toLowerCase()))
    }

    // Field & tags
    if (sage.primary_field) {
      sage.primary_field.split(/[,\s]+/).forEach(t => tokens.add(t.toLowerCase()))
    }
    if (sage.tags) {
      sage.tags.split(/[,\s]+/).forEach(t => tokens.add(t.toLowerCase()))
    }

    // Era
    tokens.add(sage.era.toLowerCase())
    tokens.add(sage.era_key.toLowerCase())

    // Map tokens → sage
    tokens.forEach(token => {
      if (!index.has(token)) {
        index.set(token, [])
      }
      index.get(token).push(sage)
    })
  })

  return index
}

/**
 * Full-text search across all sages
 */
async function semanticSearch(query) {
  if (!query || !query.trim()) {
    return { sages: [], connections: [] }
  }

  const q = query.toLowerCase().trim()
  const results = new Set()

  // Local index search (instant)
  if (window.searchIndex) {
    const tokens = q.split(/\s+/)
    tokens.forEach(token => {
      const matches = window.searchIndex.get(token) || []
      matches.forEach(sage => results.add(sage.id))
    })
  }

  // Alternative: Server-side full-text search (if enabled)
  // const { data } = await supabase
  //   .from('sages')
  //   .select('*')
  //   .textSearch('search_vector', q)

  // Get matching sages
  const matchingSages = window.graphData.nodes.filter(s => results.has(s.id))

  // Get connections between matching sages
  const matchingIds = new Set(matchingSages.map(s => s.id))
  const matchingConnections = window.graphData.links.filter(c =>
    matchingIds.has(c.source_id) || matchingIds.has(c.target_id)
  )

  return {
    sages: matchingSages,
    connections: matchingConnections
  }
}

// ============================================================================
// PART 3: USER FEATURES
// ============================================================================

/**
 * Check if user is authenticated
 */
async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return user
}

/**
 * Sign up or login with email
 */
async function signInWithEmail(email, password, isSignUp = false) {
  const method = isSignUp ? 'signUp' : 'signInWithPassword'

  const { data, error } = await supabase.auth[method]({
    email,
    password
  })

  if (error) {
    console.error(`❌ Auth error:`, error)
    return null
  }

  console.log(`✓ ${isSignUp ? 'Signed up' : 'Logged in'}:`, email)
  return data.user
}

/**
 * Sign out
 */
async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('❌ Signout error:', error)
    return false
  }
  console.log('✓ Signed out')
  return true
}

/**
 * Add sage to bookmarks
 */
async function bookmarkSage(sageId, note = '') {
  const user = await getCurrentUser()
  if (!user) {
    alert('צריך להיות מחובר כדי לשמור')
    return false
  }

  const { error } = await supabase
    .from('bookmarks')
    .upsert({
      user_id: user.id,
      sage_id: sageId,
      note
    })

  if (error) {
    console.error('❌ Bookmark error:', error)
    return false
  }

  console.log(`✓ Bookmarked ${sageId}`)
  return true
}

/**
 * Get user's bookmarks
 */
async function getUserBookmarks() {
  const user = await getCurrentUser()
  if (!user) return []

  const { data: bookmarks, error } = await supabase
    .from('bookmarks')
    .select('sage_id, note')
    .eq('user_id', user.id)

  if (error) {
    console.error('❌ Bookmarks error:', error)
    return []
  }

  return bookmarks
}

/**
 * Log sage view to history
 */
async function logSageView(sageId, context = 'direct') {
  const user = await getCurrentUser()
  if (!user) return // Silent fail for non-authenticated users

  const { error } = await supabase
    .from('view_history')
    .insert({
      user_id: user.id,
      sage_id: sageId,
      context
    })

  if (error) {
    console.error('⚠️ History log error:', error)
  }
}

/**
 * Get user's view history
 */
async function getUserHistory(limit = 20) {
  const user = await getCurrentUser()
  if (!user) return []

  const { data: history, error } = await supabase
    .from('view_history')
    .select('sage_id, context, viewed_at')
    .eq('user_id', user.id)
    .order('viewed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('❌ History error:', error)
    return []
  }

  return history
}

// ============================================================================
// PART 4: EXPORTS FOR USE IN OTHER MODULES
// ============================================================================

export {
  supabase,
  initializeApp,
  loadSages,
  loadConnections,
  loadResearchContent,
  loadSageProfile,
  semanticSearch,
  getCurrentUser,
  signInWithEmail,
  signOut,
  bookmarkSage,
  getUserBookmarks,
  logSageView,
  getUserHistory
}
