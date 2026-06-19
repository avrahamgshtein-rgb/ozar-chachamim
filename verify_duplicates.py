#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verify there are no duplicate sages in data.json
"""

import json
import sys
import io
from pathlib import Path
from collections import Counter

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA_JSON = Path("data.json")

def check_duplicates():
    """Check for duplicate sage names and IDs"""

    with open(DATA_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    nodes = data.get('nodes', [])

    print(f"[*] Checking {len(nodes)} sages for duplicates...\n")

    # Check by name (label)
    names = [node['label'] for node in nodes]
    name_counts = Counter(names)

    # Check by ID
    ids = [node['id'] for node in nodes]
    id_counts = Counter(ids)

    # Find duplicates
    duplicate_names = {name: count for name, count in name_counts.items() if count > 1}
    duplicate_ids = {id_: count for id_, count in id_counts.items() if count > 1}

    # Print results
    if duplicate_names:
        print("[!] DUPLICATE NAMES FOUND:")
        for name, count in sorted(duplicate_names.items()):
            print(f"    '{name}': appears {count} times")
        print()
    else:
        print("[+] No duplicate names found ✓")

    if duplicate_ids:
        print("[!] DUPLICATE IDs FOUND:")
        for id_, count in sorted(duplicate_ids.items()):
            print(f"    ID '{id_}': appears {count} times")
        print()
    else:
        print("[+] No duplicate IDs found ✓")

    # Summary
    print(f"\n{'='*50}")
    print(f"[*] Summary:")
    print(f"{'='*50}")
    print(f"Total sages: {len(nodes)}")
    print(f"Unique names: {len(name_counts)}")
    print(f"Unique IDs: {len(id_counts)}")
    print(f"Duplicate name entries: {len(duplicate_names)}")
    print(f"Duplicate ID entries: {len(duplicate_ids)}")

    if not duplicate_names and not duplicate_ids:
        print(f"\n[✓] DATABASE CLEAN - NO DUPLICATES DETECTED")
        return True
    else:
        print(f"\n[!] DUPLICATES DETECTED - NEEDS FIX")
        return False

if __name__ == "__main__":
    success = check_duplicates()
    sys.exit(0 if success else 1)
