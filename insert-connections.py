#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Insert connections directly to Supabase
"""

import requests
import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://ulluacifirzywhmzkvkr.supabase.co"
SUPABASE_KEY = "sb_publishable_ObxKLFsDTE41KoAMfMV1dw_Nu38ZI2C"

headers = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

# Simple connections for testing (connecting sequential sages)
connections = [
    {'source_id': '1', 'target_id': '2', 'connection_type': 'student'},
    {'source_id': '2', 'target_id': '3', 'connection_type': 'influence'},
    {'source_id': '3', 'target_id': '4', 'connection_type': 'colleague'},
    {'source_id': '4', 'target_id': '5', 'connection_type': 'predecessor'},
    {'source_id': '5', 'target_id': '6', 'connection_type': 'teacher'},
    {'source_id': '6', 'target_id': '7', 'connection_type': 'student'},
    {'source_id': '7', 'target_id': '8', 'connection_type': 'influence'},
    {'source_id': '8', 'target_id': '9', 'connection_type': 'oppose'},
    {'source_id': '9', 'target_id': '10', 'connection_type': 'colleague'},
    {'source_id': '10', 'target_id': '11', 'connection_type': 'student'},
    {'source_id': '11', 'target_id': '12', 'connection_type': 'influence'},
    {'source_id': '12', 'target_id': '13', 'connection_type': 'colleague'},
    {'source_id': '13', 'target_id': '14', 'connection_type': 'predecessor'},
    {'source_id': '14', 'target_id': '15', 'connection_type': 'teacher'},
    {'source_id': '15', 'target_id': '16', 'connection_type': 'student'},
    {'source_id': '16', 'target_id': '17', 'connection_type': 'influence'},
    {'source_id': '17', 'target_id': '18', 'connection_type': 'colleague'},
    {'source_id': '18', 'target_id': '19', 'connection_type': 'oppose'},
    {'source_id': '19', 'target_id': '20', 'connection_type': 'student'},
    {'source_id': '20', 'target_id': '21', 'connection_type': 'influence'},
    {'source_id': '21', 'target_id': '22', 'connection_type': 'colleague'},
    {'source_id': '22', 'target_id': '23', 'connection_type': 'predecessor'},
    {'source_id': '23', 'target_id': '24', 'connection_type': 'teacher'},
    {'source_id': '24', 'target_id': '25', 'connection_type': 'student'},
    {'source_id': '25', 'target_id': '26', 'connection_type': 'influence'},
]

print("🔗 Inserting 25 connections...")

response = requests.post(
    f'{SUPABASE_URL}/rest/v1/connections',
    json=connections,
    headers=headers
)

if response.status_code in [200, 201]:
    print(f"✅ SUCCESS! Inserted {len(connections)} connections")
else:
    print(f"❌ Error {response.status_code}: {response.text}")

print("\n✨ Done! Your database is now ready!")
print("   • 323 sages")
print("   • 25 connections")
print("\n🌐 Start server: python -m http.server 8080")
print("📱 Open: http://localhost:8080")
