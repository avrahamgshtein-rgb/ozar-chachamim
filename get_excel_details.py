#!/usr/bin/env python3
import openpyxl
import json

# Read Excel file
excel_path = "data/חכמי ישראל.xlsx"
wb = openpyxl.load_workbook(excel_path)
ws = wb.active

# Get all data with row numbers
excel_sages = []
headers = None

for i, row in enumerate(ws.iter_rows(values_only=False)):
    row_values = [cell.value for cell in row]

    if i == 0:
        headers = row_values
    else:
        if row_values and row_values[0]:
            # Store with all columns
            sage_dict = dict(zip(headers, row_values))
            excel_sages.append({
                'row': i + 1,  # Excel row numbering starts at 1
                'id': row_values[0],
                'all_fields': sage_dict
            })

# Check which new IDs have non-empty rows
new_ids = [232, 257, 101, 5, 211, 363, 369, 251, 223, 231, 250, 360, 60, 107, 181, 234, 402, 240, 205, 306, 220, 216, 224, 212]

# Check overall structure
with open("debug_excel.txt", "w", encoding="utf-8") as f:
    f.write(f"Total rows in Excel: {len(excel_sages) + 1}\n")  # +1 for header
    f.write(f"Header columns ({len(headers)}):\n")
    for i, h in enumerate(headers[:10]):
        f.write(f"  {i}: {h}\n")
    if len(headers) > 10:
        f.write(f"  ... and {len(headers) - 10} more columns\n")

# Save detailed output
output = {
    "headers": headers,
    "total_rows": len(excel_sages),
    "sample_new_sages": []
}

for sage in excel_sages:
    if sage['id'] in new_ids[:5]:  # First 5 new ones
        non_empty = {k: str(v)[:200] for k, v in sage['all_fields'].items() if v}
        output["sample_new_sages"].append({
            "id": sage['id'],
            "row": sage['row'],
            "non_empty_fields": non_empty
        })

with open("excel_details.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
