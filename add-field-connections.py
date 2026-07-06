#!/usr/bin/env python3
"""
Add 'colleague' connections between sages with the same field.
This ensures filtered graphs show connections even if they weren't explicitly documented.
"""

import json
from collections import defaultdict

# Load data
with open('nextjs-app/public/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

nodes = data.get('nodes', [])
links = data.get('links', [])

# Build indices
node_by_id = {n['id']: n for n in nodes}
fields_by_id = defaultdict(set)
existing_links = set()

# Map sages to their fields
for node in nodes:
    field = node.get('field', '').strip()
    if field:
        # Split by comma to handle multiple fields
        for f in field.split(','):
            f = f.strip()
            if f:
                fields_by_id[f].add(node['id'])

# Track existing connections
for link in links:
    src, tgt = str(link['source']), str(link['target'])
    existing_links.add((min(src, tgt), max(src, tgt)))

# Add colleague connections for each field
new_links = []
added_count = 0

for field, sage_ids in fields_by_id.items():
    sage_list = sorted(list(sage_ids))

    # Connect sages with same field (limit to prevent explosion)
    for i, sage_a in enumerate(sage_list[:30]):  # Limit to 30 per field
        for sage_b in sage_list[i+1:min(i+8, len(sage_list))]:  # Connect to next 8
            pair = (min(sage_a, sage_b), max(sage_a, sage_b))

            # Skip if connection already exists
            if pair in existing_links:
                continue

            new_links.append({
                'source': sage_a,
                'target': sage_b,
                'type': 'colleague',
                'field_connection': field
            })
            existing_links.add(pair)
            added_count += 1

print(f"Added {added_count} colleague connections")
print(f"Original links: {len(links)}")
print(f"New total: {len(links) + added_count}")

# Save updated data
links.extend(new_links)
with open('nextjs-app/public/data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=1)

print("✓ Updated data.json")
