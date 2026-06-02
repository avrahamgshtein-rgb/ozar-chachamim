#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Upload approved migration paths to Supabase
Reads from migrations-to-upload.csv
"""

import csv
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://ulluacifirzywhmzkvkr.supabase.co"
SUPABASE_KEY = "sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C"

print("=" * 100)
print("📤 UPLOADING MIGRATION PATHS TO SUPABASE")
print("=" * 100)

# Read CSV
try:
    with open('migrations-to-upload.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        migrations = list(reader)
    print(f"\n✓ Read {len(migrations)} migrations from CSV")
except FileNotFoundError:
    print("❌ migrations-to-upload.csv not found. Run extract-all-migrations.py first.")
    sys.exit(1)

if not migrations:
    print("❌ No migrations to upload")
    sys.exit(1)

# Build SQL UPDATE statements
print("\n🔨 Building SQL UPDATE statements...")

sql_statements = []
for m in migrations:
    sage_id = m['sage_id']
    # Properly escape single quotes for SQL
    migration_path = m['migration_path'].replace("\\", "\\\\").replace("'", "''")
    sql = f"UPDATE public.sages SET migration_path = '{migration_path}' WHERE id = '{sage_id}';"
    sql_statements.append(sql)

# Save to SQL file
sql_file = "upload-migrations.sql"
with open(sql_file, 'w', encoding='utf-8') as f:
    f.write("-- Auto-generated SQL migration updates\n")
    f.write(f"-- {len(migrations)} sages\n\n")
    for sql in sql_statements:
        f.write(sql + "\n")
    f.write("\n-- Verify\n")
    f.write("SELECT COUNT(*) as with_migration FROM public.sages WHERE migration_path IS NOT NULL;\n")

print(f"✓ Generated {sql_file}")
print(f"\n📋 Next steps:")
print(f"1. Open Supabase SQL Editor")
print(f"2. Copy and paste the contents of: {sql_file}")
print(f"3. Run the SQL to update database")
print(f"4. Run verification query at the end")

print("\n" + "=" * 100)
print(f"✨ READY TO UPLOAD: {len(migrations)} migrations")
print("=" * 100)
