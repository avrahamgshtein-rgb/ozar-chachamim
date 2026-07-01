#!/usr/bin/env python3
import json

# Load new sages data
with open('sages.json', 'r', encoding='utf-8') as f:
    sages = json.load(f)

# Load current data.json
with open('data.json', 'r', encoding='utf-8') as f:
    current_data = json.load(f)

# Convert sages to nodes format
nodes = []
for sage in sages:
    node = {
        "id": sage.get("sage_id", ""),
        "label": sage.get("name_he", ""),
        "era": sage.get("years", ""),
        "era_key": sage.get("period_key", ""),
        "field": sage.get("main_field", ""),
        "location": sage.get("area", ""),
        "bio": sage.get("summary", ""),
        "spotify_url": sage.get("spotify_link", "")
    }
    nodes.append(node)

# Keep existing links
existing_links = current_data.get("links", [])

# Create merged data
merged_data = {
    "nodes": nodes,
    "links": existing_links
}

# Write back to data.json
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(merged_data, f, ensure_ascii=False, indent=2)

print(f"✅ Merged {len(nodes)} sages into data.json")
print(f"✅ Kept {len(existing_links)} connections")
print(f"✅ Total size: {len(json.dumps(merged_data))} bytes")
