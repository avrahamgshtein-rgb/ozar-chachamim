#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Remove duplicate sages from data.json
Keeps the first occurrence, removes subsequent duplicates
"""

import json
import sys
import io
from pathlib import Path
from collections import OrderedDict

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA_JSON = Path("data.json")

def remove_duplicates():
    """Remove duplicate sage entries by name"""

    # Load data
    with open(DATA_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    nodes = data.get('nodes', [])
    print(f"[*] Processing {len(nodes)} sages...")

    # Track seen names and removed items
    seen_names = {}
    unique_nodes = []
    removed_duplicates = []

    for node in nodes:
        name = node['label']

        if name not in seen_names:
            # First occurrence - keep it
            seen_names[name] = node['id']
            unique_nodes.append(node)
        else:
            # Duplicate - record and skip
            removed_duplicates.append({
                'name': name,
                'duplicate_id': node['id'],
                'original_id': seen_names[name]
            })

    # Update data
    data['nodes'] = unique_nodes

    # Save
    with open(DATA_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Print results
    print(f"\n[*] Removed {len(removed_duplicates)} duplicate entries")
    print(f"[+] Remaining unique sages: {len(unique_nodes)}")

    if removed_duplicates:
        print(f"\n[*] Duplicates removed (kept first, removed duplicates):")
        print(f"{'='*70}")

        # Group by name to show all occurrences
        dup_groups = {}
        for dup in removed_duplicates:
            name = dup['name']
            if name not in dup_groups:
                dup_groups[name] = []
            dup_groups[name].append(dup['duplicate_id'])

        for name, dup_ids in sorted(dup_groups.items()):
            original_id = next(d['original_id'] for d in removed_duplicates if d['name'] == name)
            print(f"  {name}")
            print(f"    Kept ID: {original_id}")
            print(f"    Removed IDs: {', '.join(dup_ids)}")

        print(f"{'='*70}\n")

    print(f"[✓] Deduplication complete!")
    print(f"[*] Summary:")
    print(f"    Before: {len(nodes)} sages")
    print(f"    After: {len(unique_nodes)} sages")
    print(f"    Removed: {len(removed_duplicates)} duplicates")

if __name__ == "__main__":
    remove_duplicates()
