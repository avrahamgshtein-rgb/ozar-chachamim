#!/usr/bin/env python3
"""
Import sages and research data to Supabase
Usage:
  python3 import_to_supabase.py --sages        (import 992 sages)
  python3 import_to_supabase.py --research     (import 18 research entries)
  python3 import_to_supabase.py                (both)
"""
import json
import sys
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    from supabase import create_client, Client
except ImportError:
    print("❌ supabase-py not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "supabase"])
    from supabase import create_client, Client

def get_credentials():
    """Get Supabase credentials from user input"""
    print("=" * 60)
    print("📊 Supabase Import Configuration")
    print("=" * 60)

    url = os.getenv('SUPABASE_URL') or input("\n🔗 Supabase Project URL (https://xxxxx.supabase.co): ").strip()
    key = os.getenv('SUPABASE_KEY') or input("🔑 Supabase Anon Key (eyJ...): ").strip()

    if not url or not key:
        print("\n❌ Missing credentials")
        sys.exit(1)

    return url, key

def import_sages(supabase: Client):
    """Import 992 sages from sages.json"""
    print("\n📖 Importing Sages...")

    if not os.path.exists('sages.json'):
        print("❌ sages.json not found")
        return False

    with open('sages.json', 'r', encoding='utf-8') as f:
        sages = json.load(f)

    print(f"📦 Preparing {len(sages)} sage records...")

    try:
        # Insert in batches (Supabase has limits)
        batch_size = 100
        for i in range(0, len(sages), batch_size):
            batch = sages[i:i+batch_size]
            response = supabase.table('sages').insert(batch).execute()
            print(f"  ✓ Batch {i//batch_size + 1}: {len(batch)} records")

        print(f"\n✅ Successfully imported {len(sages)} sages")
        return True

    except Exception as e:
        print(f"\n❌ Import failed: {e}")
        return False

def import_research(supabase: Client):
    """Import 18 research entries from research.json"""
    print("\n📚 Importing Research Content...")

    if not os.path.exists('research.json'):
        print("❌ research.json not found")
        return False

    with open('research.json', 'r', encoding='utf-8') as f:
        research = json.load(f)

    print(f"📦 Preparing {len(research)} research records...")

    try:
        # Insert all at once (should be small batch)
        response = supabase.table('research_content').insert(research).execute()
        print(f"✅ Successfully imported {len(research)} research entries")
        return True

    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Import Ozar Chachamim data to Supabase')
    parser.add_argument('--sages', action='store_true', default=True, help='Import sages')
    parser.add_argument('--research', action='store_true', default=True, help='Import research')
    parser.add_argument('--sages-only', action='store_true', help='Import only sages')
    parser.add_argument('--research-only', action='store_true', help='Import only research')

    args = parser.parse_args()

    # Parse flags
    do_sages = args.sages and not args.research_only
    do_research = args.research and not args.sages_only

    if args.sages_only:
        do_sages = True
        do_research = False
    elif args.research_only:
        do_sages = False
        do_research = True

    # Get credentials
    url, key = get_credentials()

    # Connect to Supabase
    print("\n🔌 Connecting to Supabase...")
    try:
        supabase = create_client(url, key)
        # Test connection
        response = supabase.table('sages').select('COUNT(*)', count='exact').execute()
        print("✅ Connected successfully")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\nTroubleshooting:")
        print("  1. Check that Supabase project is ready")
        print("  2. Verify URL and Key are correct")
        print("  3. Run SQL schema first: supabase-schema-v2.sql")
        sys.exit(1)

    # Import
    success = True
    if do_sages:
        if not import_sages(supabase):
            success = False
    if do_research:
        if not import_research(supabase):
            success = False

    # Summary
    print("\n" + "=" * 60)
    if success:
        print("✨ Import completed successfully!")
        print("\n📊 Verify in Supabase SQL Editor:")
        print("  SELECT COUNT(*) FROM sages;")
        print("  SELECT COUNT(*) FROM research_content;")
    else:
        print("❌ Import had errors. Check messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
