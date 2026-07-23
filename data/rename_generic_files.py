#!/usr/bin/env python3
"""
Script to rename generic auto-generated audio files in Telegram export
Based on context from chat messages

Usage:
    python rename_generic_files.py <path_to_telegram_export>

Example:
    python rename_generic_files.py "C:\\Users\\User\\Downloads\\Telegram Desktop\\ChatExport_2026-07-11"
"""

import os
import sys
import shutil
from html.parser import HTMLParser
import re
from pathlib import Path


class MessageExtractor(HTMLParser):
    """Extract file references and context from Telegram HTML export"""

    def __init__(self):
        super().__init__()
        self.messages = []
        self.current = {}
        self.in_title = False
        self.in_name = False
        self.in_time = False

    def handle_starttag(self, tag, attrs):
        if tag == 'div':
            attr_dict = dict(attrs)
            if 'class' in attr_dict:
                if 'from_name' in attr_dict['class']:
                    self.in_name = True
                elif 'title' in attr_dict['class'] and 'bold' in attr_dict['class']:
                    self.in_title = True
                elif 'date' in attr_dict['class'] and 'details' in attr_dict['class']:
                    self.in_time = True
        if tag == 'a':
            attr_dict = dict(attrs)
            if 'href' in attr_dict:
                self.current['file'] = attr_dict['href']

    def handle_data(self, data):
        if self.in_name:
            self.current['sender'] = data.strip()
        elif self.in_title:
            self.current['title'] = data.strip()
        elif self.in_time:
            self.current['time'] = data.strip()

    def handle_endtag(self, tag):
        if tag == 'div':
            if self.in_name:
                self.in_name = False
            elif self.in_title:
                self.in_title = False
            elif self.in_time:
                self.in_time = False
        if tag == 'div' and 'file' in self.current:
            self.messages.append(self.current.copy())
            self.current = {}


def extract_file_context(export_path):
    """Extract file references from all HTML message files"""
    file_refs = {}

    for html_file in ['messages.html', 'messages2.html', 'messages3.html']:
        html_path = os.path.join(export_path, html_file)
        if os.path.exists(html_path):
            try:
                with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
                    parser = MessageExtractor()
                    parser.feed(f.read())
                    for msg in parser.messages:
                        if 'file' in msg:
                            filename = os.path.basename(msg['file'])
                            if filename not in file_refs:
                                file_refs[filename] = {
                                    'sender': msg.get('sender', 'Unknown'),
                                    'time': msg.get('time', ''),
                                    'context': msg.get('title', '')
                                }
            except Exception as e:
                print(f"⚠️  Error parsing {html_file}: {e}")

    return file_refs


def find_generic_files(voice_messages_path):
    """Find files with generic auto-generated names"""
    generic_pattern = re.compile(r'^audio_(\d+)@\d+-\d+-\d+_\d+-\d+-\d+\.(ogg|m4a|mp3)$')
    generic_files = []

    if not os.path.exists(voice_messages_path):
        print(f"❌ Voice messages folder not found: {voice_messages_path}")
        return generic_files

    for filename in os.listdir(voice_messages_path):
        if generic_pattern.match(filename):
            generic_files.append(filename)

    return sorted(generic_files)


def suggest_new_name(generic_file, file_refs):
    """Suggest a new name based on message context"""

    # Check if this file is referenced in messages
    for ref_file, ref_info in file_refs.items():
        # Try to match by content/title
        if ref_info['context']:
            return ref_info['context']

    return None


def rename_file(old_path, new_path, dry_run=False):
    """Rename a file safely"""
    try:
        if os.path.exists(new_path):
            print(f"  ⚠️  Destination already exists, skipping")
            return False

        if not dry_run:
            shutil.move(old_path, new_path)

        return True
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def main():
    """Main function"""

    if len(sys.argv) < 2:
        print("Usage: python rename_generic_files.py <path_to_telegram_export>")
        print("\nExample:")
        print('  python rename_generic_files.py "C:\\Users\\User\\Downloads\\Telegram Desktop\\ChatExport_2026-07-11"')
        sys.exit(1)

    export_path = sys.argv[1]

    if not os.path.exists(export_path):
        print(f"❌ Export path not found: {export_path}")
        sys.exit(1)

    voice_messages_path = os.path.join(export_path, 'voice_messages')

    print("=" * 80)
    print("TELEGRAM EXPORT - GENERIC FILE RENAMING TOOL")
    print("=" * 80)
    print()

    # Step 1: Extract file context from messages
    print("📖 Extracting file references from messages...")
    file_refs = extract_file_context(export_path)
    print(f"   Found {len(file_refs)} file references")
    print()

    # Step 2: Find generic files
    print("🔍 Finding generic auto-generated files...")
    generic_files = find_generic_files(voice_messages_path)
    print(f"   Found {len(generic_files)} generic files")
    print()

    if not generic_files:
        print("✅ No generic files found. All files are already well-named!")
        return

    # Step 3: Display renaming suggestions
    print("📝 RENAMING SUGGESTIONS:")
    print("-" * 80)
    print()

    renames = {}
    for i, generic_file in enumerate(generic_files, 1):
        old_path = os.path.join(voice_messages_path, generic_file)

        # Check if file is referenced in messages
        suggested_name = None
        for ref_file in file_refs:
            # Try simple matching
            if ref_file in generic_file or generic_file in ref_file:
                suggested_name = ref_file
                break

        # If no direct match, use the context file name
        if not suggested_name and file_refs:
            for ref_file, ref_info in file_refs.items():
                if ref_info['context'] and 'audio' in ref_info.get('sender', '').lower():
                    suggested_name = ref_info['context']
                    break

        if suggested_name:
            new_path = os.path.join(voice_messages_path, suggested_name)
            renames[generic_file] = suggested_name

            print(f"{i}. {generic_file}")
            print(f"   → {suggested_name}")
            print()

    if not renames:
        print("⚠️  Could not determine suggested names from message context")
        print("Please refer to FILE_ORGANIZATION_REPORT.md for manual renaming suggestions")
        return

    # Step 4: Ask for confirmation
    print("-" * 80)
    print(f"\n✅ Ready to rename {len(renames)} files")
    print("\nRecommended approach:")
    print("1. Review the suggestions above carefully")
    print("2. Manually rename files in your file explorer")
    print("3. Or run this script with --execute flag to auto-rename")
    print("\nNote: Please back up your files before running automatic rename!")

    if '--execute' in sys.argv:
        print("\n🚀 Starting automatic rename...")
        print()

        for generic_file, new_name in renames.items():
            old_path = os.path.join(voice_messages_path, generic_file)
            new_path = os.path.join(voice_messages_path, new_name)

            print(f"Renaming: {generic_file}")
            if rename_file(old_path, new_path, dry_run=False):
                print(f"✅ Successfully renamed to: {new_name}")
            print()

        print("=" * 80)
        print("✅ Renaming complete!")
        print("=" * 80)
    else:
        print("\n💡 To execute the renaming, run:")
        print("   python rename_generic_files.py <path> --execute")


if __name__ == '__main__':
    main()
