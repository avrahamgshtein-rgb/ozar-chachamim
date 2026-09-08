#!/usr/bin/env python3
import openpyxl
import json
import csv

# Read Excel file
excel_path = "data/חכמי ישראל.xlsx"
wb = openpyxl.load_workbook(excel_path)
ws = wb.active

headers = None
excel_sages_dict = {}

for i, row in enumerate(ws.iter_rows(values_only=True)):
    row_values = list(row)
    if i == 0:
        headers = row_values
    else:
        if row_values and row_values[0]:
            sage_id = str(row_values[0])
            excel_sages_dict[sage_id] = {
                'name': row_values[2],  # שם הדמות/הנושא
                'years': row_values[3],  # שנים/תקופה
                'location': row_values[4],  # אזור/מרחב
                'period': row_values[5],  # תקופה
                'field': row_values[6],  # תחום עיקרי
                'tags': row_values[7],  # תגיות
                'summary': row_values[8],  # תקציר
                'idea': row_values[9],  # רעיון מרכזי
                'related': row_values[10],  # דמויות קשורות
                'spotify': row_values[11],  # קישור ספוטיפיי
                'chapter_type': row_values[1]  # סוג פרק
            }

# Read data.json
with open("nextjs-app/public/data.json", "r", encoding="utf-8") as f:
    data_json = json.load(f)
    data_ids = set(str(s.get("id")) for s in data_json.get("nodes", []))

# Read CSV
csv_ids = set()
csv_dict = {}
try:
    with open("data/חכמי_ישראל.csv", "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            mid = str(row.get("מזהה", "")).strip()
            if mid:
                csv_ids.add(mid)
                csv_dict[mid] = row
except Exception as e:
    pass

# Find new sages
all_excel_ids = set(excel_sages_dict.keys())
new_in_excel = all_excel_ids - data_ids
new_not_in_csv = new_in_excel - csv_ids

# Create report
report = {
    "summary": {
        "excel_total": len(excel_sages_dict),
        "data_json_total": len(data_ids),
        "csv_total": len(csv_ids),
        "new_in_excel_count": len(new_in_excel),
        "new_not_in_csv_count": len(new_not_in_csv),
        "all_in_csv": len(new_not_in_csv) == 0
    },
    "new_sages": []
}

# Build new sages list
for sage_id in sorted(new_in_excel, key=lambda x: int(x) if x.isdigit() else 999999):
    sage = excel_sages_dict[sage_id]
    report["new_sages"].append({
        "id": sage_id,
        "name": sage['name'],
        "years": sage['years'],
        "period": sage['period'],
        "location": sage['location'],
        "field": sage['field'],
        "chapter_type": sage['chapter_type'],
        "in_csv": sage_id in csv_ids,
        "has_spotify": bool(sage['spotify']),
        "tags": sage['tags'][:50] if sage['tags'] else None
    })

# Data quality checks
data_quality = {
    "new_sages_without_name": [],
    "new_sages_without_period": [],
    "new_sages_without_spotify": [],
    "new_sages_with_all_fields": 0,
    "duplicate_names": {}
}

name_counts = {}
for sage_id in new_in_excel:
    sage = excel_sages_dict[sage_id]
    if not sage['name']:
        data_quality["new_sages_without_name"].append(sage_id)
    if not sage['period']:
        data_quality["new_sages_without_period"].append(sage_id)
    if not sage['spotify']:
        data_quality["new_sages_without_spotify"].append(sage_id)

    if sage['name'] and sage['period'] and sage['field'] and sage['spotify']:
        data_quality["new_sages_with_all_fields"] += 1

    # Check for duplicates
    if sage['name']:
        name = str(sage['name']).strip()
        if name in name_counts:
            if name not in data_quality["duplicate_names"]:
                data_quality["duplicate_names"][name] = [name_counts[name]]
            data_quality["duplicate_names"][name].append(sage_id)
        else:
            name_counts[name] = sage_id

report["data_quality"] = data_quality

# Write report
with open("final_comparison_report.json", "w", encoding="utf-8") as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

# Write summary text
with open("COMPARISON_SUMMARY.txt", "w", encoding="utf-8") as f:
    f.write("=" * 80 + "\n")
    f.write("EXCEL vs DATA.JSON COMPARISON REPORT\n")
    f.write("=" * 80 + "\n\n")

    f.write("SUMMARY:\n")
    f.write(f"  Excel file total sages: {report['summary']['excel_total']}\n")
    f.write(f"  data.json current sages: {report['summary']['data_json_total']}\n")
    f.write(f"  CSV file total sages: {report['summary']['csv_total']}\n")
    f.write(f"  New sages in Excel (not in data.json): {report['summary']['new_in_excel_count']}\n")
    f.write(f"  New sages NOT in CSV: {report['summary']['new_not_in_csv_count']}\n")
    f.write(f"  All new sages are in CSV: {report['summary']['all_in_csv']}\n\n")

    f.write("DATA QUALITY CHECKS:\n")
    f.write(f"  New sages without name: {len(data_quality['new_sages_without_name'])}\n")
    f.write(f"  New sages without period: {len(data_quality['new_sages_without_period'])}\n")
    f.write(f"  New sages without Spotify URL: {len(data_quality['new_sages_without_spotify'])}\n")
    f.write(f"  New sages with all key fields: {data_quality['new_sages_with_all_fields']}\n")
    f.write(f"  Duplicate names found: {len(data_quality['duplicate_names'])}\n\n")

    if data_quality['duplicate_names']:
        f.write("DUPLICATE NAMES:\n")
        for name, ids in list(data_quality['duplicate_names'].items())[:10]:
            f.write(f"  '{name}': IDs {ids}\n")

    f.write("\nNEW SAGES LIST (120 total):\n")
    f.write("-" * 80 + "\n")
    for i, sage in enumerate(report["new_sages"], 1):
        in_csv_marker = "[CSV]" if sage['in_csv'] else "[NOT IN CSV]"
        spotify_marker = "[SPOTIFY]" if sage['has_spotify'] else "[NO SPOTIFY]"
        f.write(f"{i:3d}. ID {sage['id']:3s} {in_csv_marker} {spotify_marker}: {sage['name'][:60]}\n")
        if sage['years']:
            f.write(f"      Years: {sage['years']}, Period: {sage['period']}\n")
        if sage['location']:
            f.write(f"      Location: {sage['location'][:60]}\n")

print("Reports generated successfully!")
