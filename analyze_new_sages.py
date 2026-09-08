#!/usr/bin/env python3
import openpyxl
import json

# Read Excel file
excel_path = "data/חכמי ישראל.xlsx"
wb = openpyxl.load_workbook(excel_path)
ws = wb.active

# Get all data
excel_sages = []
headers = None

for i, row in enumerate(ws.iter_rows(values_only=True)):
    row_values = list(row)

    if i == 0:
        headers = row_values
    else:
        if row_values and row_values[0]:
            excel_sages.append({
                'row': i + 1,
                'id': row_values[0],
                'values': row_values
            })

# The 120 new IDs that are not in data.json
new_ids = ['232', '257', '101', '5', '211', '363', '369', '251', '223', '231', '250', '360', '60', '107', '181', '234', '402', '240', '205', '306', '220', '216', '224', '212', '357', '238', '188', '321', '210', '222', '377', '209', '31', '244', '396', '184', '233', '379', '40', '187', '368', '380', '371', '228', '215', '405', '367', '30', '304', '316', '385', '230', '384', '249', '252', '404', '382', '63', '217', '305', '330', '194', '186', '358', '374', '162', '256', '246', '372', '241', '376', '361', '239', '145', '359', '206', '115', '258', '383', '245', '29', '254', '213', '248', '20', '260', '214', '226', '124', '185', '235', '243', '362', '370', '253', '237', '227', '36', '236', '365', '221', '366', '255', '219', '225', '208', '259', '378', '200', '381', '373', '364', '247', '242', '375', '218', '75', '10', '15', '333']

# Analyze new sages
sample_new = []
for sage in excel_sages:
    id_str = str(sage['id'])
    if id_str in new_ids[:20]:  # First 20 new IDs
        values = sage['values']
        non_empty_data = []
        for j, (header, val) in enumerate(zip(headers, values)):
            if val:
                non_empty_data.append(f"{j}:{header}={str(val)[:100]}")

        sample_new.append({
            "id": id_str,
            "row": sage['row'],
            "data": non_empty_data
        })

# Write to file
output = {
    "total_excel_sages": len(excel_sages),
    "total_new_ids": len(new_ids),
    "headers": headers,
    "sample_new_sages_with_data": sample_new
}

with open("new_sages_analysis.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

# Also get the mapping from data.json to understand structure
try:
    with open("nextjs-app/public/data.json", "r", encoding="utf-8") as f:
        data_json = json.load(f)
        if data_json.get("nodes"):
            first_sage = data_json["nodes"][0]
            output["sample_data_json_sage"] = first_sage
except:
    pass

with open("new_sages_analysis.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

# Write stats
with open("new_sages_stats.txt", "w", encoding="utf-8") as f:
    f.write(f"Excel sages: {len(excel_sages)}\n")
    f.write(f"New sages not in data.json: {len(new_ids)}\n")
    f.write(f"Excel columns: {len(headers)}\n\n")

    # Count non-empty fields for each new ID
    non_empty_counts = {}
    for sage in excel_sages:
        id_str = str(sage['id'])
        if id_str in new_ids:
            count = sum(1 for v in sage['values'] if v)
            non_empty_counts[id_str] = count

    f.write(f"Non-empty field counts for new sages:\n")
    f.write(f"  Empty (0 fields): {sum(1 for c in non_empty_counts.values() if c == 0)}\n")
    f.write(f"  Has data: {sum(1 for c in non_empty_counts.values() if c > 0)}\n")

    sages_with_data = [sid for sid, c in non_empty_counts.items() if c > 1]  # More than just ID
    f.write(f"\nNew sages with data (excluding ID column): {len(sages_with_data)}\n")
    if sages_with_data:
        f.write(f"  Examples: {sages_with_data[:10]}\n")
