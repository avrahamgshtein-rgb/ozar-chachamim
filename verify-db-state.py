#!/usr/bin/env python3
import os
from supabase import create_client, Client

url = os.environ.get("SUPABASE_URL", "https://rslaqhwqvvujbrvvqkzf.supabase.co")
key = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbGFxaHd3cXZ2dWpicnZ2cWt6ZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE2MTkwNDkxLCJleHAiOjE5OTMxMDY0OTF9.kT0YHWmH0Z-E6L1PMLmRQCWxH1W6Ye8qO4wREFxG_Q4")

supabase: Client = create_client(url, key)

print("Checking database state...\n")

# Check if columns exist
print("1. Checking sages table columns:")
try:
    result = supabase.table("sages").select("*").limit(1).execute()
    if result.data:
        columns = result.data[0].keys()
        has_migration_path = "migration_path" in columns
        has_coordinates = "coordinates" in columns

        print(f"   ✓ migration_path column: {'EXISTS' if has_migration_path else 'MISSING'}")
        print(f"   ✓ coordinates column: {'EXISTS' if has_coordinates else 'MISSING'}")
    else:
        print("   ⚠ No sage records found")
except Exception as e:
    print(f"   ✗ Error: {e}")

# Count sages and connections
print("\n2. Data summary:")
try:
    sages = supabase.table("sages").select("count", count="exact").execute()
    print(f"   ✓ Total sages: {sages.count}")
except:
    print("   ✗ Error counting sages")

try:
    connections = supabase.table("connections").select("count", count="exact").execute()
    print(f"   ✓ Total connections: {connections.count}")
except:
    print("   ✗ Error counting connections")

print("\n3. RLS Policies on sages table:")
print("   (Need to check in Supabase dashboard -> Authentication -> Policies)")
print("   For now, verify by attempting read access...")
try:
    test = supabase.table("sages").select("id,label").limit(1).execute()
    if test.data:
        print("   ✓ RLS allows SELECT access")
    else:
        print("   ⚠ SELECT returns no data")
except Exception as e:
    print(f"   ✗ RLS may be blocking access: {e}")

print("\nDone!")
