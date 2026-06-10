#!/usr/bin/env python3
"""
Enrich data.json with CSV data and Word document information
"""

import json
import csv
from pathlib import Path
from difflib import SequenceMatcher

OZAR_PATH = Path("/sessions/eloquent-funny-meitner/mnt/ozar-chachamim")
DATA_PATH = OZAR_PATH / "data"
CSV_FILE = DATA_PATH / "חכמי ישראל.csv"
DATA_JSON = OZAR_PATH / "data.json"
OUTPUT_JSON = OZAR_PATH / "data_enriched.json"

def similar(a, b):
    """Calculate string similarity"""
    return SequenceMatcher(None, a, b).ratio()

def load_csv_data():
    """Load enrichment data from CSV"""
    csv_data = {}
    with open(CSV_FILE, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('שם הדמות/הנושא', '').strip()
            if name:
                csv_data[name] = {
                    'dates': row.get('שנים/תקופה', '').strip(),
                    'region': row.get('אזור/מרחב', '').strip(),
                    'csv_summary': row.get('תקציר (2–3 שורות)', '').strip(),
                    'core_concept': row.get('רעיון מרכזי/חידוש', '').strip(),
                    'related_figures_csv': row.get('דמויות/השפעות קשורות', '').strip(),
                    'tags': row.get('תגיות', '').strip(),
                    'spotify_url_csv': row.get('קישור ספוטיפיי', '').strip(),
                }
    return csv_data

def find_match(sage_label, csv_names):
    """Find best match in CSV names"""
    if not sage_label:
        return None

    # Try exact match first
    if sage_label in csv_names:
        return sage_label

    # Try substring match
    label_lower = sage_label.lower()
    for csv_name in csv_names:
        if label_lower in csv_name.lower() or csv_name.lower() in label_lower:
            return csv_name

    # Try fuzzy match
    best_match = None
    best_score = 0.65
    for csv_name in csv_names:
        score = similar(label_lower, csv_name.lower())
        if score > best_score:
            best_score = score
            best_match = csv_name

    return best_match

def main():
    print("\n=== Enriching Sage Data ===\n")

    # Load sources
    print("Loading CSV data...")
    csv_data = load_csv_data()
    csv_names = set(csv_data.keys())
    print(f"✓ Loaded {len(csv_data)} CSV records")

    print("Loading data.json...")
    with open(DATA_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    nodes = data.get('nodes', [])
    print(f"✓ Loaded {len(nodes)} sages")

    # Enrich nodes
    print("\nEnriching sages with CSV data...")
    enriched_count = 0
    matched_count = 0

    for sage in nodes:
        sage_label = sage.get('label', '').strip()

        # Find matching CSV record
        match_name = find_match(sage_label, csv_names)

        if match_name:
            matched_count += 1
            csv_record = csv_data[match_name]

            # Add dates (birth-death)
            if csv_record.get('dates') and not sage.get('dates'):
                sage['dates'] = csv_record['dates']
                enriched_count += 1

            # Enhance region/location
            if csv_record.get('region'):
                if not sage.get('location') or sage.get('location') == 'Unknown':
                    sage['location'] = csv_record['region']
                # Keep both if different
                if csv_record['region'] != sage.get('location'):
                    sage['region'] = csv_record['region']

            # Add summary if missing
            if csv_record.get('csv_summary') and not sage.get('summary'):
                sage['summary'] = csv_record['csv_summary']

            # Add core concept
            if csv_record.get('core_concept') and not sage.get('core_concept'):
                sage['core_concept'] = csv_record['core_concept']

            # Merge related figures
            if csv_record.get('related_figures_csv'):
                existing = sage.get('related_sages', '').strip()
                csv_related = csv_record['related_figures_csv']
                if existing and csv_related:
                    sage['related_sages'] = f"{existing}; {csv_related}"
                elif csv_related:
                    sage['related_sages'] = csv_related

            # Add Spotify if CSV has it
            if csv_record.get('spotify_url_csv') and not sage.get('spotify_url'):
                sage['spotify_url'] = csv_record['spotify_url_csv']
            elif csv_record.get('spotify_url_csv') and sage.get('spotify_url'):
                # Keep the one that exists
                if not sage['spotify_url']:
                    sage['spotify_url'] = csv_record['spotify_url_csv']

            # Add tags
            if csv_record.get('tags'):
                sage['tags'] = csv_record['tags']

    print(f"✓ Matched {matched_count} sages with CSV data")
    print(f"✓ Enriched {enriched_count} sages with new information")

    # Save enriched data
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Saved enriched data to: data_enriched.json")

    # Show sample
    print("\nSample enriched sage:")
    for sage in nodes[:10]:
        if sage.get('dates') or sage.get('summary'):
            print(f"\n  {sage.get('label', 'N/A')}")
            print(f"    Dates: {sage.get('dates', 'N/A')}")
            print(f"    Region: {sage.get('region', sage.get('location', 'N/A'))}")
            if sage.get('summary'):
                summary = sage['summary'][:80]
                print(f"    Bio: {summary}...")
            break

if __name__ == '__main__':
    main()
