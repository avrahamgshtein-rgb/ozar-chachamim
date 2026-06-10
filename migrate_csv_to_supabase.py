#!/usr/bin/env python3
"""
Migration script: CSV → Supabase
Loads 324 sages from חכמי ישראל.csv into Supabase
"""

import csv
import json
import sys
from pathlib import Path
import io

# Fix Windows encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Supabase setup
from supabase import create_client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://ulluacifirzywhmzkvkr.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Era mapping
ERA_MAPPING = {
    'עת העתיקה': 'second-temple',
    'תנאים': 'tannaim',
    'אמוראים': 'amoraim',
    'גאונים': 'geonim',
    'ראשונים': 'rishonim',
    'אחרונים': 'acharonim',
    'עת חדשה': 'modern',
    'בית שני': 'second-temple',
}

def parse_years(years_str):
    """Extract birth and death years from years string"""
    if not years_str:
        return None, None

    # Try to parse formats like "1138-1204" or "סביב 190 לפנה״ס"
    if '-' in years_str and any(c.isdigit() for c in years_str):
        parts = years_str.split('-')
        try:
            birth = int(parts[0].strip())
            death = int(parts[1].strip())
            return birth, death
        except:
            pass

    return None, None

def migrate_csv():
    """Migrate CSV data to Supabase"""

    csv_path = Path('C:/Users/User/Desktop/ozar-chachamim/data/חכמי ישראל.csv')

    if not csv_path.exists():
        print(f"❌ CSV not found: {csv_path}")
        return

    print(f"📖 Reading CSV: {csv_path}")

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"✅ Loaded {len(rows)} sages from CSV\n")

    # Prepare data for Supabase
    sages_to_insert = []

    for i, row in enumerate(rows, 1):
        sage_id = str(row.get('מזהה', i)).strip()
        name_he = row.get('שם הדמות/הנושא', '').strip()
        years_range = row.get('שנים/תקופה', '').strip()
        region = row.get('אזור/מרחב', '').strip()
        era = row.get('תקופה', '').strip()
        field = row.get('תחום עיקרי', '').strip()
        tags = row.get('תגיות', '').strip()
        summary = row.get('תקציר (2–3 שורות)', '').strip()
        core_concept = row.get('רעיון מרכזי/חידוש', '').strip()
        related = row.get('דמויות/השפעות קשורות', '').strip()
        spotify_url = row.get('קישור ספוטיפיי', '').strip()

        if not name_he:
            continue

        # Extract years
        birth_year, death_year = parse_years(years_range)

        # Map era to key
        era_key = ERA_MAPPING.get(era, 'unknown')

        # Get period order
        period_order_map = {
            'second-temple': 0,
            'tannaim': 1,
            'amoraim': 2,
            'geonim': 3,
            'rishonim': 4,
            'acharonim': 5,
            'modern': 6,
        }
        period_order = period_order_map.get(era_key, 3)

        sage = {
            'id': sage_id,
            'name_he': name_he,
            'name_en': None,
            'chapter_type': row.get('סוג פרק', '').strip(),
            'era': era,
            'era_key': era_key,
            'years_range': years_range,
            'birth_year': birth_year,
            'death_year': death_year,
            'period_order': period_order,
            'region': region if region else None,
            'primary_field': field if field else None,
            'tags': tags if tags else None,
            'summary': summary if summary else None,
            'core_concept': core_concept if core_concept else None,
            'spotify_url': spotify_url if spotify_url else None,
        }

        sages_to_insert.append(sage)

    print(f"📋 Prepared {len(sages_to_insert)} sages for insertion\n")

    # Insert into Supabase in batches
    batch_size = 50
    success_count = 0
    error_count = 0

    for i in range(0, len(sages_to_insert), batch_size):
        batch = sages_to_insert[i:i+batch_size]

        try:
            response = supabase.table('sages').upsert(batch).execute()
            success_count += len(batch)
            print(f"✅ Batch {i//batch_size + 1}: Inserted {len(batch)} sages")
        except Exception as e:
            print(f"❌ Batch {i//batch_size + 1}: Error - {str(e)[:100]}")
            error_count += len(batch)

    print(f"\n📊 Migration Summary:")
    print(f"  ✅ Successful: {success_count}")
    print(f"  ❌ Failed: {error_count}")
    print(f"  📈 Total: {success_count + error_count}")

if __name__ == '__main__':
    try:
        migrate_csv()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
