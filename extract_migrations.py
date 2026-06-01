#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract migration paths from Word files and update Supabase
Shows sage movements: birthplace → study locations → teaching locations
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

# Location mapping to coordinates
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
    'פולין': [51.919, 19.145],
    'רוסיה': [61.524, 105.318],
    'טבריה': [32.789, 35.535],
    'צפת': [32.968, 35.497],
    'עכו': [32.923, 35.087],
    'יריחו': [31.861, 35.447],
    'מצא': [32.0, 35.3],
    'לוד': [31.948, 34.885],
    'חברון': [31.539, 35.199],
    'בית לחם': [31.706, 35.203],
}

print("=" * 100)
print("🛤️ MIGRATION EXTRACTION: Word Files → Geographic Paths")
print("=" * 100)

# ========================================================================
# STEP 1: LOAD ALL SAGES FROM SUPABASE
# ========================================================================
print("\n1️⃣ Loading sages from Supabase...")

response = requests.get(
    f'{SUPABASE_URL}/rest/v1/sages?select=id,name_he,region,coordinates',
    headers=headers
)

if not response.ok:
    print(f"❌ Error loading sages: {response.status_code}")
    sys.exit(1)

sages = response.json()
sage_map = {sage['name_he'].strip(): sage for sage in sages if sage['name_he']}
print(f"✓ Loaded {len(sages)} sages")

# ========================================================================
# STEP 2: EXTRACT MIGRATION INFO FROM WORD FILES
# ========================================================================
print("\n2️⃣ Extracting migration paths from Word files...")

migrations = []

word_files = list(Path("data").glob("*.docx"))

for file_path in word_files:
    filename = file_path.name

    try:
        doc = Document(file_path)
        text = '\n'.join([p.text for p in doc.paragraphs if p.text.strip()])

        # Find sage name
        name_hint = filename.replace('.docx', '').strip()
        sage = None
        for sage_name, sage_obj in sage_map.items():
            if sage_name.lower() in name_hint.lower() or name_hint.lower() in sage_name.lower():
                sage = sage_obj
                break

        if not sage:
            continue

        # Extract migration keywords
        locations_found = []
        for loc in LOCATION_COORDS.keys():
            if loc in text:
                locations_found.append(loc)

        if len(locations_found) >= 2:
            # Create migration path
            migration_path = {
                'from': locations_found[0],
                'to': locations_found[-1],  # Last mentioned location
                'intermediate': locations_found[1:-1] if len(locations_found) > 2 else [],
                'description': f"מ{locations_found[0]} ל{locations_found[-1]}"
            }

            print(f"\n  📄 {sage['name_he']}")
            print(f"     Path: {' → '.join(locations_found[:3])}")

            migrations.append({
                'sage_id': sage['id'],
                'migration_path': migration_path
            })

    except Exception as e:
        pass

print(f"\n✓ Found {len(migrations)} sages with migration paths")

# ========================================================================
# STEP 3: UPDATE SAGES WITH MIGRATION DATA
# ========================================================================
if migrations:
    print("\n3️⃣ Updating Supabase with migration paths...")

    for migration in migrations:
        try:
            response = requests.patch(
                f'{SUPABASE_URL}/rest/v1/sages?id=eq.{migration["sage_id"]}',
                json={'migration_path': migration['migration_path']},
                headers=headers
            )

            if response.status_code in [200, 204]:
                print(f"  ✓ {migration['sage_id']}: {migration['migration_path']['description']}")
            else:
                print(f"  ⚠️  {migration['sage_id']}: {response.status_code}")

        except Exception as e:
            print(f"  ❌ Error: {str(e)[:50]}")

print("\n" + "=" * 100)
print("✨ MIGRATION EXTRACTION COMPLETE")
print("=" * 100)
print("\n🎯 Next: Open map view and see migration paths!")
