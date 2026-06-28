#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Create mapping between research folders and sage IDs from data.json
"""
import json
import re
from pathlib import Path

# Load data.json to get sage info
with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    sages = {str(node['id']): node for node in data.get('nodes', [])}

# Load research_index_by_folder.json
with open('research_index_by_folder.json', 'r', encoding='utf-8') as f:
    research_by_folder = json.load(f)

# Manual mapping - research folder names to sage IDs
# Based on directory names in sources/
folder_to_id = {}

# Helper function to normalize name for comparison
def normalize(name):
    return re.sub(r'[^\w]', '', name).lower()

for folder_name in research_by_folder.keys():
    found_id = None

    # Try direct match with sage labels
    for sage_id, sage in sages.items():
        sage_label = normalize(sage.get('label', ''))
        folder_norm = normalize(folder_name)

        if sage_label == folder_norm or folder_norm in sage_label:
            found_id = sage_id
            print("[MATCH] {} -> {} ({})".format(folder_name, sage_id, sage.get('label', '')))
            break

    if not found_id:
        print("[NO_MATCH] {}".format(folder_name))

    if found_id:
        folder_to_id[folder_name] = found_id

# Create research_by_sage.json with ID keys
research_by_sage = {}
for folder_name, files in research_by_folder.items():
    sage_id = folder_to_id.get(folder_name)
    if sage_id:
        research_by_sage[sage_id] = files

print("\n[RESULT] Mapped {} folders to sage IDs".format(len(research_by_sage)))

# Save to research_by_sage.json
with open('research_by_sage.json', 'w', encoding='utf-8') as f:
    json.dump(research_by_sage, f, ensure_ascii=False, indent=2)

print("[DONE] Saved research_by_sage.json")
