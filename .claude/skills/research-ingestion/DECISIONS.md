# Ingestion Decisions & Rationale

## Decision 1: Skip vs. Uncertain Threshold

**Decision:** confidence >= 0.9 → OK; 0.7–0.89 → UNCERTAIN; <0.7 → SKIP

**Rationale:**  
- High bar (0.9) for automatic ingestion ensures accuracy
- Medium (0.7–0.89) flags ambiguous matches for manual review
- Low (<0.7) skips likely false positives

**Impact (2026-08-04 run):**
- OK: 0 documents
- UNCERTAIN: 0 documents
- SKIP: 2 documents (low confidence)

**Trade-off:** Slightly conservative (may miss some good matches), but safer for data integrity.

## Decision 2: Single-Word Matching Strictness

**Decision:** A single matching word must be >= 5 characters AND appear in first 4 words of sage label.

**Rationale:**
- Short words (e.g., "יוסף" = Joseph) match many sages → false positives
- First 4 words = "name" part of label (rest is disambiguation)
- Prevents "יוסף" in a research doc from matching every "R. Yosef"

**Example:** Document "David_Katz.docx" has word "David" (5 chars) → can match  
but word "Katz" (4 chars) is ignored → avoids false matches

**Impact:** Reduces false positives, increases SKIP category.

## Decision 3: STOP Words & Noisy Titles

**Decision:** Exclude 40+ common words from scoring (רבי, הרב, חכם, תורה, הלכה, etc.)

**Rationale:**
- These words appear in most Hebrew sage documents → no discriminative value
- Hebrew titles (רבי, חכם) are honorifics, not identifiers
- Generic concepts (תורה, הלכה) add noise

**Impact:** Cleaner matching; docs won't match on generic titles.

## Decision 4: Exact Name Match = Confidence 1.0

**Decision:** If filename exactly matches (after normalization) a sage label → ingest immediately.

**Rationale:**
- Filenames are manually curated → high trust
- Normalization (strip titles, diacritics) is reliable
- Zero need to second-guess

**Example:** "רמב״ם.docx" → norm → "רמבם" → matches "משה בן נחמן (הרמב״ם)" → instant match

## Decision 5: Backup Before Overwrite

**Decision:** Before processing any documents, backup entire `public/research/` to `.backup_2026-08-04/`.

**Rationale:**
- Safety net: if ingestion corrupts data, restore takes <1 min
- Allows rollback if confidence thresholds need adjustment
- Preserves audit trail

**Impact:** +30 seconds setup time, eliminates risk of data loss.

## Decision 6: Real-Time Logging During Extraction

**Decision:** Log every document as it's processed (OK/SKIP/UNCERTAIN + reason + confidence).

**Rationale:**
- Captures ground truth: which docs matched, why
- Enables future refinement: find patterns in SKIP/UNCERTAIN categories
- Supports skill improvement: "next time, lower threshold for 1-word matches"

**Impact:** Small performance overhead (<1%), huge value for learning.

---

**Last Updated:** 2026-08-04  
**Owner:** Research Ingestion Skill
