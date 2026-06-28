#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Load all research documents from sources/ and create research_by_sage.json
"""
import os
import json
import re
from pathlib import Path

# Map sage slugs to IDs
SAGE_ID_MAP = {}

# First load data.json to build slug -> ID map
try:
    with open('data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        for node in data.get('nodes', []):
            # Create slug from label (remove non-alphanumeric, convert to lowercase)
            slug = node['label'].lower()
            slug = re.sub(r'[^\w\s-]', '', slug)  # Remove special chars
            slug = re.sub(r'[\s]+', '-', slug)    # Replace spaces with hyphens
            SAGE_ID_MAP[slug] = str(node['id'])
except Exception as e:
    print("Error loading data.json:", e)

print(f"Loaded {len(SAGE_ID_MAP)} sage ID mappings")

# Scan sources/ directory
research_by_sage = {}
sources_dir = Path('sources')

if not sources_dir.exists():
    print("sources/ directory not found")
    exit(1)

# Iterate through all subdirectories
for sage_folder in sorted(sources_dir.iterdir()):
    if not sage_folder.is_dir():
        continue

    sage_slug = sage_folder.name
    sage_id = SAGE_ID_MAP.get(sage_slug)

    if not sage_id:
        print("[SKIP] No ID found for {} - skipping".format(sage_slug))
        continue

    # Find all .docx files in this folder
    docx_files = list(sage_folder.glob('*.docx'))

    if docx_files:
        file_list = [f.name for f in docx_files]
        research_by_sage[sage_id] = file_list
        print("[OK] {} (ID {}): {} files".format(sage_slug, sage_id, len(file_list)))

print("\nTotal sages with research: {}".format(len(research_by_sage)))

# Save to research_by_sage.json
with open('research_by_sage.json', 'w', encoding='utf-8') as f:
    json.dump(research_by_sage, f, ensure_ascii=False, indent=2)

print("[DONE] Saved research_by_sage.json")
