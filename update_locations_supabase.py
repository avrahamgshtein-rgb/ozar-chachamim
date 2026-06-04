#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Direct location corrections based on WORD file extraction
"""

import json
import sys
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Location corrections from WORD analysis
CORRECTIONS = {
    'פילון האלכסנדרוני': ['אלכסנדריה', 'מצרים'],  # Was in Poland, should be Egypt/Alexandria
    'רבי יהודה החסיד': ['גרמניה', 'צרפת'],  # Was in Alexandria, should be Ashkenaz
    'רבנו משה בן מימון': ['מצרים', 'ספרד'],  # Rambam - Egypt and Spain
    'הרמב״ן': ['ספרד', 'עכו', 'ירושלים'],  # Ramban - Spain → Acre → Jerusalem
    'הרשב״ם': ['צרפת', 'ספרד'],  # Should be France/Spain not Poland
    'מהר״ם מרוטנבורג': ['גרמניה'],  # Germany
    'דון יצחק אברבנאל': ['ספרד', 'פורטוגל', 'איטליה'],  # Spain → Portugal → Italy
}

with open('word_extracted_data.json', 'r', encoding='utf-8') as f:
    word_data = json.load(f)

print("📊 תיקונים משובחים מנתוני WORD:\n")
for sage_name, locations in CORRECTIONS.items():
    # Check if we have data from WORD files
    for extracted_name, info in word_data.items():
        if sage_name.split()[0] in extracted_name:  # partial match
            print(f"✅ {sage_name}")
            print(f"   מיקומים נכונים: {' ← '.join(locations)}")
            print(f"   מקור WORD: {info.get('source_file')}")
            print()
            break

print("\n💾 לעדכן בSupabase, הריצו: python3 apply_corrections.py")
