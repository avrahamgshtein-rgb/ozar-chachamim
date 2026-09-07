#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Translate research documents to English and Russian using Claude API (batch mode).
Creates <sage-id>.en.json and <sage-id>.ru.json for each Hebrew research file.
"""
import json
import os
from pathlib import Path
from anthropic import Anthropic

def translate_research(hebrew_content: str, target_lang: str) -> str:
    """Translate research content to target language using Claude."""

    client = Anthropic()

    lang_name = "English" if target_lang == "en" else "Russian"

    prompt = f"""Translate the following Hebrew academic research text to {lang_name}.
Maintain all formatting, headers, and academic tone.
Keep proper names and transliterated terms consistent.

Hebrew text:
{hebrew_content}

Provide ONLY the translated text, no introduction or commentary."""

    message = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=4000,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    return message.content[0].text

def main():
    research_dir = Path("nextjs-app/public/research")

    # Get list of Hebrew research files (not .en or .ru)
    hebrew_files = sorted([
        f for f in research_dir.glob("*.json")
        if f.stem.isdigit() and not f.name.endswith((".en.json", ".ru.json"))
    ])

    print(f"Found {len(hebrew_files)} Hebrew research files")
    print(f"Will create .en.json and .ru.json for each\n")

    translated = 0
    skipped = 0

    for hebrew_file in hebrew_files:
        sage_id = hebrew_file.stem

        # Check if translations already exist
        en_file = research_dir / f"{sage_id}.en.json"
        ru_file = research_dir / f"{sage_id}.ru.json"

        if en_file.exists() and ru_file.exists():
            print(f"⏭️  {sage_id}: Already translated (skipped)")
            skipped += 1
            continue

        # Read Hebrew research
        try:
            with open(hebrew_file, 'r', encoding='utf-8') as f:
                hebrew_data = json.load(f)
        except Exception as e:
            print(f"❌ {sage_id}: Error reading Hebrew file: {e}")
            continue

        # Translate to English and Russian
        for target_lang, output_file in [("en", en_file), ("ru", ru_file)]:
            if output_file.exists():
                print(f"⏭️  {sage_id}.{target_lang}: Already exists (skipped)")
                continue

            try:
                print(f"🔄 {sage_id}.{target_lang}: Translating...", end=" ")

                # Translate each research item
                translated_items = []
                for item in hebrew_data:
                    translated_content = translate_research(item['content'], target_lang)

                    translated_item = {
                        'title': item.get('title', ''),
                        'source_file': item.get('source_file', ''),
                        'word_count': item.get('word_count', 0),
                        'content': translated_content,
                    }
                    translated_items.append(translated_item)

                # Write translation file
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(translated_items, f, ensure_ascii=False, indent=2)

                print("✅")
                translated += 1

            except Exception as e:
                print(f"❌ Error: {e}")
                continue

    print(f"\n📊 Summary:")
    print(f"  Translated: {translated}")
    print(f"  Skipped: {skipped}")
    print(f"  Total research files: {len(hebrew_files)}")

if __name__ == '__main__':
    main()
