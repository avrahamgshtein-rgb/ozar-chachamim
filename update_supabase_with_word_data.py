#!/usr/bin/env python3
import json, sys, io
from pathlib import Path
from supabase import create_client
import os

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = 'https://ulluacifirzywhmzkvkr.supabase.co'
SUPABASE_KEY = 'sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C'
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load extracted Word data
with open('word_extracted_data.json', 'r', encoding='utf-8') as f:
    word_data = json.load(f)

print(f"Loaded {len(word_data)} Word documents\n")

# Get all sages from Supabase
response = supabase.table('sages').select('id,name_he,name_en').execute()
sages = response.data
sage_map = {s['name_he'].lower(): s for s in sages}
print(f"Found {len(sages)} sages in Supabase\n")

# Match and update
matched = 0
unmatched = 0
updates = []

for doc in word_data:
    title = doc['title']
    
    # Extract name from title (try various patterns)
    name = title.split(':')[0].split('-')[0].strip()
    name_clean = name.lower()
    
    # Try to find sage
    sage = None
    
    # Direct match
    if name_clean in sage_map:
        sage = sage_map[name_clean]
    else:
        # Fuzzy match
        for sage_name, sage_data in sage_map.items():
            if any(word in name_clean for word in sage_name.split()):
                sage = sage_data
                break
    
    if sage:
        matched += 1
        update = {
            'id': sage['id'],
        }
        if doc.get('birth_year'):
            update['birth_year'] = doc['birth_year']
        if doc.get('death_year'):
            update['death_year'] = doc['death_year']
        if doc.get('biography'):
            update['summary'] = doc['biography'][:500]
        if doc.get('major_works'):
            update['other_sources'] = json.dumps({'works': doc['major_works']})
        
        updates.append(update)
        print(f"Matched: {title[:50]}")
    else:
        unmatched += 1
        print(f"Unmatched: {title[:50]}")

print(f"\nMatched: {matched}")
print(f"Unmatched: {unmatched}")

# Update Supabase
if updates:
    print(f"\nUpdating {len(updates)} sages...")
    
    for i in range(0, len(updates), 50):
        batch = updates[i:i+50]
        try:
            supabase.table('sages').upsert(batch).execute()
            print(f"  Updated batch {i//50 + 1}")
        except Exception as e:
            print(f"  Error: {e}")

print("\nDone!")
