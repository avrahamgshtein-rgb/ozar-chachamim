#!/usr/bin/env python3
"""
Improved Wikipedia Validation Script for אוצר חכמים
Uses clean names and searches both Hebrew + English Wikipedia
"""

import json
import re
import sys
import time
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

import requests
from supabase import create_client

# Load Supabase config
with open('config.js', encoding='utf-8') as f:
    content = f.read()
    import re as regex_module
    url = regex_module.search(r'url:\s*["\']([^"\']+)', content).group(1)
    key = regex_module.search(r'anonKey:\s*["\']([^"\']+)', content).group(1)

supabase = create_client(url, key)
session = requests.Session()
session.headers.update({'User-Agent': 'Ozar-Chachamim-Validator/1.0'})


class ImprovedWikipediaValidator:
    def __init__(self):
        self.results = {
            'found_he': [],
            'found_en': [],
            'not_found': [],
            'error': []
        }
        self.total = 0
        self.processed = 0

    def clean_name(self, name):
        """Extract clean sage name from Supabase format"""
        if not name:
            return None
        # Remove everything after ' — ' or ' – '
        parts = re.split(r'\s*[—–]\s*', name)
        clean = parts[0].strip()
        # Remove parentheses content
        clean = re.sub(r'\s*\([^)]*\)', '', clean)
        return clean if clean else None

    def search_wikipedia(self, name, lang='he'):
        """Search Wikipedia with detailed fallbacks"""
        if not name:
            return None

        try:
            # Try exact name first
            url = f"https://{lang}.wikipedia.org/w/api.php"
            params = {
                'action': 'query',
                'list': 'search',
                'srsearch': name,
                'format': 'json'
            }

            response = session.get(url, params=params, timeout=5)
            data = response.json()

            if data.get('query', {}).get('search'):
                return data['query']['search'][0]['title']

            # Try shorter name (remove "בעל" or "הרב" prefix)
            if lang == 'he':
                short_name = re.sub(r'^(בעל|הרב|רבי|ר\'|רב)\s+', '', name).strip()
                if short_name and short_name != name:
                    params['srsearch'] = short_name
                    response = session.get(url, params=params, timeout=5)
                    data = response.json()
                    if data.get('query', {}).get('search'):
                        return data['query']['search'][0]['title']

            return None
        except:
            return None

    def get_wikipedia_page(self, title, lang='he'):
        """Get Wikipedia page content"""
        try:
            url = f"https://{lang}.wikipedia.org/w/api.php"
            params = {
                'action': 'query',
                'titles': title,
                'prop': 'extracts',
                'explaintext': True,
                'format': 'json'
            }

            response = session.get(url, params=params, timeout=5)
            data = response.json()

            pages = data.get('query', {}).get('pages', {})
            if pages:
                page = list(pages.values())[0]
                return page.get('extract', '')

            return None
        except:
            return None

    def extract_info(self, text):
        """Extract key information from Wikipedia text"""
        info = {
            'birth': None,
            'death': None,
            'locations': [],
            'works': []
        }

        if not text:
            return info

        # Dates
        date_pattern = r'(\d{3,4})\s*(?:CE|BCE|BC|AD|לפנ"ס|לס"נ|לספ"נ)?'
        dates = re.findall(date_pattern, text[:500])
        if len(dates) >= 2:
            info['birth'] = dates[0]
            info['death'] = dates[1] if len(dates) > 1 else None
        elif dates:
            info['birth'] = dates[0]

        # Locations
        locations_to_find = [
            'Jerusalem', 'ירושלים',
            'Egypt', 'מצרים',
            'Spain', 'ספרד',
            'Germany', 'גרמניה',
            'France', 'צרפת',
            'Poland', 'פולין',
            'Babylon', 'בבל'
        ]
        for loc in locations_to_find:
            if loc in text[:1000]:
                info['locations'].append(loc)

        return info

    def validate_all(self):
        """Validate all sages"""
        print("\n" + "="*70)
        print("🔍 WIKIPEDIA VALIDATION - אוצר חכמים (IMPROVED)")
        print("="*70 + "\n")

        # Fetch sages with clean names
        response = supabase.table('sages').select('id,name_he,name_en,era,region').execute()
        sages = response.data
        self.total = len(sages)

        print(f"📊 Validating {self.total} sages...\n")

        for i, sage in enumerate(sages, 1):
            self.processed = i

            # Get clean name
            clean_name_he = self.clean_name(sage.get('name_he', ''))
            clean_name_en = self.clean_name(sage.get('name_en', ''))

            if not clean_name_he and not clean_name_en:
                self.results['error'].append({'id': sage['id'], 'reason': 'No name'})
                continue

            display_name = (clean_name_he or clean_name_en or '')[:40]
            print(f"\r[{i:3d}/{self.total}] {display_name:40s}", end='', flush=True)

            # Search Hebrew Wikipedia
            wiki_title_he = self.search_wikipedia(clean_name_he, 'he') if clean_name_he else None

            # Search English Wikipedia
            wiki_title_en = self.search_wikipedia(clean_name_en, 'en') if clean_name_en and not wiki_title_he else None

            if not wiki_title_he and not wiki_title_en:
                self.results['not_found'].append({
                    'id': sage['id'],
                    'he_name': clean_name_he,
                    'en_name': clean_name_en
                })
                continue

            # Get content
            wiki_content = None
            lang_found = None

            if wiki_title_he:
                wiki_content = self.get_wikipedia_page(wiki_title_he, 'he')
                lang_found = 'Hebrew'

            if not wiki_content and wiki_title_en:
                wiki_content = self.get_wikipedia_page(wiki_title_en, 'en')
                lang_found = 'English'

            if not wiki_content:
                self.results['error'].append({
                    'id': sage['id'],
                    'name': clean_name_he or clean_name_en,
                    'reason': 'Could not read content'
                })
                continue

            # Extract info
            info = self.extract_info(wiki_content)

            # Record
            result = {
                'id': sage['id'],
                'name': clean_name_he or clean_name_en,
                'wiki_title': wiki_title_he or wiki_title_en,
                'language': lang_found,
                'info': info,
                'supabase': {
                    'era': sage.get('era'),
                    'region': sage.get('region')
                }
            }

            if lang_found == 'Hebrew':
                self.results['found_he'].append(result)
            else:
                self.results['found_en'].append(result)

            time.sleep(0.05)

        print("\n")
        return self.results

    def save_report(self):
        """Save validation report"""
        report = []
        report.append("\n" + "="*70)
        report.append("📊 WIKIPEDIA VALIDATION REPORT (IMPROVED)")
        report.append("="*70 + "\n")

        found_total = len(self.results['found_he']) + len(self.results['found_en'])

        report.append(f"✅ FOUND ON WIKIPEDIA:   {found_total}/{self.total}")
        report.append(f"   📝 Hebrew Wikipedia:    {len(self.results['found_he'])}")
        report.append(f"   🇬🇧 English Wikipedia:  {len(self.results['found_en'])}")
        report.append(f"❌ NOT FOUND:             {len(self.results['not_found'])}/{self.total}")
        report.append(f"⚡ ERRORS:                {len(self.results['error'])}/{self.total}")
        report.append("\n" + "-"*70 + "\n")

        # Sample of found sages
        if self.results['found_he']:
            report.append("📝 Found on Hebrew Wikipedia (Sample):\n")
            for item in self.results['found_he'][:10]:
                report.append(f"  ✅ {item['name']} (ID {item['id']})")
                report.append(f"     Wikipedia: {item['wiki_title']}")
                report.append(f"     Dates: {item['info']['birth']}-{item['info']['death']}")
                if item['info']['locations']:
                    report.append(f"     Locations: {', '.join(item['info']['locations'][:3])}")
                report.append("")

        if self.results['found_en']:
            report.append("🇬🇧 Found on English Wikipedia (Sample):\n")
            for item in self.results['found_en'][:5]:
                report.append(f"  ✅ {item['name']} (ID {item['id']})")
                report.append(f"     Wikipedia: {item['wiki_title']}")
                report.append("")

        # Not found sample
        if self.results['not_found']:
            report.append(f"\n❌ NOT FOUND on Wikipedia ({len(self.results['not_found'])} total):\n")
            for item in self.results['not_found'][:10]:
                name = item.get('he_name') or item.get('en_name')
                report.append(f"  • {name} (ID {item['id']})")
            if len(self.results['not_found']) > 10:
                report.append(f"\n  ... and {len(self.results['not_found']) - 10} more")

        report.append("\n" + "="*70)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("="*70 + "\n")

        # Print and save
        report_text = "\n".join(report)
        print(report_text)

        timestamp = datetime.now().strftime('%Y-%m-%d')

        # Text report
        with open(f'wikipedia-validation-{timestamp}.txt', 'w', encoding='utf-8') as f:
            f.write(report_text)

        # JSON results
        with open(f'wikipedia-validation-{timestamp}.json', 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)

        print(f"📄 Reports saved:")
        print(f"   • wikipedia-validation-{timestamp}.txt")
        print(f"   • wikipedia-validation-{timestamp}.json\n")

        return self.results


if __name__ == '__main__':
    try:
        validator = ImprovedWikipediaValidator()
        results = validator.validate_all()
        validator.save_report()

        found = len(results['found_he']) + len(results['found_en'])
        print("✅ Validation complete!")
        print(f"   Found: {found}/{validator.total}")
        print(f"   Not found: {len(results['not_found'])}/{validator.total}")
        print(f"   Errors: {len(results['error'])}/{validator.total}\n")

    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
