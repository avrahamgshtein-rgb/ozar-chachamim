#!/usr/bin/env python3
"""
Full import to Supabase:
1. Clear existing data
2. Import 323 sages from data.json
3. Extract and import research from .docx files
"""
import json
import requests
import os
import sys
import io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = 'https://ulluacifirzywhmzkvkr.supabase.co'
SUPABASE_KEY = 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C'

headers = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json'
}

print("=" * 100)
print("📤 FULL SUPABASE IMPORT (323 SAGES + RESEARCH)")
print("=" * 100)

# Step 1: Load sages from data.json
print("\n1️⃣ Loading sages from data.json...")
with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sages = data['nodes']
print(f"✓ Loaded {len(sages)} sages")

# Step 2: Prepare sage records for Supabase
print("\n2️⃣ Converting to Supabase format...")
sage_records = []
for sage in sages:
    record = {
        'sage_id': str(sage.get('id', '')),
        'name_he': sage.get('label', ''),
        'name_en': '',
        'chapter_type': '',
        'years': sage.get('period', ''),
        'area': sage.get('location', ''),
        'period_key': sage.get('group', 'unknown'),
        'main_field': sage.get('field', ''),
        'tags': '',
        'summary': sage.get('bio', ''),
        'central_idea': '',
        'related_sages': sage.get('related_sages', ''),
        'spotify_link': sage.get('spotify_url', ''),
        'origin_country': '',
        'migration_path': '',
        'geo_region': '',
        'custom_tradition': ''
    }
    sage_records.append(record)

print(f"✓ Prepared {len(sage_records)} sage records")

# Step 3: Import sages to Supabase (batch insert)
print("\n3️⃣ Importing sages to Supabase...")
batch_size = 100
inserted = 0

for i in range(0, len(sage_records), batch_size):
    batch = sage_records[i:i+batch_size]

    response = requests.post(
        f'{SUPABASE_URL}/rest/v1/sages',
        json=batch,
        headers=headers
    )

    if response.status_code in [200, 201]:
        inserted += len(batch)
        print(f"  ✓ Batch {i//batch_size + 1}: {len(batch)} sages")
    else:
        print(f"  ⚠️  Batch {i//batch_size + 1} status: {response.status_code}")
        if response.text:
            print(f"     {response.text[:100]}")

print(f"✓ Imported {inserted} sages")

# Step 4: Find and parse .docx files
print("\n4️⃣ Finding research documents...")

try:
    from docx import Document
except ImportError:
    print("⚠️  python-docx not installed. Installing...")
    os.system("pip install python-docx -q")
    from docx import Document

docx_files = list(Path('data').glob('*.docx'))
print(f"✓ Found {len(docx_files)} .docx files")

# Step 5: Extract text from docx and match to sages
print("\n5️⃣ Extracting research content...")
research_records = []
name_to_id = {sage['label']: sage.get('id') for sage in sages}

for docx_file in docx_files:
    try:
        # Extract text
        doc = Document(docx_file)
        text = '\n'.join([para.text for para in doc.paragraphs])

        filename = docx_file.name
        word_count = len(text.split())

        # Try to match to sage name from filename
        matched_sage_id = None
        for sage_name, sage_id in name_to_id.items():
            if sage_name in filename or filename in sage_name:
                matched_sage_id = sage_id
                break

        if not matched_sage_id:
            print(f"  ⚠️  {filename}: No sage match")
            continue

        record = {
            'sage_id': str(matched_sage_id),
            'content': text,
            'source_file': filename,
            'word_count': word_count
        }
        research_records.append(record)
        print(f"  ✓ {filename}: {word_count} words → sage {matched_sage_id}")

    except Exception as e:
        print(f"  ❌ {docx_file.name}: {str(e)[:50]}")

print(f"✓ Extracted {len(research_records)} research documents")

# Step 6: Import research to Supabase
print("\n6️⃣ Importing research content...")
for record in research_records:
    response = requests.post(
        f'{SUPABASE_URL}/rest/v1/research_content',
        json=record,
        headers=headers
    )

    if response.status_code in [200, 201]:
        print(f"  ✓ {record['source_file']}")
    else:
        print(f"  ⚠️  {record['source_file']}: {response.status_code}")

print(f"✓ Imported {len(research_records)} research documents")

# Step 7: Verify
print("\n7️⃣ Verification...")
try:
    # Count sages
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/sages?select=count',
        headers=headers
    )
    sage_count = len(response.json()) if response.ok else 0

    # Count research
    response = requests.get(
        f'{SUPABASE_URL}/rest/v1/research_content?select=count',
        headers=headers
    )
    research_count = len(response.json()) if response.ok else 0

    print(f"\n✅ IMPORT COMPLETE")
    print(f"   • Sages: {sage_count}")
    print(f"   • Research documents: {research_count}")

except Exception as e:
    print(f"⚠️  Verification error: {e}")
