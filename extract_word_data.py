#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract biographical and location data from WORD files
Enrich sage profiles with detailed information
"""

import os
import sys
import json
from pathlib import Path
from docx import Document

# Fix encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Known locations in Hebrew - for matching
KNOWN_LOCATIONS = {
    'ירושלים': ['Jerusalem', 'ירושלים'],
    'בבל': ['Babylon', 'בבל'],
    'מצרים': ['Egypt', 'מצרים'],
    'אלכסנדריה': ['Alexandria', 'אלכסנדריה'],
    'יוון': ['Greece', 'יוון'],
    'אתונה': ['Athens', 'אתונה'],
    'רומא': ['Rome', 'רומא'],
    'ספרד': ['Spain', 'ספרד'],
    'צרפת': ['France', 'צרפת'],
    'גרמניה': ['Germany', 'גרמניה'],
    'פולין': ['Poland', 'פולין'],
    'רוסיה': ['Russia', 'רוסיה'],
    'טבריה': ['Tiberias', 'טבריה'],
    'צפת': ['Safed', 'צפת'],
    'עכו': ['Acre', 'עכו'],
    'יריחו': ['Jericho', 'יריחו'],
    'לוד': ['Lod', 'לוד'],
    'קיסריה': ['Caesarea', 'קיסריה'],
    'עיר': ['City', 'עיר'],
}

def extract_text_from_docx(docx_path):
    """Extract all text from DOCX file"""
    try:
        doc = Document(docx_path)
        text = []
        for para in doc.paragraphs:
            if para.text.strip():
                text.append(para.text)
        return '\n'.join(text)
    except Exception as e:
        print(f"  ⚠️  Error reading {docx_path}: {e}")
        return ""

def extract_sage_name(filename):
    """Extract sage name from filename"""
    # Remove .docx and clean up
    name = filename.replace('.docx', '').replace('.doc', '').strip()
    # Remove dates and annotations in parentheses
    name = name.split('(')[0].strip()
    return name

def find_locations_in_text(text):
    """Find location names mentioned in text"""
    locations = []
    text_lower = text.lower()

    for he_loc, variants in KNOWN_LOCATIONS.items():
        for variant in variants:
            if variant.lower() in text_lower:
                if he_loc not in locations:
                    locations.append(he_loc)
                break

    return locations

def extract_first_paragraph(text):
    """Extract first meaningful paragraph as biography"""
    lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 10]
    if lines:
        # First paragraph, truncated to ~200 chars
        bio = lines[0]
        if len(bio) > 200:
            bio = bio[:200] + "..."
        return bio
    return None

def process_all_word_files():
    """Process all WORD files in data/ folder"""
    # Use current directory relative path
    data_dir = Path('./data')

    if not data_dir.exists():
        print("❌ data/ folder not found")
        return {}

    docx_files = list(data_dir.glob('*.docx')) + list(data_dir.glob('*.doc'))
    print(f"📄 Found {len(docx_files)} WORD files\n")

    extracted = {}

    for i, docx_path in enumerate(sorted(docx_files), 1):
        filename = docx_path.name
        sage_name = extract_sage_name(filename)

        print(f"[{i}/{len(docx_files)}] {filename}")

        # Extract text
        text = extract_text_from_docx(docx_path)
        if not text:
            print("      → No text found")
            continue

        # Find locations
        locations = find_locations_in_text(text)

        # Extract biography snippet
        bio = extract_first_paragraph(text)

        # Store
        extracted[sage_name] = {
            'name': sage_name,
            'locations': locations,
            'bio_snippet': bio,
            'text_length': len(text),
            'word_count': len(text.split()),
            'source_file': filename
        }

        if locations:
            print(f"      ✓ Locations: {', '.join(locations)}")
        if bio:
            print(f"      ✓ Bio: {bio[:80]}...")
        print()

    return extracted

def save_extracted_data(extracted):
    """Save extracted data to JSON for review"""
    output_file = './word_extracted_data.json'

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(extracted, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Saved extracted data to: word_extracted_data.json")

    # Summary statistics
    total_sages = len(extracted)
    with_locations = sum(1 for e in extracted.values() if e['locations'])
    with_bio = sum(1 for e in extracted.values() if e['bio_snippet'])

    print(f"📊 Summary:")
    print(f"   • Total sages: {total_sages}")
    print(f"   • With location data: {with_locations}")
    print(f"   • With biography: {with_bio}")

if __name__ == '__main__':
    print("🔄 Extracting data from WORD files...\n")
    extracted = process_all_word_files()
    save_extracted_data(extracted)
