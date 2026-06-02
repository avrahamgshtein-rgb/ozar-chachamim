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
 * TASK A: Master data initialization with robust validation
 * Ensures single source of truth with defensive FK checking
 */
async function initializeApp() {
  console.log('🔄 [AppInit] Initializing Supabase backend with validation...')

  try {
    // Load core data in parallel
    const [sages, connections] = await Promise.all([
      loadSages(),
      loadConnections()
    ])

    // DEFENSIVE VALIDATION: Build node ID map
    const sageMap = new Map(sages.map(s => [String(s.id), s]))
    const validSageIds = new Set(sageMap.keys())

    console.log(`📋 [Validation] Loaded ${sages.length} sages, validating ${connections.length} connections...`)

    // Filter + validate connections
    let invalidCount = 0
    const validConnections = connections.filter(c => {
      const sourceId = String(c.source_id)
      const targetId = String(c.target_id)
      const valid = validSageIds.has(sourceId) && validSageIds.has(targetId)

      if (!valid) {
        console.warn(`⚠️ Invalid connection: ${sourceId} → ${targetId}`)
        invalidCount++
      }
      return valid
    })

    if (invalidCount > 0) {
      console.warn(`⚠️ Filtered out ${invalidCount} invalid connections`)
    }
    console.log(`✓ ${validConnections.length}/${connections.length} connections validated`)

    // TASK A: Convert Supabase format to unified global format
    // Single source of truth with all necessary fields for visualization
    const nodes = sages.map(s => ({
      // Core identity
      id: String(s.id),
      label: s.name_he,
      name_he: s.name_he,
      name_en: s.name_en || '',

      // Era & chronology
      era: s.era || 'Unknown',
      era_key: s.era_key || 'unknown',
      group: s.era_key || 'unknown',  // D3 group for coloring
      period_order: s.period_order || 999,

      // Geographic & biographical
      region: s.region || 'Unknown',
      coordinates: s.coordinates || null,
      primary_field: s.primary_field || '',

      // Content enrichment
      tags: s.tags || '',
      summary: s.summary || '',
      core_concept: s.core_concept || '',

      // Media
      spotify_url: s.spotify_url || null,

      // Statistics
      connection_count: s.connection_count || 0,
      has_research: s.has_research || false
    }))

    const links = validConnections.map(c => ({
      source: String(c.source_id),
      target: String(c.target_id),
      type: c.connection_type || 'colleague',
      historical_period: c.historical_period
    }))

    // SINGLE SOURCE OF TRUTH
    window.graphData = {
      nodes: nodes,
      links: links,
      sageMap: sageMap,  // Fast lookup by ID
      meta: {
        loaded_at: new Date().toISOString(),
        node_count: nodes.length,
        link_count: links.length,
        validated: true
      }
    }

    // Create search index for instant cross-field search
    window.searchIndex = createSearchIndex(nodes)

    // Store Supabase client for on-demand queries
    window.supabase = supabase

    console.log(`✅ [AppInit] Single Source Ready: ${nodes.length} nodes + ${links.length} validated edges`)
    console.log(`📊 Sages by era: ${nodes.reduce((acc, n) => {
      acc[n.era_key] = (acc[n.era_key] || 0) + 1
      return acc
    }, {})}`)

    // Signal data ready
    document.dispatchEvent(new CustomEvent('supabaseReady', {
      detail: { nodes: nodes.length, links: links.length, sageMap: sageMap }
    }))

    return true
  } catch (error) {
    console.error('❌ [AppInit] Critical error:', error)
    document.dispatchEvent(new CustomEvent('supabaseError', { detail: error }))
    return false
  }
}

// ============================================================================
// PART 2: FULL-TEXT SEARCH (Cross-Tab)
// ============================================================================

/**
 * TASK D: Create cross-field search index for instant results
 * Includes name, field, tags, era, and core concepts
 */
function createSearchIndex(sages) {
  const index = new Map()

  sages.forEach(sage => {
    const tokens = new Set()

    // Name (primary identifier)
    if (sage.name_he) {
      sage.name_he.split(/[\s\-]+/).forEach(t => {
        if (t.length > 0) tokens.add(t.toLowerCase())
      })
    }
    if (sage.name_en) {
      sage.name_en.split(/[\s\-]+/).forEach(t => {
        if (t.length > 0) tokens.add(t.toLowerCase())
      })
    }

    // Primary field (academic discipline)
    if (sage.primary_field) {
      sage.primary_field.split(/[,\s]+/).forEach(t => {
        if (t.length > 0) tokens.add(t.toLowerCase())
      })
    }

    // Tags (conceptual keywords)
    if (sage.tags) {
      sage.tags.split(/[,\s]+/).forEach(t => {
        if (t.length > 0) tokens.add(t.toLowerCase())
      })
    }

    // Core concept (central idea/innovation) — CRITICAL for Task D
    if (sage.core_concept) {
      sage.core_concept.split(/[,\s]+/).forEach(t => {
        if (t.length > 0) tokens.add(t.toLowerCase())
      })
    }

    // Era (historical period)
    if (sage.era) {
      tokens.add(sage.era.toLowerCase())
    }
    if (sage.era_key) {
      tokens.add(sage.era_key.toLowerCase())
    }

    // Region (geographic area)
    if (sage.region) {
      sage.region.split(/[,\s]+/).forEach(t => {
        if (t.length > 0) tokens.add(t.toLowerCase())
      })
    }

    // Index every token → sage mapping
    tokens.forEach(token => {
      if (!index.has(token)) {
        index.set(token, [])
      }
      index.get(token).push(sage)
    })
  })

  console.log(`🔍 [SearchIndex] Built index with ${index.size} unique tokens across ${sages.length} sages`)
  return index
}

/**
 * TASK D: Cross-field semantic search across names, concepts, tags, eras
 * Returns matching sages + related connections for cross-tab filtering
 */
async function semanticSearch(query) {
  if (!query || !query.trim()) {
    return {
      sages: [],
      connections: [],
      query: '',
      totalSages: window.graphData?.nodes?.length || 0
    }
  }

  const q = query.toLowerCase().trim()
  const matchingIds = new Set()

  // TOKEN-BASED SEARCH: Split query and find all matching sages
  if (window.searchIndex) {
    const tokens = q.split(/\s+/).filter(t => t.length > 0)
    tokens.forEach(token => {
      // Direct token match
      const directMatches = window.searchIndex.get(token) || []
      directMatches.forEach(sage => matchingIds.add(String(sage.id)))

      // Prefix match (for partial words)
      window.searchIndex.forEach((sages, indexedToken) => {
        if (indexedToken.startsWith(token)) {
          sages.forEach(sage => matchingIds.add(String(sage.id)))
        }
      })
    })
  }

  // DEFENSIVE: Validate matching IDs exist in node set
  const validNodeIds = new Set(window.graphData.nodes.map(n => String(n.id)))
  const validMatches = new Set([...matchingIds].filter(id => validNodeIds.has(id)))

  // Get matching sages
  const matchingSages = window.graphData.nodes.filter(s => validMatches.has(String(s.id)))

  // Get connections (links between matched sages OR involving matched sages)
  const matchingConnections = window.graphData.links.filter(c =>
    validMatches.has(String(c.source)) || validMatches.has(String(c.target))
  )

  console.log(`🔍 [Search] "${q}" → ${matchingSages.length} sages, ${matchingConnections.length} connections`)

  return {
    sages: matchingSages,
    connections: matchingConnections,
    query: q,
    totalSages: window.graphData.nodes.length,
    stats: {
      matched: matchingSages.length,
      connected: matchingConnections.length,
      percentage: Math.round((matchingSages.length / window.graphData.nodes.length) * 100)
    }
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
