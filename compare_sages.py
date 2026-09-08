#!/usr/bin/env python3
import openpyxl
import json
import csv

# Read Excel file
excel_path = "data/חכמי ישראל.xlsx"
wb = openpyxl.load_workbook(excel_path)
ws = wb.active

headers = []
excel_sages = []

for i, row in enumerate(ws.iter_rows(values_only=True)):
    if i == 0:
        headers = list(row)
    else:
        if row and row[0]:
            sage_dict = dict(zip(headers, row))
            excel_sages.append(sage_dict)

# Read data.json
with open("nextjs-app/public/data.json", "r", encoding="utf-8") as f:
    data_json = json.load(f)
    data_sages = data_json.get("nodes", [])

# Create ID sets
excel_ids = set()
for sage in excel_sages:
    mid = sage.get("מזהה")
    if mid:
        excel_ids.add(str(mid) if not isinstance(mid, str) else mid)

data_ids = set()
for sage in data_sages:
    data_ids.add(str(sage.get("id", "")))

# Find NEW sages in Excel (IDs in Excel but NOT in data.json)
new_in_excel = excel_ids - data_ids

# Write to console file (no Hebrew printing to console, use file output)
with open("comparison_console.txt", "w", encoding="utf-8") as f:
    f.write(f"Total sages in Excel: {len(excel_sages)}\n")
    f.write(f"Total sages in data.json: {len(data_sages)}\n")
    f.write(f"Total unique IDs in Excel: {len(excel_ids)}\n")
    f.write(f"Total unique IDs in data.json: {len(data_ids)}\n")
    f.write(f"\nNEW SAGES in Excel (not in data.json): {len(new_in_excel)}\n")

# Read CSV
csv_ids = set()
csv_data = {}
try:
    with open("data/חכמי_ישראל.csv", "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            mid = row.get("מזהה", "")
            if mid:
                csv_ids.add(str(mid))
                csv_data[str(mid)] = row
except Exception as e:
    pass

# Check if new Excel sages are in CSV
new_not_in_csv = new_in_excel - csv_ids

# Save full comparison to file
comparison = {
    "excel_total": len(excel_sages),
    "data_json_total": len(data_sages),
    "csv_total": len(csv_ids),
    "new_in_excel_count": len(new_in_excel),
    "new_not_in_csv_count": len(new_not_in_csv),
    "new_in_excel": list(new_in_excel),
    "new_not_in_csv": list(new_not_in_csv),
    "new_sages_details": []
}

for sage in excel_sages:
    mid = str(sage.get("מזהה", ""))
    if mid in new_in_excel:
        comparison["new_sages_details"].append({
            "id": mid,
            "name_he": sage.get("שם", ""),
            "name_en": sage.get("שם_אנגלית", ""),
            "era": sage.get("עידן", ""),
            "description": sage.get("תיאור_קצר", ""),
            "in_csv": mid in csv_ids
        })

with open("comparison_result.json", "w", encoding="utf-8") as f:
    json.dump(comparison, f, ensure_ascii=False, indent=2)
