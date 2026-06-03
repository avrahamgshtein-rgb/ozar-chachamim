#!/usr/bin/env python3
"""
Auto-load connections into Supabase
Run once: python auto-load-connections.py
"""

import json
import os
from supabase import create_client, Client

# Get Supabase credentials from environment or config
try:
    from config import SUPABASE_CONFIG
    URL = SUPABASE_CONFIG.get('url')
    KEY = SUPABASE_CONFIG.get('anonKey')
except:
    URL = os.getenv('VITE_SUPABASE_URL')
    KEY = os.getenv('VITE_SUPABASE_ANON_KEY')

if not URL or not KEY:
    print("❌ Error: Supabase credentials not found")
    print("   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in config.js or environment")
    exit(1)

# Initialize Supabase
supabase: Client = create_client(URL, KEY)

# Load connections from data.json
with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    links = data.get('links', [])

print(f"📚 Found {len(links)} connections in data.json")

if not links:
    print("❌ No connections found")
    exit(1)

# Prepare connections for insertion
connections = []
for link in links:
    source = link.get('source')
    target = link.get('target')
    conn_type = link.get('type', 'colleague')
    period = link.get('historical_period', 'unknown')

    # Handle dict source/target (from D3 format)
    if isinstance(source, dict):
        source = source.get('id')
    if isinstance(target, dict):
        target = target.get('id')

    connections.append({
        'source_id': int(source),
        'target_id': int(target),
        'connection_type': conn_type,
        'historical_period': period
    })

# Check how many connections already exist
try:
    existing = supabase.table('connections').select('count').execute()
    existing_count = existing.data[0]['count'] if existing.data else 0
    print(f"✓ Already in DB: {existing_count} connections")
except Exception as e:
    print(f"⚠️  Could not check existing: {e}")
    existing_count = 0

# If connections already exist, ask before overwriting
if existing_count > 0:
    print(f"\n⚠️  {existing_count} connections already exist in Supabase")
    response = input("   Delete and replace them? (y/n): ").strip().lower()
    if response == 'y':
        try:
            supabase.table('connections').delete().neq('source_id', -1).execute()
            print("✓ Deleted existing connections")
        except Exception as e:
            print(f"❌ Could not delete: {e}")
            exit(1)
    else:
        print("✓ Keeping existing connections")
        exit(0)

# Insert connections in batches
batch_size = 50
for i in range(0, len(connections), batch_size):
    batch = connections[i:i+batch_size]
    try:
        response = supabase.table('connections').insert(batch).execute()
        print(f"✓ Batch {i//batch_size + 1}: {len(batch)} inserted")
    except Exception as e:
        print(f"⚠️  Batch {i//batch_size + 1}: {e}")

print(f"\n✅ DONE! Inserted {len(connections)} connections")
print(f"🌐 Next: Refresh your site and connections will appear!")
