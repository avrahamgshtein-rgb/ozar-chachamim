#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix sage coordinates based on region field
"""

import requests
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://ulluacifirzywhmzkvkr.supabase.co"
SUPABASE_KEY = "sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C"

headers = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# Region to coordinates mapping
REGION_COORDS = {
    'ירושלים': {'lat': 31.768, 'lng': 35.214},
    'Jerusalem': {'lat': 31.768, 'lng': 35.214},
    'בבל': {'lat': 33.313, 'lng': 44.361},
    'Babylon': {'lat': 33.313, 'lng': 44.361},
    'מצרים': {'lat': 30.044, 'lng': 31.234},
    'Egypt': {'lat': 30.044, 'lng': 31.234},
    'אלכסנדריה': {'lat': 31.203, 'lng': 29.917},
    'Alexandria': {'lat': 31.203, 'lng': 29.917},
    'יוון': {'lat': 37.774, 'lng': 25.131},
    'Greece': {'lat': 37.774, 'lng': 25.131},
    'אתונה': {'lat': 37.974, 'lng': 23.738},
    'Athens': {'lat': 37.974, 'lng': 23.738},
    'רומא': {'lat': 41.903, 'lng': 12.496},
    'Rome': {'lat': 41.903, 'lng': 12.496},
    'ספרד': {'lat': 40.463, 'lng': -3.750},
    'Spain': {'lat': 40.463, 'lng': -3.750},
    'צרפת': {'lat': 46.227, 'lng': 2.213},
    'France': {'lat': 46.227, 'lng': 2.213},
    'גרמניה': {'lat': 51.166, 'lng': 10.451},
    'Germany': {'lat': 51.166, 'lng': 10.451},
    'אשכנז': {'lat': 51.166, 'lng': 10.451},
    'Ashkenaz': {'lat': 51.166, 'lng': 10.451},
    'פולין': {'lat': 51.919, 'lng': 19.145},
    'Poland': {'lat': 51.919, 'lng': 19.145},
    'רוסיה': {'lat': 61.524, 'lng': 105.318},
    'Russia': {'lat': 61.524, 'lng': 105.318},
    'Eretz Israel': {'lat': 31.95, 'lng': 35.2},
    'ארץ ישראל': {'lat': 31.95, 'lng': 35.2},
    'צפון': {'lat': 33.0, 'lng': 35.5},
    'North': {'lat': 33.0, 'lng': 35.5},
}

print("=" * 100)
print("🗺️ FIXING COORDINATES: Region → Precise Locations")
print("=" * 100)

# Load all sages
print("\n1️⃣ Loading sages from Supabase...")
response = requests.get(
    f'{SUPABASE_URL}/rest/v1/sages?select=id,name_he,region,era_key',
    headers=headers
)

if not response.ok:
    print(f"❌ Error: {response.status_code}")
    sys.exit(1)

sages = response.json()
print(f"✓ Loaded {len(sages)} sages")

# Update coordinates
print("\n2️⃣ Updating coordinates based on region...")

updates = 0
for sage in sages:
    region = sage.get('region', '').strip()

    if not region:
        continue

    # Find matching coordinates
    coords = None
    for region_key, region_coords in REGION_COORDS.items():
        if region.lower() == region_key.lower() or region_key.lower() in region.lower():
            coords = region_coords
            break

    if coords:
        # Update sage
        response = requests.patch(
            f'{SUPABASE_URL}/rest/v1/sages?id=eq.{sage["id"]}',
            json={'coordinates': coords},
            headers=headers
        )

        if response.status_code in [200, 204]:
            updates += 1
            if updates <= 20:  # Print first 20
                print(f"  ✓ {sage['name_he'][:35]}: {region} → [{coords['lat']}, {coords['lng']}]")

print(f"\n✅ Updated {updates} sages with correct coordinates")

print("\n" + "=" * 100)
print("🎉 COORDINATES FIXED")
print("=" * 100)
print("\n🗺️ Refresh the map to see sages at correct locations!")
