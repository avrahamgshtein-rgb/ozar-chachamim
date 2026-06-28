#!/usr/bin/env python3
import json
import csv
import sys
import os

# Fix output encoding
os.environ['PYTHONIOENCODING'] = 'utf-8'

print("=" * 70)
print("EXTRACTING SPOTIFY URLs FROM CSV")
print("=" * 70)

# 1. Load CSV and extract spotify links
spotify_map = {}
with open('data/חכמי ישראל.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        name = row.get('שם הדמות/הנושא', '').strip()
        spotify_url = row.get('קישור ספוטיפיי', '').strip()

        if name and spotify_url:
            spotify_map[name] = spotify_url
            if i < 5:  # Show first 5
                print("[OK] {}: {}...".format(name[:30], spotify_url[:50]))

print("\nTotal entries with Spotify: {}".format(len(spotify_map)))

# 2. Load data.json
with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

nodes = data['nodes']
print("Matching against {} nodes...".format(len(nodes)))

# 3. Match by name and add spotify_url
matched = 0
not_matched = []
for node in nodes:
    node_label = node.get('label', '').strip()

    # Try exact match first
    if node_label in spotify_map:
        node['spotify_url'] = spotify_map[node_label]
        matched += 1
    else:
        # Try partial match (in case of name variations)
        for csv_name, url in spotify_map.items():
            if csv_name in node_label or node_label in csv_name:
                node['spotify_url'] = url
                matched += 1
                print("  [PARTIAL] {} <- {}".format(node_label[:40], csv_name[:40]))
                break
        else:
            not_matched.append(node_label)

print("\n[RESULT] Matched: {}/{}".format(matched, len(nodes)))
print("[RESULT] Not matched: {}".format(len(not_matched)))

# 4. Save updated data.json
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("[OK] Updated data.json with Spotify URLs")
print("=" * 70)
