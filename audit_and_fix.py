#!/usr/bin/env python3
import json
import sys

print("=" * 70)
print("FIXING DATA.JSON")
print("=" * 70)

# Load
with open('data.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)

nodes = data['nodes']
links = data['links']

node_ids = {str(n['id']) for n in nodes}
print(f"\n1. Node IDs: {len(node_ids)}")
print(f"   Range: {min([int(x) for x in node_ids])} to {max([int(x) for x in node_ids])}")

# Find broken links
broken_indices = []
for i, link in enumerate(links):
    src = str(link['source'])
    tgt = str(link['target'])
    if src not in node_ids or tgt not in node_ids:
        broken_indices.append(i)
        print(f"\n   BROKEN: Link #{i}")
        print(f"           {src} -> {tgt} ({link['type']})")
        if src not in node_ids:
            print(f"           Missing source: {src}")
        if tgt not in node_ids:
            print(f"           Missing target: {tgt}")

# FIX: Remove broken links
if broken_indices:
    print(f"\n2. Removing {len(broken_indices)} broken links...")
    fixed_links = [links[i] for i in range(len(links)) if i not in broken_indices]
    data['links'] = fixed_links
    print(f"   Links before: {len(links)}")
    print(f"   Links after: {len(fixed_links)}")

# Save fixed data
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\n3. Saved fixed data.json")
print("=" * 70)
