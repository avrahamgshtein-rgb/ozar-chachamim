#!/usr/bin/env python3
"""
Simple Supabase import using REST API (no dependencies)
"""
import json
import sys
import io
import urllib.request
import urllib.error

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://ulluacifirzywhmzkvkr.supabase.co"
SUPABASE_KEY = "sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C"

def import_sages():
    """Import 992 sages from sages.json"""
    print("\n📖 Importing Sages...")

    with open('sages.json', 'r', encoding='utf-8') as f:
        sages = json.load(f)

    print(f"📦 Preparing {len(sages)} sage records...")

    # Insert in batches
    batch_size = 50
    for i in range(0, len(sages), batch_size):
        batch = sages[i:i+batch_size]

        url = f"{SUPABASE_URL}/rest/v1/sages"
        headers = {
            "apikey": SUPABASE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }

        data = json.dumps(batch).encode('utf-8')

        try:
            req = urllib.request.Request(url, data=data, headers=headers, method='POST')
            with urllib.request.urlopen(req) as response:
                status = response.status
                print(f"  ✓ Batch {i//batch_size + 1}: {len(batch)} records ({status})")
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            print(f"  ❌ Batch {i//batch_size + 1} failed: {e.code}")
            print(f"     {error_body}")
            return False

    print(f"\n✅ Successfully imported {len(sages)} sages")
    return True

def import_research():
    """Import 18 research entries from research.json"""
    print("\n📚 Importing Research Content...")

    with open('research.json', 'r', encoding='utf-8') as f:
        research = json.load(f)

    print(f"📦 Preparing {len(research)} research records...")

    url = f"{SUPABASE_URL}/rest/v1/research_content"
    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    data = json.dumps(research).encode('utf-8')

    try:
        req = urllib.request.Request(url, data=data, headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            status = response.status
            print(f"✅ Successfully imported {len(research)} research entries ({status})")
            return True
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"❌ Import failed: {e.code}")
        print(f"   {error_body}")
        return False

def main():
    print("=" * 60)
    print("📊 Supabase Import (Simple REST API)")
    print("=" * 60)

    success = True

    if not import_sages():
        success = False

    if not import_research():
        success = False

    print("\n" + "=" * 60)
    if success:
        print("✨ Import completed successfully!")
        print("\nVerify in Supabase:")
        print("  1. Go to SQL Editor")
        print("  2. Run: SELECT COUNT(*) FROM sages;")
        print("  3. Run: SELECT COUNT(*) FROM research_content;")
    else:
        print("❌ Import had errors")
        sys.exit(1)

if __name__ == "__main__":
    main()
