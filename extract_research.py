#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract research content from Word files → Supabase
Matches sage names to insert research_content records
"""

import requests
import sys
import io
from pathlib import Path
from docx import Document

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://ulluacifirzywhmzkvkr.supabase.co"
SUPABASE_KEY = "sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C"

headers = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

print("=" * 100)
print("🔬 RESEARCH EXTRACTION: Word Files → Supabase")
print("=" * 100)

# ========================================================================
# STEP 1: LOAD ALL SAGES FROM SUPABASE (name mapping)
# ========================================================================
print("\n1️⃣ Loading sages from Supabase...")

response = requests.get(
    f'{SUPABASE_URL}/rest/v1/sages?select=id,name_he,name_en',
    headers=headers
)

if not response.ok:
    print(f"❌ Error loading sages: {response.status_code}")
    sys.exit(1)

sages = response.json()
print(f"✓ Loaded {len(sages)} sages")

# Create mapping: name → id
sage_map = {}
for sage in sages:
    if sage['name_he']:
        sage_map[sage['name_he'].strip()] = sage['id']
    if sage['name_en']:
        sage_map[sage['name_en'].strip()] = sage['id']

# ========================================================================
# STEP 2: FIND ALL WORD FILES
# ========================================================================
print("\n2️⃣ Finding Word files...")

word_files = list(Path("data").glob("*.docx"))
print(f"✓ Found {len(word_files)} Word files")

# ========================================================================
# STEP 3: EXTRACT & MATCH TO SAGES
# ========================================================================
print("\n3️⃣ Extracting research content...")

research_records = []

for file_path in word_files:
    filename = file_path.name
    print(f"\n  📄 {filename}")

    try:
        # Load Word document
        doc = Document(file_path)

        # Extract all text
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        content_text = '\n\n'.join(paragraphs)
        word_count = len(content_text.split())

        # Try to match filename to sage
        # Remove .docx, clean up
        name_hint = filename.replace('.docx', '').strip()

        # Search in sage_map
        sage_id = None
        for sage_name in sage_map.keys():
            if sage_name.lower() in name_hint.lower() or name_hint.lower() in sage_name.lower():
                sage_id = sage_map[sage_name]
                print(f"    ✓ Matched to: {sage_name} (ID: {sage_id})")
                break

        if not sage_id:
            print(f"    ⚠️  Could not match to sage (skipping)")
            continue

        # Prepare record
        record = {
            'sage_id': sage_id,
            'content_text': content_text,
            'content_type': 'research_paper',
            'content_summary': name_hint,
            'source_file': filename,
            'word_count': word_count
        }

        research_records.append(record)
        print(f"    ✅ {word_count} words extracted")

    except Exception as e:
        print(f"    ❌ Error: {str(e)[:100]}")

print(f"\n✓ Extracted {len(research_records)} research records ready to upload")

# ========================================================================
# STEP 4: UPLOAD TO SUPABASE
# ========================================================================
if research_records:
    print("\n4️⃣ Uploading to Supabase...")

    # Check for duplicates (sage_id already has research)
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/research_content?select=sage_id',
        headers=headers
    )

    existing_sage_ids = set()
    if response.ok:
        existing = response.json()
        existing_sage_ids = {r['sage_id'] for r in existing}

    # Filter out duplicates
    new_records = [r for r in research_records if r['sage_id'] not in existing_sage_ids]

    print(f"   • {len(research_records)} total")
    print(f"   • {len(existing_sage_ids)} already in DB")
    print(f"   • {len(new_records)} will be uploaded")

    if new_records:
        # Batch insert
        batch_size = 10
        inserted = 0

        for i in range(0, len(new_records), batch_size):
            batch = new_records[i:i+batch_size]

            response = requests.post(
                f'{SUPABASE_URL}/rest/v1/research_content',
                json=batch,
                headers=headers
            )

            if response.status_code in [200, 201]:
                inserted += len(batch)
                print(f"  ✓ Batch {i//batch_size + 1}: {len(batch)} records")
            else:
                print(f"  ⚠️  Batch {i//batch_size + 1}: {response.status_code}")
                print(f"     {response.text[:200]}")

        print(f"\n✅ Uploaded {inserted} research records")
    else:
        print("\n✓ No new records to upload (all sages already have research)")

print("\n" + "=" * 100)
print("✨ EXTRACTION COMPLETE")
print("=" * 100)
print("\n🎯 Next: Open http://localhost:8080 and click a sage to see research!")
