#!/usr/bin/env python3
"""
Extract research content from Word documents (.docx) and map to sage IDs
"""
import os
import json
import sys
import io
from pathlib import Path
from difflib import SequenceMatcher

# Fix UTF-8 encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    from docx import Document
except ImportError:
    print("❌ python-docx not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "python-docx"])
    from docx import Document

def extract_text_from_docx(filepath):
    """Extract all text from a Word document"""
    try:
        doc = Document(filepath)
        text = []
        for para in doc.paragraphs:
            if para.text.strip():
                text.append(para.text)
        return "\n\n".join(text)
    except Exception as e:
        print(f"  ⚠️  Error reading {filepath}: {e}")
        return None

def fuzzy_match_sage(filename, sages_dict):
    """
    Try to match a Word filename to a sage ID using fuzzy matching
    Strategies:
    1. Exact match in sage names
    2. Substring match
    3. Fuzzy similarity match (80%+ similar)
    """
    filename_clean = filename.replace('.docx', '').strip()

    # Strategy 1: Exact match
    for sage in sages_dict.values():
        name_he = sage.get('name_he')
        if name_he and name_he.strip() == filename_clean:
            return sage['sage_id']

    # Strategy 2: Substring match
    for sage in sages_dict.values():
        name_he = sage.get('name_he')
        if name_he:
            name_clean = name_he.strip()
            if name_clean in filename_clean or filename_clean in name_clean:
                return sage['sage_id']

    # Strategy 3: Fuzzy matching (80% similarity threshold)
    best_match = None
    best_ratio = 0
    for sage in sages_dict.values():
        name_he = sage.get('name_he')
        if not name_he:
            continue
        name_clean = name_he.strip()
        ratio = SequenceMatcher(None, name_clean, filename_clean).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = sage['sage_id']

    if best_ratio > 0.75:  # 75% similarity threshold
        return best_match

    return None

def export_research():
    # Load sages to match filenames
    if not os.path.exists('sages.json'):
        print("❌ sages.json not found. Run export_excel.py first.")
        return

    with open('sages.json', 'r', encoding='utf-8') as f:
        sages = json.load(f)
        sages_dict = {s['sage_id']: s for s in sages}

    data_dir = Path('data')
    if not data_dir.exists():
        print("❌ data/ directory not found")
        return

    docx_files = list(data_dir.glob('*.docx'))
    print(f"📄 Found {len(docx_files)} Word files")

    research_entries = []
    matched = 0
    unmatched = []

    for docx_file in sorted(docx_files):
        print(f"  📖 {docx_file.name}...", end="")

        # Try to match to a sage
        sage_id = fuzzy_match_sage(docx_file.name, sages_dict)

        if not sage_id:
            print(f" ⚠️  No match")
            unmatched.append(docx_file.name)
            continue

        # Extract text
        content = extract_text_from_docx(docx_file)
        if not content:
            print(f" ❌ Failed to extract text")
            continue

        word_count = len(content.split())
        research_entries.append({
            "sage_id": sage_id,
            "content": content,
            "source_file": docx_file.name,
            "word_count": word_count
        })

        print(f" ✓ ({word_count} words)")
        matched += 1

    print(f"\n✅ Matched: {matched}/{len(docx_files)}")
    if unmatched:
        print(f"⚠️  Unmatched ({len(unmatched)}):")
        for name in unmatched[:5]:
            print(f"    - {name}")
        if len(unmatched) > 5:
            print(f"    ... and {len(unmatched) - 5} more")

    # Write to JSON
    with open('research.json', 'w', encoding='utf-8') as f:
        json.dump(research_entries, f, ensure_ascii=False, indent=2)

    print(f"\n💾 Exported {len(research_entries)} research entries to research.json")
    return len(research_entries)

if __name__ == "__main__":
    try:
        count = export_research()
        print(f"\n✨ Done!")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
