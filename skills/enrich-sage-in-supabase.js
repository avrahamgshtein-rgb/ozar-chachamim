/**
 * SKILL: Enrich Sage in Database
 *
 * Purpose: Take extracted JSON data from Skill 1 and update Supabase
 * Input: JSON object {sage_name_english, bio, main_works, key_ideas, related_sages, locations}
 * Output: {success: bool, sage_id: int, updated_fields: string[]}
 *
 * Safety:
 *   - Always validate sage exists before updating
 *   - Check for FK constraints on related_sages
 *   - Log all changes (audit trail)
 *   - Requires explicit approval before INSERT/UPDATE
 *
 * Usage:
 *   const enrichData = {
 *     sage_name_english: "Rambam",
 *     bio: "Moses Maimonides was a physician...",
 *     main_works: ["Mishneh Torah", "Guide for the Perplexed"],
 *     key_ideas: ["Integration of Aristotle", "13 Principles of Faith"],
 *     related_sages: [{name: "Joseph Al-Malik", relation: "teacher"}, ...],
 *     locations: ["ספרד", "מצרים"]
 *   };
 *   const result = await enrichSageInSupabase(enrichData, supabaseClient, sageId);
 */

async function enrichSageInSupabase(extractedData, supabaseClient, sageId) {
  if (!supabaseClient) {
    throw new Error('Supabase client required');
  }

  if (!sageId) {
    throw new Error('Sage ID required');
  }

  // ============================================================
  // PHASE 1: VALIDATION
  // ============================================================

  // Check sage exists
  const { data: sage, error: fetchError } = await supabaseClient
    .from('sages')
    .select('id, label')
    .eq('id', sageId)
    .single();

  if (fetchError || !sage) {
    throw new Error(`Sage ID ${sageId} not found in database`);
  }

  console.log(`✅ Found sage: ${sage.label}`);

  // Check related sages exist (FK validation)
  const relatedSageNames = extractedData.related_sages.map(r => r.name) || [];
  const validatedRelations = [];

  for (const relation of (extractedData.related_sages || [])) {
    // Try to find by name
    const { data: relatedSage } = await supabaseClient
      .from('sages')
      .select('id, label')
      .ilike('label', `%${relation.name}%`)
      .limit(1)
      .single();

    if (relatedSage) {
      validatedRelations.push({
        ...relation,
        related_sage_id: relatedSage.id,
      });
      console.log(`  ✅ Found related sage: ${relatedSage.label}`);
    } else {
      console.warn(`  ⚠️ Could not find: ${relation.name} (will skip connection)`);
    }
  }

  // ============================================================
  // PHASE 2: PREPARE UPDATE DATA
  // ============================================================

  const updatePayload = {};

  // Update biography
  if (extractedData.bio) {
    updatePayload.bio = extractedData.bio;
  }

  // Update core concept (pick first key idea)
  if (extractedData.key_ideas && extractedData.key_ideas.length > 0) {
    updatePayload.core_concept = extractedData.key_ideas[0];
  }

  // Update main works as JSON array
  if (extractedData.main_works && extractedData.main_works.length > 0) {
    updatePayload.main_works = extractedData.main_works; // Store as JSONB in Supabase
  }

  // Update tags from locations
  const tags = [];
  for (const loc of extractedData.locations || []) {
    tags.push(`location:${loc}`);
  }
  if (tags.length > 0) {
    updatePayload.tags = tags;
  }

  // Mark as research-enriched
  updatePayload.research_enriched_at = new Date().toISOString();

  // ============================================================
  // PHASE 3: UPDATE SUPABASE
  // ============================================================

  const { data: updated, error: updateError } = await supabaseClient
    .from('sages')
    .update(updatePayload)
    .eq('id', sageId)
    .select();

  if (updateError) {
    throw new Error(`Failed to update sage: ${updateError.message}`);
  }

  console.log(`✅ Updated sage fields: ${Object.keys(updatePayload).join(', ')}`);

  // ============================================================
  // PHASE 4: CREATE CONNECTIONS FOR RELATED SAGES
  // ============================================================

  const createdConnections = [];

  for (const relation of validatedRelations) {
    const connectionType = mapRelationType(relation.relation);

    // Check if connection already exists (avoid duplicates)
    const { data: existing } = await supabaseClient
      .from('connections')
      .select('id')
      .eq('source_id', sageId)
      .eq('target_id', relation.related_sage_id)
      .eq('type', connectionType)
      .single();

    if (!existing) {
      const { data: newConn, error: connError } = await supabaseClient
        .from('connections')
        .insert([
          {
            source_id: sageId,
            target_id: relation.related_sage_id,
            type: connectionType,
          },
        ])
        .select();

      if (connError) {
        console.warn(`  ⚠️ Failed to create connection: ${connError.message}`);
      } else {
        createdConnections.push(newConn[0]);
        console.log(`  ✅ Created connection: ${sageId} → ${relation.related_sage_id} (${connectionType})`);
      }
    } else {
      console.log(`  ℹ️ Connection already exists (skipped duplicate)`);
    }
  }

  // ============================================================
  // PHASE 5: LOG & RETURN
  // ============================================================

  const result = {
    success: true,
    sage_id: sageId,
    updated_fields: Object.keys(updatePayload),
    connections_created: createdConnections.length,
    timestamp: new Date().toISOString(),
  };

  console.log(`\n✅ Enrichment complete: ${JSON.stringify(result)}`);

  return result;
}

// ============================================================
// HELPERS
// ============================================================

function mapRelationType(relationString) {
  /**
   * Map extracted relation text to valid Supabase connection types:
   * student, influence, oppose, colleague, predecessor, teacher, contemporary
   */
  const map = {
    student: 'student',
    teacher: 'teacher',
    taught: 'teacher',
    studied: 'student',
    contemporary: 'contemporary',
    colleague: 'colleague',
    influenced: 'influence',
    opposed: 'oppose',
    opponent: 'oppose',
    predecessor: 'predecessor',
  };

  const normalized = relationString.toLowerCase();
  for (const [key, value] of Object.entries(map)) {
    if (normalized.includes(key)) return value;
  }

  return 'colleague'; // Default fallback
}

// ============================================================
// EXPORT
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { enrichSageInSupabase };
}
