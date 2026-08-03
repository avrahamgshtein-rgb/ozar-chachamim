#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Research Ingestion Pipeline
Ingests missing research documents (171 of 438) from data/ to nextjs-app/public/research/
Uses matching logic from extract_full_research.py with real-time logging.
"""
import os
import json
import re
from pathlib import Path
from docx import Document
from datetime import datetime

# Configuration
DATA_DIR = Path('data')
RESEARCH_DIR = Path('nextjs-app/public/research')
BACKUP_DIR = Path('nextjs-app/public/research.backup_2026-08-04')
LOG_FILE = DATA_DIR / 'ingestion_log_2026-08-04.json'
WORKLIST_FILE = DATA_DIR / 'missing_research_171.txt'

# Global state for logging
log_results = []

# ============================================================================
# MATCHING FUNCTIONS (copied from extract_full_research.py)
# ============================================================================

def norm_name(s):
    """Normalize Hebrew name: remove titles, diacritics, strip."""
    if not s:
        return ''
    s = s.replace('״', '"').replace('׳', "'").replace('־', '-').replace('–', '-').replace('_', '"')
    s = re.sub(r'\(.*?\)', ' ', s)
    s = re.sub(r'^(רבנו|רבינו|רבי|הרב|רב|ר\'|חכם|האדמו"ר|אדמו"ר|מרן|המקובל|הגאון)\s+', '', s.strip())
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def word_key(w):
    """Spelling-insensitive key: strip quotes, plene/defective tolerance."""
    w = w.replace('"', '').replace("'", '').replace('״', '').replace('׳', '')
    if len(w) <= 3:
        return w
    return w[0] + w[1:-1].replace('י', '').replace('ו', '') + w[-1]

STOP = {
    'רבי', 'רבנו', 'רבינו', 'הרב', 'רב', 'בן', 'בר', 'בעל', 'ספר', 'הגאון', 'המקובל',
    'חכם', 'דון', 'זצ"ל', 'הראשון', 'השני', 'בין', 'בית', 'ארץ', 'ישראל', 'ספרד', 'מצרים',
    'אשכנז', 'פרובנס', 'צפת', 'ירושלים', 'בבל', 'תורה', 'הלכה', 'קבלה', 'משנתו', 'פועלו',
    'דמותו', 'הגותו', 'העת', 'ימי', 'הביניים', 'המאה', 'גדולי', 'מגדולי', 'הפוסקים', 'חכמי',
    'תולדות', 'ההלכה', 'התורה', 'הקבלה', 'ההגות', 'המשנה', 'התלמוד', 'הציונות', 'החסידות',
    'המוסר', 'הפרשנות', 'לציון', 'יצחק', 'יוסף', 'יעקב', 'אברהם', 'משה', 'דוד', 'שלמה',
    'שמעון', 'שמואל', 'יהודה', 'ישעיה', 'אליהו', 'חיים', 'מאיר'
}

OVERRIDES = {
    'Rabbi Isaiah ben Elijah di Trani (Riaz).docx': 'הריא״ז (רבי ישעיה בן אליהו דטראני)',
    'רבי דוד בן זמרא (הרדב_ז) – גשר בין הרמב_ם לקבלה בצפת.docx': 'הרדב"ז (1479–1573) – מגדולי הפוסקים: בין ספרד למצרים וארץ ישראל',
}

def match_node(filename: str):
    """
    Match docx filename to sage node in data.json.
    Returns: { 'id': str, 'label': str, 'confidence': float } or None

    Confidence levels:
      1.0 = exact name match (after normalization)
      0.8–0.99 = fuzzy word match (3+ shared words)
      0.5–0.7 = weak match (1–2 shared words, long enough)
      < 0.5 = no match
    """
    # Load data.json once
    with open('data.json', 'r', encoding='utf-8') as f:
        nodes = json.load(f)['nodes']

    byname = {norm_name(n['label']): n for n in nodes}

    # Build word indices
    WORD_INDEX = {}
    NAME_INDEX = {}
    for _k, _n in byname.items():
        for _i, _w in enumerate(_k.split()):
            if len(_w) >= 3 and _w not in STOP:
                wk = word_key(_w)
                if wk:
                    WORD_INDEX.setdefault(wk, []).append(_n['id'])
                    if _i < 4:
                        NAME_INDEX.setdefault(wk, []).append(_n['id'])

    # Override check
    if filename in OVERRIDES:
        k = norm_name(OVERRIDES[filename])
        for key, n in byname.items():
            if n['label'] == OVERRIDES[filename] or key == k:
                return {'id': n['id'], 'label': n['label'], 'confidence': 1.0}

    # Exact match
    base = re.sub(r'\.docx$', '', filename)
    base = re.sub(r'\(\d+\)$', '', base).strip()
    candidates = [base] + re.split(r'[_:–—-]| - ', base)
    for c in candidates:
        k = norm_name(c)
        if k and k in byname:
            return {'id': byname[k]['id'], 'label': byname[k]['label'], 'confidence': 1.0}

    # Word-based matching
    raw = base + ' ' + base.replace('_', '"')
    fn_words = {}
    for w in re.split(r'[\s,.:;()\[\]_–—-]+', raw):
        if len(w) >= 4:
            wk = word_key(w)
            if wk:
                fn_words[wk] = max(fn_words.get(wk, 0), len(w))

    best, best_score, best_len = None, 0, 10**9
    for key, n in byname.items():
        n_words = {}
        for i, w in enumerate(key.split()):
            if len(w) >= 4 and w not in STOP and i < 8:
                wk = word_key(w)
                if wk:
                    n_words[wk] = max(n_words.get(wk, 0), len(w))
        if not n_words:
            continue
        shared = [(wk, max(olen, fn_words[wk])) for wk, olen in n_words.items() if wk in fn_words]
        score = len(shared)

        # Single-word match must be unique & long
        if score == 1:
            wk0, olen0 = shared[0]
            owners = set(NAME_INDEX.get(wk0, []))
            if olen0 < 5 or n['id'] not in owners or len(owners) > 1:
                score = 0

        confidence = min(score / 3.0, 0.99) if score > 0 else 0
        if score > best_score or (score == best_score and score > 0 and len(key) < best_len):
            best, best_score, best_len = n, score, len(key)

    if best and best_score > 0:
        confidence = min(best_score / 3.0, 0.99)
        return {'id': best['id'], 'label': best['label'], 'confidence': confidence}

    return None

# ============================================================================
# INGESTION FUNCTIONS
# ============================================================================

def load_existing_research():
    """Return set of sage IDs already ingested."""
    ingested = set()
    if RESEARCH_DIR.exists():
        for json_file in RESEARCH_DIR.glob('*.json'):
            # Pattern: <id>.json or <id>.<locale>.json
            match = re.match(r'^([^.]+)', json_file.name)
            if match:
                ingested.add(match.group(1))
    return ingested

def identify_missing_research():
    """
    Compare data/*.docx against existing research.
    Returns list of docx filenames that haven't been ingested.
    """
    ingested = load_existing_research()
    all_docx = sorted([f.name for f in DATA_DIR.glob('*.docx')])

    missing = []
    for docx_file in all_docx:
        node = match_node(docx_file)
        if node and node['id'] not in ingested:
            missing.append(docx_file)

    return missing

def extract_text(docx_path: str):
    """Extract text from docx, limit to 50KB."""
    try:
        doc = Document(docx_path)
        text = '\n'.join([p.text for p in doc.paragraphs])
        return text[:50000]  # 50KB limit
    except Exception as e:
        raise ValueError(f"Failed to extract {docx_path}: {e}")

def save_research_json(sage_id: str, content: str, status: str = 'ok'):
    """
    Save research JSON to public/research/.
    If status != 'ok', append '_uncertain' to filename.
    """
    RESEARCH_DIR.mkdir(parents=True, exist_ok=True)

    filename = f"{sage_id}.json" if status == 'ok' else f"{sage_id}_uncertain.json"
    filepath = RESEARCH_DIR / filename

    data = [{
        'title': f'Research for {sage_id}',
        'source_file': f'ingested_2026-08-04',
        'word_count': len(content.split()),
        'content': content
    }]

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def log_result(docx: str, status: str, sage_id: str = None, reason: str = '', confidence: float = 0.0):
    """
    Log ingestion result (append to list, flushed at end).
    status: 'OK' | 'SKIP' | 'UNCERTAIN'
    """
    log_results.append({
        'docx_filename': docx,
        'status': status,
        'sage_id': sage_id,
        'sage_label': '',  # Will be filled if matched
        'confidence': confidence,
        'reason': reason,
        'word_count': 0,  # Will be filled if extracted
        'timestamp': datetime.now().isoformat()
    })

def flush_log():
    """Write log_results to JSON file."""
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(log_results, f, ensure_ascii=False, indent=2)
    print(f"Log written to {LOG_FILE}")

def backup_existing_research():
    """Backup existing research before overwriting."""
    if RESEARCH_DIR.exists() and list(RESEARCH_DIR.glob('*.json')):
        import shutil
        if BACKUP_DIR.exists():
            shutil.rmtree(BACKUP_DIR)
        shutil.copytree(RESEARCH_DIR, BACKUP_DIR)
        print(f"Backup created: {BACKUP_DIR}")

# ============================================================================
# MAIN PIPELINE
# ============================================================================

if __name__ == '__main__':
    print("=" * 70)
    print("RESEARCH INGESTION PIPELINE")
    print("=" * 70)

    # Phase 1: Identify
    print("\n[Phase 1] Identifying missing documents...")
    missing = identify_missing_research()
    print(f"Found {len(missing)} missing documents out of 438")

    # Write worklist
    with open(WORKLIST_FILE, 'w', encoding='utf-8') as f:
        f.write("filename\tsage_id\tstatus\n")
        for docx in missing:
            node = match_node(docx)
            sage_id = node['id'] if node else '?'
            f.write(f"{docx}\t{sage_id}\tto_process\n")
    print(f"Worklist written to {WORKLIST_FILE}")

    # Phase 2: Extract & Match (placeholder for now)
    print(f"\n[Phase 2] Processing {len(missing)} documents...")
    print("(Implementation in next task)")

    print("\n" + "=" * 70)
