#!/usr/bin/env python3
import os, sys, io, json, re
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def extract_text_from_docx(docx_path):
    try:
        with ZipFile(docx_path) as zip_ref:
            xml_content = zip_ref.read('word/document.xml')
            root = ET.fromstring(xml_content)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            texts = [elem.text for elem in root.findall('.//w:t', ns) if elem.text]
            return ''.join(texts)
    except:
        return None

def extract_sage_data(text, filename):
    if not text:
        return None

    lines = text.split('\n')
    title = lines[0][:200] if lines else filename

    year_pattern = r'(\d{3,4})\s*[-–]\s*(\d{3,4})'
    year_match = re.search(year_pattern, text[:500])
    birth_year = int(year_match.group(1)) if year_match else None
    death_year = int(year_match.group(2)) if year_match else None

    biography = text[:800].strip()

    works = []
    work_patterns = [
        r'(?:כתב|כתבו|יצר|חיבור|ספר|פרוש)[\s:]*([^,\n]+)',
    ]
    for pattern in work_patterns:
        matches = re.findall(pattern, text)
        works.extend([m.strip() for m in matches if 5 < len(m) < 150])

    return {
        'filename': filename,
        'title': title,
        'biography': biography,
        'birth_year': birth_year,
        'death_year': death_year,
        'major_works': list(set(works))[:5],
    }

data_dir = Path('C:/Users/User/Desktop/ozar-chachamim/data')
docx_files = list(data_dir.glob('*.docx'))
print(f"Found {len(docx_files)} Word documents\n")

results = []
for i, docx_path in enumerate(docx_files, 1):
    filename = docx_path.name
    text = extract_text_from_docx(docx_path)
    if text:
        data = extract_sage_data(text, filename)
        results.append(data)
        print(f"{i}. {filename[:50]}")
        if data['birth_year']:
            print(f"   Years: {data['birth_year']}-{data['death_year']}")

with open('word_extracted_data.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"\nExtracted from {len(results)}/{len(docx_files)} documents")
