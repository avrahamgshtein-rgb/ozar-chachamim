#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract migration paths from all 54 Word files
Uses SQL directly for reliable updates
"""

import requests
import sys
import io
import json
import csv
from pathlib import Path
from docx import Document

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://ulluacifirzywhmzkvkr.supabase.co"
SUPABASE_KEY = "sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C"

headers = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
}

LOCATION_COORDS = {
    'ירושלים': [31.768, 35.214],
    'בבל': [33.313, 44.361],
    'מצרים': [30.044, 31.234],
    'אלכסנדריה': [31.203, 29.917],
    'יוון': [37.774, 25.131],
    'אתונה': [37.974, 23.738],
    'רומא': [41.903, 12.496],
    'ספרד': [40.463, -3.750],
    'צרפת': [46.227, 2.213],
    'גרמניה': [51.166, 10.451],
    'אשכנז': [51.166, 10.451],
    'פולין': [51.919, 19.145],
    'רוסיה': [61.524, 105.318],
    'טבריה': [32.789, 35.535],
    'צפת': [32.968, 35.497],
    'עכו': [32.923, 35.087],
    'יריחו': [31.861, 35.447],
    'לוד': [31.948, 34.885],
    'חברון': [31.539, 35.199],
    'בית לחם': [31.706, 35.203],
    'Eretz Israel': [31.95, 35.2],
}

print("=" * 100)
print("🛤️ ADVANCED MIGRATION EXTRACTION: All 54 Word Files")
print("=" * 100)

# ========================================================================
# STEP 1: LOAD ALL SAGES FROM SUPABASE
# ========================================================================
print("\n1️⃣ Loading all 323 sages from Supabase...")

response = requests.get(
    f'{SUPABASE_URL}/rest/v1/sages?select=id,name_he,region',
    headers=headers
)

if not response.ok:
    print(f"❌ Error: {response.status_code}")
    sys.exit(1)

sages = response.json()
print(f"✓ Loaded {len(sages)} sages")

# ========================================================================
# STEP 2: EXTRACT MIGRATIONS FROM ALL WORD FILES
# ========================================================================
print("\n2️⃣ Processing all Word files...")

migrations = []
word_files = list(Path("data").glob("*.docx"))
print(f"Found {len(word_files)} Word files")

for file_path in word_files:
    filename = file_path.name

    try:
        doc = Document(file_path)
        text = '\n'.join([p.text for p in doc.paragraphs if p.text.strip()])

        # Extract locations
        locations_found = []
        for loc in LOCATION_COORDS.keys():
            if loc in text:
                locations_found.append(loc)

        if len(locations_found) >= 1:  # At least one location
            # Find matching sage by filename
            sage = None
            filename_clean = filename.replace('.docx', '').strip()

            # Try exact match first
            for s in sages:
                if s['name_he'] and s['name_he'].strip() in filename_clean:
                    sage = s
                    break

            # Fuzzy match: check if filename contains key sage name parts
            if not sage:
                for s in sages:
                    if s['name_he']:
                        name_parts = s['name_he'].split()
                        for part in name_parts:
                            if len(part) > 2 and part in filename_clean:
                                sage = s
                                break
                    if sage:
                        break

            if sage:
                # Create migration path
                migration_path = {
                    'from': locations_found[0],
                    'to': locations_found[-1],
                    'intermediate': locations_found[1:-1] if len(locations_found) > 2 else [],
                    'description': f"מ{locations_found[0]} ל{locations_found[-1]}"
                }

                migrations.append({
                    'sage_id': sage['id'],
                    'sage_name': sage['name_he'],
                    'filename': filename,
                    'locations': ' → '.join(locations_found[:3]),
                    'migration_path': json.dumps(migration_path, ensure_ascii=False)
                })

                print(f"  ✓ {sage['name_he']}: {' → '.join(locations_found[:3])}")

    except Exception as e:
        print(f"  ⚠️  {filename}: {str(e)[:30]}")

print(f"\n✓ Found {len(migrations)} sages with migration paths")

# ========================================================================
# STEP 3: SAVE TO CSV FOR REVIEW
# ========================================================================
if migrations:
    print("\n3️⃣ Saving to CSV for review...")

    csv_path = "migrations-to-upload.csv"
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['sage_id', 'sage_name', 'locations', 'migration_path'])
        writer.writeheader()
        for m in migrations:
            writer.writerow({
                'sage_id': m['sage_id'],
                'sage_name': m['sage_name'],
                'locations': m['locations'],
                'migration_path': m['migration_path']
            })

    print(f"✓ Saved {csv_path}")
    print(f"\nReview the CSV, then run: python upload-migrations.py")

print("\n" + "=" * 100)
print(f"✨ EXTRACTION COMPLETE: {len(migrations)} migrations ready")
print("=" * 100)
