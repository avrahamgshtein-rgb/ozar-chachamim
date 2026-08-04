# Research Ingestion Skill

**Version:** 1.0  
**Date:** 2026-08-04  
**Context:** Ozar Chachamim research document pipeline

## Overview

Automated extraction and matching of Hebrew research documents (`.docx`) to sage profiles in Ozar Chachamim. Processes 438 documents from `data/` directory, matches to 409+ sages in `data.json`, and ingests to website.

**Status:** Stable for small batches; future improvements pending.

## Matching Algorithm

### Normalization (norm_name)
1. Replace gershayim variants (״→", ׳→')
2. Remove parenthetical content (e.g., "(1479–1573)")
3. Strip prefixes: רבי, הרב, חכם, האדמו"ר, etc.
4. Collapse whitespace

**Example:** "רבי משה בן נחמן (הרמב״ן)" → "משה בן נחמן"

### Word-Based Matching (word_key)
1. Strip quotes (remove ״, ׳, ", ')
2. For words > 3 chars: strip internal yod/vav (plene/defective tolerance)
   - "פינחס" (with yod) = "פנחס" (without yod) → same key
3. Short words (≤3 chars): use as-is

**Example:** פינחס ↔ פנחס → word_key = "פנחס" (matches)

### Decision Tree

```
if exact_name_match(filename, sage.label):
    confidence = 1.0, status = OK
elif word_match_score >= 3 words:
    confidence = 0.8–0.99, decide by score
elif word_match_score == 1:
    if word_length < 5 or multiple_sages_match:
        confidence = 0.5–0.7, status = UNCERTAIN
    else:
        confidence = 0.8, status = OK
else:
    confidence = 0.0, status = SKIP
```

### Confidence Thresholds
- **HIGH (≥0.9):** Ingest immediately (OK status)
- **MEDIUM (0.7–0.89):** Mark uncertain, save separately, flag for manual review
- **LOW (<0.7):** Skip, log reason

### STOP Words (Noise Filter)

These words don't help matching; ignored when calculating word_match_score:

```
רבי, רבנו, הרב, בן, בר, בעל, ספר, הגאון, חכם, דון, זצ"ל, הראשון, השני,
בית, ארץ, ישראל, ספרד, מצרים, אשכנז, תורה, הלכה, קבלה, משנתו, פועלו, דמותו,
ימי, הביניים, המאה, חכמי, ההלכה, התורה, הקבלה, המוסר, הפרשנות
```

[Full list in ingest_research.py STOP variable]

## Edge Cases & Decisions

### 1. Filename vs Content Mismatch
**Rule:** Prefer filename matching; if filename has no clear match, skip or mark uncertain.  
**Rationale:** Filenames are manually curated, content might have metadata/boilerplate.  
**Implementation:** Use `match_node(filename)` first.

### 2. Multiple Sages in One Document
**Rule:** Take first clear match from analysis; mark as partial if multiple found.  
**Rationale:** Most research docs focus on one sage; metadata might mention others.  

### 3. English-Language Documents
**Rule:** Ingest as `<id>.en.json` (use _en suffix).  
**Rationale:** Keep language variants separate; can be translated/localized later.  

### 4. Corrupt `.docx` Files
**Rule:** Skip with reason "extraction failed", log technical error.  
**Rationale:** Some files may be corrupted on disk; don't block entire batch.  
**Implementation:** Wrap extract_text() in try-catch; log exception message.

### 5. Text Truncation (50KB Limit)
**Rule:** Trim extracted text to first 50KB.  
**Rationale:** Avoid memory bloat; sage identifiers are in first ~10KB anyway.  
**Implementation:** `text[:50000]` after extraction.

## Known Limitations (v1.0)

- No Sefaria API fallback for unmatched documents
- No fuzzy name matching (Levenshtein distance)
- No parallel processing (sequential, ~3 hrs for large batches)
- Manual review required for UNCERTAIN category
- No support for multi-language research extraction

## Performance

- Extraction: ~2–3 hours for 171 documents
- Bottleneck: python-docx file I/O (sequential)
- Memory: <100MB for typical batch

## Future Improvements

- [ ] Parallel processing (multiprocessing.Pool)
- [ ] Sefaria API lookup for "no match" cases
- [ ] Levenshtein distance for fuzzy sage name matching
- [ ] Web UI for reviewing UNCERTAIN matches
- [ ] Automated weekly cron job (GitHub Actions)
- [ ] Multi-language research corpus (EN/RU extraction)

## Testing & Validation

- All output JSON must be valid UTF-8
- No duplicate sage IDs ingested
- Existing documents must not be overwritten
- No console errors in browser

---

**Last Updated:** 2026-08-04  
**Next Maintenance:** When improvements from list implemented
