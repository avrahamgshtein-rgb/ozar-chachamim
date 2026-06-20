#!/usr/bin/env python3
"""
Extract text from ALL 128 Word files in DATA folder and build comprehensive research.json
with sage_id mapping using fuzzy matching against data.json
"""

import json
import os
import re
from pathlib import Path
from docx import Document
from difflib import SequenceMatcher
import unicodedata

DATA_FOLDER = Path("./data")
RESEARCH_FILE = Path("./research.json")
DATA_FILE = Path("./data.json")

def extract_text_from_docx(file_path):
    """Extract all text from a Word document"""
    try:
        doc = Document(file_path)
        text = []
        for para in doc.paragraphs:
            if para.text.strip():
                text.append(para.text)
        return "\n".join(text)
    except Exception as e:
        print(f"❌ Error reading {file_path.name}: {str(e)}")
        return ""

def normalize_text(text):
    """Normalize Hebrew text for matching (remove niqqud, accents, etc.)"""
    # Remove combining diacritics
    nfd = unicodedata.normalize('NFD', text)
    return ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')

def extract_sage_name_from_filename(filename):
    """Extract sage name from filename for matching"""
    # Remove .docx extension
    name = filename.replace('.docx', '').replace('.doc', '')
    # Remove common prefixes like "הרב ", "רבי ", "רבנו ", etc.
    name = re.sub(r'^(הרב|רבי|רבנו|ר_|ר\.|סגל|מהר|של_ה|ה[א-ת]+_)', '', name)
    return name.strip()

def fuzzy_match_sage(filename, sages):
    """Find the best matching sage for a filename using fuzzy matching"""
    filename_name = extract_sage_name_from_filename(filename)

    best_match = None
    best_score = 0

    for sage in sages:
        sage_label = sage.get('label', '')

        # Try matching full Hebrew label
        ratio = SequenceMatcher(None, filename_name.lower(), sage_label.lower()).ratio()
        if ratio > best_score:
            best_score = ratio
            best_match = sage

        # Also try shorter versions (remove prefixes)
        sage_short = re.sub(r'^(הרב|רבי|רבנו|ר_|ר\.|סגל|מהר|של_ה|ה[א-ת]+_)', '', sage_label)
        ratio2 = SequenceMatcher(None, filename_name.lower(), sage_short.lower()).ratio()
        if ratio2 > best_score:
            best_score = ratio2
            best_match = sage

    # Return match only if score is reasonable (>0.4 = 40% similar)
    if best_score > 0.4:
        return best_match, best_score
    return None, best_score

def get_summary(text, max_length=300):
    """Get first ~300 chars of text as summary"""
    if not text:
        return ""
    text = text.strip()
    if len(text) <= max_length:
        return text
    # Try to cut at a sentence boundary
    cut_text = text[:max_length]
    last_period = cut_text.rfind('.')
    last_newline = cut_text.rfind('\n')
    cut_point = max(last_period, last_newline)
    if cut_point > max_length - 100:
        return text[:cut_point+1]
    return cut_text + "..."

# Load existing data.json for sage list
print("📖 Loading data.json...")
with open(DATA_FILE) as f:
    data = json.load(f)
sages_by_id = {str(sage['id']): sage for sage in data.get('nodes', [])}
print(f"✅ Loaded {len(sages_by_id)} sages from data.json")

# Find all Word files
print("\n📂 Scanning DATA folder...")
word_files = list(DATA_FOLDER.glob("*.docx")) + list(DATA_FOLDER.glob("*.doc"))
print(f"✅ Found {len(word_files)} Word documents")

# Extract from all files
print("\n🔄 Extracting text from all documents...")
research_docs = []
summaries = []
matched_count = 0
unmatched_count = 0

for i, file_path in enumerate(sorted(word_files), 1):
    filename = file_path.name
    print(f"  [{i:3d}/128] {filename[:60]:60s} ", end="", flush=True)

    # Extract text
    content = extract_text_from_docx(file_path)
    word_count = len(content.split())

    if not content:
        print("❌ No text extracted")
        continue

    # Try to match to a sage
    matched_sage, match_score = fuzzy_match_sage(filename, data.get('nodes', []))

    if matched_sage:
        sage_id = str(matched_sage['id'])
        sage_label = matched_sage['label']
        print(f"✅ → {sage_label} ({match_score:.0%})")
        matched_count += 1

        # Add to research.json
        research_docs.append({
            "sage_id": sage_id,
            "sage_label": sage_label,
            "source_file": filename,
            "content": content,
            "word_count": word_count,
            "match_confidence": round(match_score, 2)
        })

        # Add summary
        summary = get_summary(content)
        summaries.append({
            "file": filename,
            "title": sage_label,
            "summary": summary,
            "para_count": len([p for p in content.split('\n') if p.strip()]),
            "sage_id": sage_id,
            "word_count": word_count
        })
    else:
        print(f"⚠️  No match (no sage with >40% similarity)")
        unmatched_count += 1

        # Still add to research.json with null sage_id
        research_docs.append({
            "sage_id": None,
            "sage_label": extract_sage_name_from_filename(filename),
            "source_file": filename,
            "content": content,
            "word_count": word_count,
            "match_confidence": 0
        })

print(f"\n{'='*80}")
print(f"📊 Results:")
print(f"   ✅ Matched: {matched_count}")
print(f"   ⚠️  Unmatched: {unmatched_count}")
print(f"   Total: {len(research_docs)}")

# Write research.json
print(f"\n💾 Writing research.json ({len(research_docs)} documents)...")
with open(RESEARCH_FILE, 'w', encoding='utf-8') as f:
    json.dump(research_docs, f, ensure_ascii=False, indent=2)
print(f"✅ Wrote {RESEARCH_FILE}")

# Write research_summaries.json
summaries_file = Path("./research_summaries.json")
print(f"\n💾 Writing research_summaries.json ({len(summaries)} entries)...")
with open(summaries_file, 'w', encoding='utf-8') as f:
    json.dump(summaries, f, ensure_ascii=False, indent=2)
print(f"✅ Wrote {summaries_file}")

# Build research_by_sage.json
print(f"\n🔗 Building research_by_sage.json index...")
research_by_sage = {}
for doc in research_docs:
    if doc['sage_id']:
        sage_id = doc['sage_id']
        if sage_id not in research_by_sage:
            research_by_sage[sage_id] = []
        research_by_sage[sage_id].append({
            "file": doc['source_file'],
            "title": doc['sage_label'],
            "word_count": doc['word_count'],
            "confidence": doc['match_confidence']
        })

by_sage_file = Path("./research_by_sage.json")
with open(by_sage_file, 'w', encoding='utf-8') as f:
    json.dump(research_by_sage, f, ensure_ascii=False, indent=2)
print(f"✅ Wrote {by_sage_file} ({len(research_by_sage)} sages with research)")

# Summary stats
print(f"\n📈 Summary:")
total_words = sum(doc['word_count'] for doc in research_docs)
print(f"   Total documents: {len(research_docs)}")
print(f"   Total words: {total_words:,}")
print(f"   Avg words/doc: {total_words // max(len(research_docs), 1):,}")
print(f"   Sages with research: {len(research_by_sage)}")
