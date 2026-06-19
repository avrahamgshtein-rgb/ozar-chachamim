#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate detailed import report
"""

import json
import csv
import sys
import io
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

CSV_PATH = Path("data/חכמי ישראל.csv")
DATA_JSON = Path("data.json")

print("=" * 70)
print("[*] DETAILED IMPORT REPORT")
print("=" * 70)

# Count CSV rows
with open(CSV_PATH, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    csv_rows = list(reader)
    csv_count = len(csv_rows)

print(f"\n[1] CSV FILE (חכמי ישראל.csv):")
print(f"    Total rows (excluding header): {csv_count}")

# Check for empty names
empty_names = sum(1 for row in csv_rows if not row.get("שם הדמות/הנושא", "").strip())
print(f"    Rows with empty name: {empty_names}")
print(f"    Valid sages: {csv_count - empty_names}")

# Load current data.json
with open(DATA_JSON, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"\n[2] CURRENT data.json:")
print(f"    Total sages: {len(data['nodes'])}")
print(f"    Total links: {len(data.get('links', []))}")

# Group by era
era_counts = {}
for node in data['nodes']:
    era = node.get('group', 'unknown')
    era_counts[era] = era_counts.get(era, 0) + 1

print(f"\n[3] SAGES BY ERA:")
for era, count in sorted(era_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"    {era}: {count}")

# Analyze unique names in CSV
csv_names = [row.get("שם הדמות/הנושא", "").strip() for row in csv_rows if row.get("שם הדמות/הנושא", "").strip()]
print(f"\n[4] CSV ANALYSIS:")
print(f"    Total rows with names: {len(csv_names)}")
print(f"    Unique names: {len(set(csv_names))}")
print(f"    Duplicate names in CSV: {len(csv_names) - len(set(csv_names))}")

# Get current names
current_names = {node['label'] for node in data['nodes']}
print(f"\n[5] COVERAGE:")
print(f"    CSV unique names: {len(set(csv_names))}")
print(f"    Sages in data.json: {len(current_names)}")
print(f"    % Coverage: {len(current_names) / len(set(csv_names)) * 100:.1f}%")

print("\n" + "=" * 70)
