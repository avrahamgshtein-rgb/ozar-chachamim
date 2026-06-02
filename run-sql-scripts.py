#!/usr/bin/env python3
import os
from supabase import create_client, Client

# Load environment or hardcoded credentials
url = os.environ.get("SUPABASE_URL", "https://rslaqhwqvvujbrvvqkzf.supabase.co")
key = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbGFxaHd3cXZ2dWpicnZ2cWt6ZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzE2MTkwNDkxLCJleHAiOjE5OTMxMDY0OTF9.kT0YHWmH0Z-E6L1PMLmRQCWxH1W6Ye8qO4wREFxG_Q4")

supabase: Client = create_client(url, key)

# Read and execute scripts
with open("add-missing-columns.sql", "r") as f:
    add_columns_sql = f.read()

with open("verify-rls.sql", "r") as f:
    verify_rls_sql = f.read()

print("Running add-missing-columns.sql...")
try:
    result = supabase.rpc("exec_sql", {"sql": add_columns_sql}).execute()
    print("✓ add-missing-columns.sql executed successfully")
    print(result)
except Exception as e:
    print(f"✗ Error executing add-missing-columns.sql: {e}")

print("\nRunning verify-rls.sql...")
try:
    result = supabase.rpc("exec_sql", {"sql": verify_rls_sql}).execute()
    print("✓ verify-rls.sql executed successfully")
    print(result)
except Exception as e:
    print(f"✗ Error executing verify-rls.sql: {e}")

print("\nDone!")
