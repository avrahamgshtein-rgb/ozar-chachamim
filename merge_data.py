#!/usr/bin/env python3
"""
Merge enriched data from CSV and Word files into data.json
"""

import json
import csv
import os
from pathlib import Path
from difflib import SequenceMatcher

# Paths - use Linux mounted paths
import sys
OZAR_PATH = Path("/sessions/eloquent-funny-meitner/mnt/ozar-chachamim")
DATA_PATH = OZAR_PATH / "data"
CSV_FILE = DATA_PATH / "חכמי ישראל.csv"
DATA_JSON = OZAR_PATH / "data.json"
OUTPUT_JSON = OZAR_PATH / "data_enriched.json"

def similar(a, b):
    """Calculate similarity between two strings"""
    return SequenceMatcher(None, a, b).ratio()

def load_csv_data():
    """Load data from CSV"""
    csv_data = {}
    try:
        with open(CSV_FILE, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name_he = row.get('שם הדמות/הנושא', '').strip()
                if name_he:
                    csv_data[name_he] = {
                        'dates': row.get('שנים/תקופה', '').strip(),
                        'region': row.get('אזור/מרחב', '').strip(),
                        'era': row.get('תקופה', '').strip(),
                        'main_field': row.get('תחום עיקרי', '').strip(),
                        'tags': row.get('תגיות', '').strip(),
                        'summary': row.get('תקציר (2–3 שורות)', '').strip(),
                        'core_concept': row.get('רעיון מרכזי/חידוש', '').strip(),
                        'related_figures': row.get('דמויות/השפעות קשורות', '').strip(),
                        'spotify_url': row.get('קישור ספוטיפיי', '').strip(),
                    }
        print(f"✓ Loaded {len(csv_data)} records from CSV")
        return csv_data
    except Exception as e:
        print(f"❌ Error loading CSV: {e}")
        return {}

def find_best_match(sage_name, csv_data):
    """Find best matching sage in CSV by name similarity"""
    if not csv_name:
        return None

    best_match = None
    best_score = 0.6  # Minimum similarity threshold

    for csv_name in csv_data.keys():
        score = similar(sage_name.lower(), csv_name.lower())
        if score > best_score:
            best_score = score
            best_match = csv_name

    return best_match

def load_data_json():
    """Load existing data.json"""
    try:
        with open(DATA_JSON, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ Error loading data.json: {e}")
        return {'nodes': [], 'links': []}

def enrich_sage_data(sage, csv_data, csv_lookup):
    """Enrich a single sage with CSV data"""
    # Try exact match first
    sage_name = sage.get('name_he', '')

    if sage_name in csv_data:
        csv_record = csv_data[sage_name]
    else:
        # Try fuzzy match
        best_match = find_best_match(sage_name, csv_data)
        if best_match:
            csv_record = csv_data[best_match]
            print(f"  Matched: {sage_name} → {best_match}")
        else:
            csv_record = None

    if csv_record:
        # Add enriched data
        sage['dates'] = csv_record.get('dates') or sage.get('dates', '')
        sage['birth_death'] = csv_record.get('dates', '')
        sage['region'] = csv_record.get('region') or sage.get('region', '')
        sage['summary'] = csv_record.get('summary') or sage.get('summary', '')
        sage['core_concept'] = csv_record.get('core_concept') or sage.get('core_concept', '')
        sage['related_figures'] = csv_record.get('related_figures', '')
        sage['tags'] = csv_record.get('tags', '')

        # Keep spotify URL if it exists
        if csv_record.get('spotify_url'):
            sage['spotify_url'] = csv_record['spotify_url']

    return sage

def merge_data():
    """Main merge function"""
    print("\n=== Merging Enriched Data ===\n")

    # Load sources
    print("Loading data sources...")
    csv_data = load_csv_data()
    data = load_data_json()

    # Create lookup for CSV data
    csv_lookup = {name.lower(): name for name in csv_data.keys()}

    # Enrich nodes
    print(f"\nEnriching {len(data.get('nodes', []))} sages...")
    enriched_count = 0

    for i, sage in enumerate(data.get('nodes', [])):
        enriched = enrich_sage_data(sage, csv_data, csv_lookup)
        if enriched.get('dates') or enriched.get('summary') or enriched.get('core_concept'):
            enriched_count += 1

    print(f"✓ Enriched {enriched_count} sages with CSV data")

    # Save enriched data
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Saved enriched data to: {OUTPUT_JSON}")
    print(f"\nSample enriched sage:")
    for sage in data.get('nodes', [])[:3]:
        if sage.get('birth_death') or sage.get('summary'):
            print(f"  {sage.get('name_he', '')} ({sage.get('birth_death', 'N/A')})")
            print(f"    Region: {sage.get('region', 'N/A')}")
            print(f"    Summary: {sage.get('summary', 'N/A')[:100]}...")
           