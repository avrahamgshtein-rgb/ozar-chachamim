#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import csv

# Load CSV with proper Hebrew encoding
print("Loading CSV...")
spotify_map = {}
with open('data/חכמי ישראל.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row.get('שם הדמות/הנושא', '').strip()
        url = row.get('קישור ספוטיפיי', '').strip()
        if name and url:
            spotify_map[name] = url

print("CSV Spotify entries: {}".format(len(spotify_map)))

# Load data.json - handle corrupted encoding
print("Loading JSON...")
with open('data.json', 'rb') as f:
    raw_bytes = f.read()

# Try UTF-8 first
try:
    text = raw_bytes.decode('utf-8-sig')
except:
    # If UTF-8 fails, try Latin-1 and re-encode
    try:
        text = raw_bytes.decode('iso-8859-1')
    except:
        text = raw_bytes.decode('utf-8', errors='ignore')

data = json.loads(text)
nodes = data['nodes']

print("JSON nodes: {}".format(len(nodes)))
print()

# Match Spotify URLs
matched = 0
for node in nodes:
    label = node.get('label', '').strip()
    if label in spotify_map:
        node['spotify_url'] = spotify_map[label]
        matched += 1

print("Matched: {} / {}".format(matched, len(nodes)))

# Save with proper UTF-8 encoding
print("Saving...")
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done!")
