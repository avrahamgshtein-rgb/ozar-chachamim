#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert extracted research.json into individual sage research JSON files
in the NextJS public/research/ folder.

Format: {sage_id}.json contains array of research objects for that sage.
"""
import json
import os
from pathlib import Path

def main():
    # Read the extracted research
    research_data = json.load(open('research.json', encoding='utf-8'))
    data_json = json.load(open('data.json', encoding='utf-8'))

    # Create mapping of sage IDs to their labels
    sage_by_id = {node['id']: node['label'] for node in data_json['nodes']}

    # Create output directory if it doesn't exist
    output_dir = Path('nextjs-app/public/research')
    output_dir.mkdir(parents=True, exist_ok=True)

    # Get existing research file IDs
    existing_ids = set()
    for f in output_dir.glob('*.json'):
        if f.stem.isdigit():
            existing_ids.add(f.stem)

    print(f"Existing research files: {len(existing_ids)}")

    # Group research by sage_id
    research_by_sage = {}
    for item in research_data:
        sage_id = item.get('sage_id')
        if sage_id:
            if sage_id not in research_by_sage:
                research_by_sage[sage_id] = []
            research_by_sage[sage_id].append(item)

    print(f"Research grouped by sage: {len(research_by_sage)} sages")

    # Create JSON files for sages that don't have them yet
    created = 0
    updated = 0
    skipped = 0

    for sage_id, items in sorted(research_by_sage.items()):
        filename = output_dir / f'{sage_id}.json'

        # Prepare research items for this sage
        research_items = []
        for item in items:
            # Convert to the format expected by NextJS
            research_obj = {
                'title': item.get('title', ''),
                'source_file': item.get('source_file', ''),
                'word_count': item.get('word_count', 0),
                'content': item.get('content', ''),
            }
            research_items.append(research_obj)

        # Write to file
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(research_items, f, ensure_ascii=False, indent=2)

            if filename.stem in existing_ids:
                updated += 1
            else:
                created += 1
                print(f"✅ Created: {sage_id}.json ({sage_by_id.get(sage_id, 'Unknown')})")
        except Exception as e:
            print(f"❌ Error writing {sage_id}.json: {e}")
            skipped += 1

    print(f"\n📊 Summary:")
    print(f"  Created: {created}")
    print(f"  Updated: {updated}")
    print(f"  Skipped: {skipped}")
    print(f"  Total research files: {created + updated}")

if __name__ == '__main__':
    main()
