#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build research_by_sage.json from sources/ directory structure
Uses manual mapping from folder names to sage IDs
"""
import json
from pathlib import Path

# Manual mapping from folder names to sage IDs
# Get these from data.json by searching for the sage names
FOLDER_TO_SAGE_ID = {
    'rambam': '1',
    'ramban': '2',
    'ramchal': '3',
    'rabbi-meir-tanna': '4',
    'rabbeinu-gershom': '5',
    'baal-haturim': '6',
    'rashbam': '7',
    'ravad-posquieres': '8',
    'maimonides': '1',
    # Add more as needed
}

research_by_sage = {}
sources_dir = Path('sources')

if not sources_dir.exists():
    print("[ERROR] sources/ directory not found")
    exit(1)

# Iterate through all subdirectories
found_count = 0
for sage_folder in sorted(sources_dir.iterdir()):
    if not sage_folder.is_dir():
        continue

    folder_name = sage_folder.name

    # Find all .docx files in this folder
    docx_files = list(sage_folder.glob('*.docx'))

    if docx_files:
        file_list = [f.name for f in docx_files]
        # Use folder name as ID for now (will need manual mapping later)
        # Store by folder name temporarily
        research_by_sage[folder_name] = file_list
        found_count += 1
        print("[OK] {}: {} files".format(folder_name, len(file_list)))

print("\nTotal folders with research: {}".format(found_count))
print("Total research files: {}".format(sum(len(v) for v in research_by_sage.values())))

# Save as research_index_by_folder.json (will need to map to IDs)
with open('research_index_by_folder.json', 'w', encoding='utf-8') as f:
    json.dump(research_by_sage, f, ensure_ascii=False, indent=2)

print("[DONE] Saved research_index_by_folder.json")
