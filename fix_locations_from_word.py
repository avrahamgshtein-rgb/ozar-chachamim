#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fix sage locations using extracted WORD data
Update Supabase with correct locations
"""

import json
from difflib import SequenceMatcher

def load_extracted_data():
    with open('word_extracted_data.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_supabase_data():
    """Load sages from Supabase"""
    try:
        from config import SUPABASE_CONFIG
        from supabase import create_client

        supabase = create_client(SUPABASE_CONFIG['url'], SUPABASE_CONFIG['anonKey'])
        response = supabase.table('sages').select('id, name_he, region').execute()
        return {str(s['id']): s for s in response.data}
    except Exception as e:
        print(f"⚠️  Cannot load from Supabase: {e}")
        print("   Using fallback: local data.json")
        return {}

def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def find_sage(extracted_name, sages):
    """Find best matching sage"""
    best_match = None
    best_score = 0.5

    for sage_id, sage in sages.items():
        sage_name = sage.get('name_he', '')
        score = similarity(extracted_name, sage_name)

        if score > best_score:
            best_score = score
            best_match = (sage_id, sage_name, score)

    return best_match

def main():
    print("📍 Loading location data from WORD files...\n")

    extracted = load_extracted_data()
    sages = load_supabase_data()

    print(f"Extracted: {len(extracted)} sages")
    print(f"In database: {len(sages)} sages\n")

    corrections = []

    for extracted_name, info in extracted.items():
        locations = info.get('locations', [])
        locations = [loc for loc in locations if loc != 'עיר']  # Remove generic 'עיר'

        if not locations:
            continue

        match = find_sage(extracted_name, sages)
        if not match or match[2] < 0.6:
            continue

        sage_id, sage_name, score = match
        old_region = sages[sage_id].get('region', 'Unknown')
        new_region = ' → '.join(locations[:3])  # Show first 3 locations

        corrections.append({
            'id': sage_id,
            'name': sage_name,
            'old_region': old_region,
            'new_locations': locations,
            'score': score
        })

        print(f"✅ {sage_name}")
        print(f"   OLD: {old_region}")
        print(f"   NEW: {new_region}")
        print(f"   Score: {score:.0%}\n")

    print(f"\n📊 Found {len(corrections)} corrections ready to apply")
    print("\nNext: Update these in Supabase or local data")

if __name__ == '__main__':
    main()
