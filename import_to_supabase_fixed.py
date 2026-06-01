#!/usr/bin/env python3
"""
Import 323 sages from data.json to Supabase
"""
import json
import requests
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Your Supabase credentials
SUPABASE_URL = "https://ulluacifirzywhmzkvkr.supabase.co"
SUPABASE_KEY = "sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C"

print("=" * 100)
print("📤 IMPORTING TO SUPABASE")
print("=" * 100)

try:
    # Load data
    with open('data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    nodes = data.get('nodes', [])
    print(f"\n✓ Loaded {len(nodes)} sages from data.json")

    # Prepare for Supabase format
    sages_to_insert = []
    era_map = {
        'second-temple': 'second-temple',
        'tannaim': 'tannaim',
        'amoraim': 'amoraim',
        'geonim': 'geonim',
        'rishonim': 'rishonim',
        'acharonim': 'acharonim',
        'modern': 'modern',
        'unknown': 'unknown'
    }

    for node in nodes:
        sage = {
            'sage_id': str(node.get('id', '')),
            'name_he': node.get('label', ''),
            'name_en': '',
            'chapter_type': '',
            'years': node.get('period', ''),
            'area': node.get('location', ''),
            'period_key': era_map.get(node.get('group', 'unknown'), 'unknown'),
            'main_field': node.get('field', ''),
            'tags': '',
            'summary': node.get('bio', ''),
            'central_idea': '',
            'related_sages': node.get('related_sages', ''),
            'spotify_link': node.get('spotify_url', ''),
            'origin_country': '',
            'migration_path': '',
            'geo_region': '',
            'custom_tradition': ''
        }
        sages_to_insert.append(sage)

    print(f"✓ Prepared {len(sages_to_insert)} records for insertion")

    # Insert via REST API
    headers = {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }

    # Batch insert (Supabase allows up to 1000 rows per request)
    batch_size = 100
    inserted = 0

    for i in range(0, len(sages_to_insert), batch_size):
        batch = sages_to_insert[i:i+batch_size]

        url = f"{SUPABASE_URL}/rest/v1/sages"
        response = requests.post(
            url,
            json=batch,
            headers=headers
        )

        if response.status_code in [200, 201]:
            inserted += len(batch)
            print(f"  ✓ Inserted batch {i//batch_size + 1} ({len(batch)} records)")
        else:
            print(f"  ⚠️  Batch {i//batch_size + 1} status: {response.status_code}")
            print(f"     Response: {response.text[:200]}")

    print(f"\n✅ Successfully inserted {inserted}/{len(sages_to_insert)} sages to Supabase")

    # Verify
    verify_url = f"{SUPABASE_URL}/rest/v1/sages?select=count"
    verify_response = requests.get(verify_url, headers=headers)
    if verify_response.status_code == 200:
        try:
            count = len(verify_response.json())
            print(f"✓ Supabase now contains: {count} sages")
        except:
            print(f"✓ Data inserted (verification skipped)")

except FileNotFoundError:
    print("❌ Error: data.json not found")
    print("   Run: python parse_excel_correct.py")
except requests.exceptions.ConnectionError:
    print("❌ Error: Cannot connect to Supabase")
    print(f"   URL: {SUPABASE_URL}")
    print("   Check your internet connection and credentials")
except json.JSONDecodeError:
    print("❌ Error: data.json is not valid JSON")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
