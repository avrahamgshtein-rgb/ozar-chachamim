#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Check row count in Excel file
"""

import sys
import io

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    import openpyxl

    excel_path = r"data\חכמי ישראל.xlsx"
    wb = openpyxl.load_workbook(excel_path)
    ws = wb.active

    # Count non-empty rows
    row_count = ws.max_row

    print(f"[*] Excel file: {excel_path}")
    print(f"[*] Sheet name: {ws.title}")
    print(f"[*] Total rows: {row_count}")
    print(f"[*] Data rows (excluding header): {row_count - 1}")

except ImportError:
    print("[!] openpyxl not installed. Trying pandas...")
    try:
        import pandas as pd

        excel_path = r"data\חכמי ישראל.xlsx"
        df = pd.read_excel(excel_path)

        print(f"[*] Excel file: {excel_path}")
        print(f"[*] Total rows: {len(df)}")
        print(f"[*] Columns: {len(df.columns)}")
        print(f"[*] Column names:")
        for col in df.columns:
            print(f"    - {col}")

    except Exception as e:
        print(f"[!] Error: {e}")
