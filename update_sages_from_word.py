#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Update Supabase sages with extracted data from WORD files
Matches extracted names with existing sage IDs and updates biography + locations
"""

import json
import sys
from pathlib import Path
from difflib import SequenceMatcher

# Fix encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def load_extracted_data():
    """Load extracted WORD data"""
    with open('./word_extracted_data.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def load_sage_data():
    """Load current sage data from Supabase via Python API"""
    try:
        from config import SUPABASE_CONFIG
        from supabase import create_client

        supabase = create_client(SUPABASE_CONFIG['url'], SUPABASE_CONFIG['anonKey'])
        response = supabase.table('sages').select('*').execute()
        return {str(s['id']): s for s in response.data}
    except Exception as e:
        print(f"Error loading from Supabase: {e}")
        print("Using fallback: load data.json")

        # Fallback to local data.json
        try:
            with open('./data.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
                return {str(n['id']): n for n in data.get('nodes', [])}
        except:
            return {}

def string_similarity(a, b):
    """Calculate string similarity (0-1)"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def find_best_match(extracted_name, sages):
    """Find best matching sage for extracted name"""
    best_match = None
    best_score = 0.3  # Min threshold

    extracted_words = extracted_name.lower().split()

    for sage_id, sage in sages.items():
        sage_name = sage.get('name_he', '') or sage.get('label', '')

        # Try exact match first
        if extracted_name.lower() == sage_name.lower():
            return sage_id, 1.0

        # Try partial match - check if key words match
        sage_words = sage_name.lower().split()
        word_matches = sum(1 for w in extracted_words if any(w in sw or sw in w for sw in sage_words))

        if word_matches > 0:
            # Calculate similarity
            similarity = string_similarity(extracted_name, sage_name)

            if similarity > best_score:
                best_score = similarity
                best_match = (sage_id, similarity)

    return best_match if best_match else (None, 0)

def prepare_update_data(extracted, sages):
    """Prepare data for Supabase update"""
    updates = []
    matched = 0
    unmatched = []

    for extracted_name, extracted_data in extracted.items():
        if not extracted_name.strip():
            continue

        sage_id, score = find_best_match(extracted_name, sages)

        if sage_id and score >= 0.5:  # Threshold: 50% match
            matched += 1

            sage = sages[sage_id]
            update = {
                'id': sage_id,
                'name_he': extracted_name,
                'summary': extracted_data.get('bio_snippet'),
                # Store locations as JSON string for now (will be parsed in frontend)
                'locations_from_word': extracted_data.get('locations', []),
                'word_source': extracted_data.get('source_file')
            }
            updates.append(update)

            print(f"MATCH ({score:.0%}): {extracted_name[:50]}")
            print(f"       -> ID {sage_id}: {sage.get('name_he', 'Unknown')[:50]}")

        else:
            unmatched.append((extracted_name, score))
            if score > 0.3:  # Show near-misses
                print(f"NEAR ({score:.0%}): {extracted_name[:50]}")

    return updates, matched, unmatched

def main():
    print("Loading data...\n")
    extracted = load_extracted_data()
    sages = load_sage_data()

    print(f"Extracted: {len(extracted)} sages")
    print(f"Database: {len(sages)} sages\n")

    # Find matches
    updates, matched, unmatched = prepare_update_data(extracted, sages)

    # Summary
    print(f"\n--- SUMMARY ---")
    print(f"Matched: {matched}/{len(extracted)}")
    print(f"Unmatched: {len(unmatched)}")
    print(f"\nUpdate data prepared. Next steps:")
    print(f"1. Review matches above")
    print(f"2. Run update_supabase_from_word.py to apply changes")

if __name__ == '__main__':
    main()
