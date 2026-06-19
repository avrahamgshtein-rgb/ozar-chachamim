#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Import 660+ sages from CSV (חכמי ישראל.csv) into data.json
Maps CSV columns to data.json node structure
"""

import csv
import json
import os
import sys
import io
from pathlib import Path

# Handle UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# CSV file path
CSV_PATH = Path("data/חכמי ישראל.csv")
DATA_JSON_PATH = Path("data.json")

# Period mapping: Hebrew to English group keys
PERIOD_MAP = {
    "עת העתיקה": "second-temple",
    "בית שני": "second-temple",
    "ימי בית שני": "second-temple",
    "תנאים": "tannaim",
    "אמוראים": "amoraim",
    "גאונים": "geonim",
    "ראשונים": "rishonim",
    "ראשית ימי הביניים": "rishonim",
    "ימי הביניים": "rishonim",
    "ימי הביניים המוקדמים": "rishonim",
    "ימי הביניים המאוחרים": "rishonim",
    "שלהי ימי הביניים": "rishonim",
    "תור הזהב": "rishonim",
    "תור הזהב בספרד": "rishonim",
    "ראשית הראשונים": "rishonim",
    "ראשוני אשכנז": "rishonim",
    "עת העתיקה": "second-temple",
    "תקופת הגאונים": "geonim",
    "תקופת הגאונים המאוחרת": "geonim",
    "תקופת המעבר תנאים–אמוראים": "amoraim",
    "אחרונים": "acharonim",
    "אחרונים/מודרני": "acharonim",
    "מודרני": "modern",
    "עת חדשה": "modern",
}

def get_era(period_str):
    """Map Hebrew period to English era group"""
    if not period_str:
        return "unknown"

    for hebrew_period, english_period in PERIOD_MAP.items():
        if hebrew_period in period_str:
            return english_period

    # Default mapping for unknown periods
    return "rishonim"

def create_node_from_csv_row(row_id, row):
    """Convert CSV row to data.json node structure"""

    name = row.get("שם הדמות/הנושא", "").strip()
    if not name:
        return None

    period_str = row.get("תקופה", "").strip()

    node = {
        "id": str(row_id),
        "label": name,
        "era": get_era(period_str),
        "group": get_era(period_str),
        "period": period_str,
        "location": row.get("אזור/מרחב", "").strip(),
        "field": row.get("תחום עיקרי", "").strip(),
        "bio": row.get("תקציר (2–3 שורות)", "").strip(),
        "dates": row.get("שנים/תקופה", "").strip(),
        "tags": row.get("תגיות", "").strip(),
        "summary": row.get("תקציר (2–3 שורות)", "").strip(),
        "core_concept": row.get("רעיון מרכזי/חידוש", "").strip(),
        "related_sages": row.get("דמויות/השפעות קשורות", "").strip(),
        "spotify_url": row.get("קישור ספוטיפיי", "").strip(),
    }

    return node

def load_existing_data():
    """Load existing data.json or return empty structure"""
    if DATA_JSON_PATH.exists():
        with open(DATA_JSON_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"nodes": [], "links": []}

def save_data(data):
    """Save data to data.json"""
    with open(DATA_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[+] Saved {len(data['nodes'])} sages to data.json")

def import_csv():
    """Main import function"""

    print("[*] Starting sage import from CSV...")
    print(f"[*] CSV path: {CSV_PATH}")

    # Load existing data
    data = load_existing_data()
    existing_labels = {node['label'] for node in data['nodes']}
    print(f"[*] Existing nodes: {len(data['nodes'])}")

    # Read CSV
    new_nodes = []
    duplicates = 0
    skipped = 0

    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is 1)
            try:
                node = create_node_from_csv_row(row_num, row)

                if not node:
                    skipped += 1
                    continue

                # Check for duplicates
                if node['label'] in existing_labels:
                    duplicates += 1
                    continue

                new_nodes.append(node)
                existing_labels.add(node['label'])

            except Exception as e:
                print(f"[!] Error processing row {row_num}: {e}")
                skipped += 1

    # Add new nodes to data
    # Assign new IDs starting from max existing ID
    max_id = max([int(n['id']) for n in data['nodes']], default=0)

    for i, node in enumerate(new_nodes):
        node['id'] = str(max_id + i + 1)
        data['nodes'].append(node)

    # Save
    save_data(data)

    # Print summary
    print(f"\n{'='*50}")
    print(f"[*] Import Summary")
    print(f"{'='*50}")
    print(f"[+] New sages added: {len(new_nodes)}")
    print(f"[~] Duplicates skipped: {duplicates}")
    print(f"[-] Errors/skipped: {skipped}")
    print(f"[*] Total sages now: {len(data['nodes'])}")
    print(f"{'='*50}\n")

    # Show period breakdown
    period_counts = {}
    for node in data['nodes']:
        group = node.get('group', 'unknown')
        period_counts[group] = period_counts.get(group, 0) + 1

    print("[*] Sages by period:")
    for period, count in sorted(period_counts.items()):
        print(f"   {period}: {count}")

if __name__ == "__main__":
    import_csv()
