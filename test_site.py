#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test the Ozar Chachamim website locally
"""

import requests
import json
import sys
import io
import time

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8080"

def test_server():
    """Test if server is running"""
    try:
        response = requests.get(BASE_URL, timeout=5)
        if response.status_code == 200:
            print(f"[+] Server is running on {BASE_URL}")
            return True
        else:
            print(f"[-] Server returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"[-] Could not reach server: {e}")
        return False

def test_data():
    """Test if data.json is accessible"""
    try:
        response = requests.get(f"{BASE_URL}/data.json", timeout=5)
        if response.status_code == 200:
            data = response.json()
            nodes = data.get('nodes', [])
            links = data.get('links', [])
            print(f"[+] data.json loaded successfully")
            print(f"    - Sages: {len(nodes)}")
            print(f"    - Connections: {len(links)}")
            return True
        else:
            print(f"[-] data.json returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"[-] Error loading data.json: {e}")
        return False

def test_files():
    """Test if required files exist"""
    files = [
        "index.html",
        "data.json",
        "styles-graph.css",
        "graph.js",
    ]

    print(f"\n[*] Checking required files:")
    for file in files:
        try:
            response = requests.head(f"{BASE_URL}/{file}", timeout=5)
            status = "[+]" if response.status_code == 200 else f"[-] {response.status_code}"
            print(f"    {status} {file}")
        except:
            print(f"    [-] {file} - ERROR")

def main():
    print("=" * 70)
    print("[*] OZAR CHACHAMIM - LOCAL VERIFICATION")
    print("=" * 70)
    print()

    # Test server
    print("[1] Testing server...")
    if not test_server():
        print("\n[-] Server is not responding!")
        print("[!] Start with: python -m http.server 8080")
        return False

    print()

    # Test data
    print("[2] Testing data.json...")
    if not test_data():
        print("\n[-] data.json is not accessible!")
        return False

    print()

    # Test files
    print("[3] Testing file access...")
    test_files()

    print()
    print("=" * 70)
    print("[✓] LOCAL VERIFICATION COMPLETE")
    print("=" * 70)
    print()
    print("[*] NEXT STEPS:")
    print("    1. Open http://localhost:8080 in your browser")
    print("    2. Check all 5 tabs load correctly:")
    print("       - רשת קשרים (Graph)")
    print("       - גיאוגרפיה (Map)")
    print("       - מסורות (Traditions)")
    print("       - רעיונות (Ideas)")
    print("       - שלשלת הקבלה (Timeline)")
    print("    3. Press F12 to open console - verify no errors")
    print("    4. Try searching for a sage name")
    print("    5. Click on a sage to verify sidebar opens")
    print()

if __name__ == "__main__":
    main()
