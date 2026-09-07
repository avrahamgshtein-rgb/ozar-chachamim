# Stage 2: Data Foundation — Completed & Remaining Work

## Summary
Stage 2 establishes a shared, unified data normalization pipeline for canonical + supplemental datasets. The core pipeline is complete and tested with real data. **Consumer integration remains**: AppShell and serverData must be wired to use it instead of their current ad-hoc merging.

---

## COMPLETED: Core Pipeline Module

### `lib/dataFoundation.ts` (206 lines)
**Status**: ✓ COMPLETE, type-checked, tested

Implements:
- **Location interface** with role, period, precision, source
- **SageRecord** type extending Sage with locations array, research metadata
- **DataValidationIssue** for quality reporting without silent loss
- **normalizeSage()** — normalize raw data nodes to canonical type
  - Era key mapping (11 Period types) with fallback to 'modern'
  - Warns on unknown era_key
  - Preserves all supported fields
- **mergeDatasets()** — merge canonical + supplements (precedence: first-seen wins)
  - Deduplicate only identical (source→target:type) relationships
  - Preserve distinct relationship types and directions
  - Count canonical vs supplement sages
- **applyPatches()** — apply field overrides consistently
- **applyTranslations()** — apply locale-specific field overlays with fallback to Hebrew

### Integration Test Results

**File**: `test-stage2-integration.js` (executable, passes with real data)

**Results** (422 canonical + 4 supplements):
```
Merged datasets: 468 unique sages
  - Canonical: 422
  - Supplemental: 46 (8 ancient + 5 supplement + 33 supplement-2 + 0 research-links)

Relationships: 1673 unique (source→target:type)
  - Original links: 1677 total across all datasets
  - Deduplication: 4 duplicates removed ✓

Period distribution:
  modern: 179, rishonim: 159, acharonim: 86, second-temple: 13, tannaim: 12,
  amoraim: 7, geonim: 6, judges: 3, kings: 2, patriarchs: 1

Relationship types:
  colleague: 1173, influence: 385, teacher: 35, student: 28, family: 22,
  predecessor: 12, oppose: 9, contemporary: 9

Pipeline is deterministic (same output every run) ✓
Core fields preserved ✓
```

### Type Safety
✓ TypeScript builds (npm run type-check) with no errors

---

## COMPLETED: Supporting Test Infrastructure

### Production-Code Tests
- **test-chat-fixes.js** — validates Stage 1 chat persistence fixes (17 tests)
- **test-data-foundation.js** — validates core normalization logic (9 tests)
- **test-production-code.js** — validates serverData module contract (26 tests)

All tests pass with actual production code and datasets.

---

## COMPLETED: Stage 1 Baseline

Verified intact (not regressed by Stage 2 work):
- ✓ serverData: loads canonical + all 4 supplements, exports 4 required functions
- ✓ getResearchDocs: path containment check (resolve + startsWith)
- ✓ chat/route.ts: persistence error checks (session lookup, inserts, history, assistant message)
- ✓ Release result checking: distinguishes transport errors from business errors

---

## REMAINING: Consumer Integration

### 1. AppShell Consumer (`components/layout/AppShell.tsx`)

**Current**: Manual dataset merging (lines 101-131)
```tsx
// Lines 104-114: Manual supplement loading and merge
for (const src of ['/data-ancient.json', ...]) {
  const extra = await fetch(src).then(...)
  sages = [...sages, ...extra.nodes.filter(...)]
  connections = [...connections, ...extra.links]
}

// Lines 117-123: Manual patch application
sages = sages.map(s => patch[s.id] ? { ...s, ...patch[s.id] } : s)
```

**Required**: Replace with dataFoundation pipeline
- Call `loadAppShellData()` from `lib/appShellDataLoader.ts` instead of manual merge
- Preserves Supabase → data.json fallback logic (graceful degradation)
- Returns sages + connections + quality report
- Continues to apply content overlay (translations) after normalization

**Why**: Ensures browser and server use identical normalization for relationships, patching, and period mapping.

### 2. serverData Consumer (`lib/serverData.ts`)

**Current**: Loads canonical + supplements, applies simple field mapping (lines 39-73)

**Required**: 
- Normalize via dataFoundation pipeline for field consistency
- Apply patches from data-patch.json server-side (currently client-only)
- Ensure same period/relationship deduplication as browser

**Why**: Server-rendered sage pages and RAG queries must see the same data as browser.

### 3. Endpoint Validation (API Route: `app/api/research/[id]/route.ts`)

**Current**: Line 26 calls `getSageById()` for validation

**Status**: ✓ Already correct — uses serverData which loads all supplements

**Remains**: Document that validation ensures only sages known to the full dataset can request research.

---

## BLOCKING: Translation Layer

**Current**: AppShell applies `contentOverlay` after normalization (line 126-127)

**Status**: Works as-is; no change needed.

**Note**: dataFoundation exports `applyTranslations()` for consistency if server-side translation is needed later.

---

## IMPLEMENTATION CHECKLIST

- [ ] Update AppShell to call `loadAppShellData()` from `appShellDataLoader.ts`
  - [ ] Preserve Supabase fallback logic
  - [ ] Apply content overlay AFTER dataFoundation merge
  - [ ] Update console.log messages
- [ ] Wire serverData to use dataFoundation for normalization
  - [ ] Apply data-patch.json server-side
  - [ ] Preserve all exports (getSageById, getAllSages, getSageConnections, getResearchDocs)
- [ ] Create integration test: verify AppShell + serverData use same counts/relationships
- [ ] Update README: document data pipeline flow (canonical → merge → patch → translate)

---

## KNOWN ISSUES & NOTES

1. **dataConsumer.ts**: Stub created but not used; either integrate into AppShell or remove.
2. **appShellDataLoader.ts**: Stub created but not used; either integrate into AppShell or remove.
3. **data-research-links.json**: Has 0 sages, 5 links only. Not clear if this is canonical source or artifact.
4. **Period fallback**: Unknown era_key values fallback to 'modern' (currently affects 0 sages).
5. **Patch timing**: Patches applied client-side only currently; server-side application would require separate migrations/config.

---

## STAGE 1 ITEMS STILL OPEN

Per user clarification: not fixed, intentionally separated:
- Confirmation reconciliation (requires database semantics verification)
- Deployed database compatibility (SQL UNIQUE(request_id) in usage_events)
- Application-level concurrency testing (staging environment)

These require separate sessions with database access and live environment testing.

---

## COMMIT INFORMATION

**Branch**: stage/2-data-foundation (based on b829372, includes Stage 1 corrections)

**Files Added**:
- `lib/dataFoundation.ts` — core pipeline
- `lib/appShellDataLoader.ts` — AppShell consumer stub
- `lib/dataConsumer.ts` — generic consumer stub
- `test-stage2-integration.js` — integration test (PASSED ✓)

**Files Unchanged** (verified intact):
- `app/api/chat/route.ts` — Stage 1 fixes present
- `lib/serverData.ts` — Stage 1 fixes present
- `components/layout/AppShell.tsx` — ready for integration
- `app/api/research/[id]/route.ts` — validation correct

**Next Session**: Wire AppShell + serverData to use dataFoundation, verify counts, test browser/server consistency.
