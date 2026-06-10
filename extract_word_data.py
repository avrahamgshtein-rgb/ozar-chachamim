#!/usr/bin/env python3
"""Extract metadata from Word documents"""
import json
import os
import re
from pathlib import Path
from collections import defaultdict

try:
    from docx import Document
except ImportError:
    os.system("pip install python-docx --break-system-packages")
    from docx import Document

OZAR_PATH = Path("/sessions/eloquent-funny-meitner/mnt/ozar-chachamim")
DATA_PATH = OZAR_PATH / "data"
DATA_JSON = OZAR_PATH / "data.json"

def extract_text_from_docx(docx_path):
    """Extract all text from Word document"""
    try:
        doc = Document(docx_path)
        text = '\n'.join([para.text for para in doc.paragraphs if para.text.strip()])
        return text
    except:
        return ""

def extract_dates(text):
    """Extract birth-death dates"""
    date_patterns = [
        r'(\d{4})[–-](\d{4})',
        r'המאה ה[־-]?(\d+)',
        r'בערך (\d{4})',
    ]
    dates = []
    for pattern in date_patterns:
        matches = re.findall(pattern, text)
        dates.extend(matches)
    return dates[:2] if dates else None

def extract_locations(text):
    """Extract location names"""
    hebrew_locations = [
        'ירושלים', 'בבל', 'מצרים', 'אלכסנדריה', 'יוון', 'רומא', 'ספרד',
        'קורדובה', 'צפת', 'טבריה', 'ארץ ישראל', 'אשכנז', 'צרפת',
    ]
    found = []
    for loc in hebrew_locations:
        if loc in text:
            found.append(loc)
    return list(set(found))[:3] if found else None

def extract_sage_name(filename):
    """Extract sage name from filename"""
    name = filename.rsplit('.', 1)[0]
    name = re.sub(r'\([^)]*\)', '', name).strip()
    name = re.sub(r'_', ' ', name).strip()
    return name if name else None

def main():
    print("\n=== Extracting Word Document Data ===\n")

    with open(DATA_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    sage_names = {sage['label']: sage for sage in data.get('nodes', [])}
    print(f"✓ Loaded {len(sage_names)} sages\n")

    word_files = sorted(DATA_PATH.glob('*.docx'))
    print(f"Found {len(word_files)} Word files\n")

    extracted = defaultdict(lambda: {'dates': None, 'locations': [], 'files': []})

    for i, docx_file in enumerate(word_files, 1):
        text = extract_text_from_docx(docx_file)
        if not text:
            continue

        sage_name = extract_sage_name(docx_file.name)
        matching_sage = None

        if sage_name:
            for db_name in sage_names.keys():
                if sage_name.lower() in db_name.lower() or db_name.lower() in sage_name.lower():
                    matching_sage = db_name
                    break

        if matching_sage:
            print(f"[{i}/{len(word_files)}] ✓ {matching_sage[:40]}")
            dates = extract_dates(text)
            locations = extract_locations(text)

            if dates:
                extracted[matching_sage]['dates'] = dates
            if locations:
                extracted[matching_sage]['locations'] = locations

            extracted[matching_sage]['files'].append(docx_file.name)

    # Update data.json
    print(f"\nEnhancing {len(extracted)} sages...")
    updated = 0

    for sage in data.get('nodes', []):
        if sage['label'] in extracted:
            info = extracted[sage['label']]
            if info['dates'] and not sage.get('dates'):
                sage['dates'] = f"{info['dates'][0]}" if info['dates'] else None
                updated += 1
            if info['locations']:
                if sage.get('location'):
                    sage['location'] += '; ' + '; '.join(info['locations'])
                else:
                    sage['location'] = '; '.join(info['locations'])
            sage['source_documents'] = info['files']

    with open(DATA_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ Updated {updated} sages")
    print(f"✓ Saved: data.json with source documents")

if __name__ == '__main__':
    main()
