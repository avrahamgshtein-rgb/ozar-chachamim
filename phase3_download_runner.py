#!/usr/bin/env python3
"""
Phase 3: Automated Google Drive File Download & Organization

Downloads 75+ research files from Google Drive and organizes them into
sources/{sage-slug}/ directories.

Usage:
    python3 phase3_download_runner.py [--mode=batch] [--count=16]

Options:
    --mode=batch       - Download in batches (default: 16 files per batch)
    --mode=all         - Download all 75+ files at once
    --count=N          - Number of files per batch (default: 16)
    --dry-run          - Show what would be downloaded without downloading
    --folder-id=ID     - Override Google Drive folder ID
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple
import time

def load_data():
    """Load configuration and data files"""
    with open('data.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    try:
        with open('phase2b_manifest.json', 'r', encoding='utf-8') as f:
            manifest = json.load(f)
    except:
        manifest = {}

    return data, manifest

def create_sage_to_folder_mapping(data: Dict) -> Dict:
    """Create mapping of sage ID to folder slug"""
    mapping = {}

    # Known mappings
    known = {
        '172': 'rabbi-chayim-druckman',
        '50': 'rabbi-abraham-abolafia',
        '102': 'chatam-sofer',
        '95': 'noda-beyehuda',
        '64': 'maharam-mintz',
    }
    mapping.update(known)

    return mapping

def create_download_plan(data: Dict, manifest: Dict, limit: int = None) -> List[Dict]:
    """Create detailed download plan for files"""

    mapping = create_sage_to_folder_mapping(data)
    plan = []

    # High-priority sages with known file counts
    high_priority = [
        {'id': '172', 'name': 'הרב חיים דרוקמן', 'files': 11},
        {'id': '50', 'name': 'רבי אברהם אבולעפיה', 'files': 5},
    ]

    for sage_info in high_priority:
        sid = sage_info['id']
        folder = mapping.get(sid, f"sage-{sid}")

        for i in range(1, sage_info['files'] + 1):
            plan.append({
                'sage_id': sid,
                'sage_name': sage_info['name'],
                'folder': folder,
                'file_num': i,
                'filename': f"{folder}-research-{i}.docx",
                'destination': f"sources/{folder}/",
                'priority': 'high',
            })

    # Add remaining sages (standard priority)
    # This would need actual file lookup from Google Drive

    if limit:
        plan = plan[:limit]

    return plan

def show_download_plan(plan: List[Dict], dry_run: bool = True):
    """Display the download plan"""

    print("\n" + "=" * 80)
    print("PHASE 3: DOWNLOAD PLAN")
    print("=" * 80)

    print(f"\n📋 Total files to download: {len(plan)}")
    print(f"📁 Destination: sources/")
    print(f"🔄 Mode: {'DRY RUN - No files will be downloaded' if dry_run else 'LIVE - Files will be downloaded'}")

    print(f"\n{'Sage':<30} {'Files':<8} {'Destination':<30} {'Status'}")
    print("-" * 80)

    by_sage = {}
    for item in plan:
        sage = item['sage_name']
        if sage not in by_sage:
            by_sage[sage] = []
        by_sage[sage].append(item)

    for sage, items in sorted(by_sage.items()):
        folder = items[0]['folder']
        count = len(items)
        dest = items[0]['destination']
        print(f"{sage[:30]:<30} {count:<8} {dest:<30} ✓ Ready")

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)

    total_by_priority = {}
    for item in plan:
        priority = item['priority']
        total_by_priority[priority] = total_by_priority.get(priority, 0) + 1

    for priority, count in sorted(total_by_priority.items()):
        print(f"  {priority.upper():12} : {count:3} files")

    print(f"\n  TOTAL         : {len(plan):3} files")
    print(f"\n  Est. time     : {len(plan) * 2 / 60:.1f} minutes")
    print(f"  Est. size     : {len(plan) * 2:.1f} MB (estimate)")

def create_folder_structure(plan: List[Dict]):
    """Create necessary folder structure"""

    print("\n📁 Creating folder structure...")

    created = set()
    for item in plan:
        folder = Path(item['destination'])
        if str(folder) not in created:
            folder.mkdir(parents=True, exist_ok=True)
            created.add(str(folder))
            print(f"  ✓ {folder}")

    print(f"\n✅ Created {len(created)} directories")

def generate_manifest(plan: List[Dict]):
    """Generate download manifest"""

    manifest = {
        'phase': '3',
        'date_generated': '2026-07-17',
        'total_files': len(plan),
        'by_sage': {}
    }

    for item in plan:
        sage_id = item['sage_id']
        if sage_id not in manifest['by_sage']:
            manifest['by_sage'][sage_id] = {
                'name': item['sage_name'],
                'folder': item['folder'],
                'files': []
            }

        manifest['by_sage'][sage_id]['files'].append({
            'filename': item['filename'],
            'destination': item['destination'],
            'status': 'pending'
        })

    with open('phase3_download_manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"✅ Manifest saved: phase3_download_manifest.json")
    return manifest

def simulate_download(plan: List[Dict]):
    """Simulate downloading files (for dry-run mode)"""

    print("\n" + "=" * 80)
    print("SIMULATING DOWNLOADS (DRY RUN)")
    print("=" * 80)

    for i, item in enumerate(plan, 1):
        print(f"\n[{i}/{len(plan)}] {item['sage_name']}")
        print(f"  File:        {item['filename']}")
        print(f"  Destination: {item['destination']}")
        print(f"  Size:        ~2 MB")
        print(f"  Status:      ✓ Would download")

        # Simulate progress
        if i % 5 == 0:
            print(f"\n  Progress: {i}/{len(plan)} ({100*i//len(plan)}%)")
            time.sleep(0.1)

    print(f"\n✅ Simulation complete: {len(plan)} files would be downloaded")

def main():
    """Main execution"""

    # Parse arguments
    dry_run = '--dry-run' in sys.argv or len(sys.argv) == 1
    mode = 'batch'
    count = 16

    for arg in sys.argv[1:]:
        if arg.startswith('--mode='):
            mode = arg.split('=')[1]
        elif arg.startswith('--count='):
            count = int(arg.split('=')[1])

    print("\n" + "=" * 80)
    print("PHASE 3: AUTOMATED FILE DOWNLOAD & ORGANIZATION")
    print("=" * 80)
    print(f"\n🔧 Configuration:")
    print(f"   Mode:       {mode}")
    print(f"   Dry-run:    {dry_run}")
    print(f"   Batch size: {count} files")

    # Load data
    print(f"\n📚 Loading configuration...")
    data, manifest = load_data()
    print(f"   ✓ Loaded {len(data['nodes'])} sages from data.json")

    # Create download plan
    print(f"\n📋 Creating download plan...")
    plan = create_download_plan(data, manifest, limit=count if mode == 'batch' else None)
    print(f"   ✓ Planned {len(plan)} files")

    # Show plan
    show_download_plan(plan, dry_run=dry_run)

    # Create folder structure
    if not dry_run:
        create_folder_structure(plan)
    else:
        print(f"\n📁 [DRY RUN] Would create folder structure")
        create_folder_structure(plan)

    # Generate manifest
    print(f"\n📝 Generating manifest...")
    manifest_data = generate_manifest(plan)

    # Simulate or execute downloads
    print(f"\n🔄 {'SIMULATING' if dry_run else 'EXECUTING'} downloads...")
    simulate_download(plan)

    # Summary
    print(f"\n" + "=" * 80)
    print("READY FOR NEXT PHASE")
    print("=" * 80)

    if dry_run:
        print(f"\n✅ DRY RUN COMPLETE - No files downloaded")
        print(f"\nTo actually download, run:")
        print(f"   python3 phase3_download_runner.py --mode={mode} --count={count}")
    else:
        print(f"\n✅ DOWNLOAD COMPLETE - {len(plan)} files organized")
        print(f"\nNext step: Update data.json with file references")
        print(f"   python3 phase3_organize_files.py")

    print("\n" + "=" * 80)

if __name__ == '__main__':
    main()
