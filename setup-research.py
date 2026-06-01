#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Setup research content: Add RLS policy + Extract & Upload
"""

import requests
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

print("=" * 100)
print("🔐 SETUP: Add RLS Policy for Research Content")
print("=" * 100)

# ========================================================================
# STEP 1: Add RLS Policy via direct SQL execution
# ========================================================================
print("\n1️⃣ Adding INSERT policy for research_content...")

# Note: This requires running in Supabase SQL Editor or via admin API
# Since we have anon key, we'll skip this and advise manual execution

print("""
⚠️  Please run this SQL in Supabase SQL Editor:

    CREATE POLICY "anyone_insert_research" ON public.research_content
    FOR INSERT WITH CHECK (true);

Then re-run: python extract_research.py

OR use the alternative approach:

🔗 Go to https://app.supabase.com → SQL Editor
📋 Paste the SQL above
▶️  Click "Run"
✅ Done!

Then return here and run: python extract_research.py
""")

print("\n" + "=" * 100)
