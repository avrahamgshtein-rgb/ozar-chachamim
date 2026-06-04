#!/usr/bin/env python3
"""
Wikipedia Validation Script for אוצר חכמים
Validates sage data against Wikipedia sources (Hebrew + English)
"""

import json
import re
import sys
import time
from datetime import datetime
from collections import defaultdict

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

# Session for Wikipedia requests
session = requests.Session()
session.headers.update({'User-Agent': 'Ozar-Chachamim-Validator/1.0'})


class WikipediaValidator:
    def __init__(self):
        self.results = {
            'correct': [],
            'minor_diff': [],
            'missing_data': [],
            'wrong_data': [],
            'not_found': [],
            'error': []
        }
        self.total = 0
        self.processed = 0

    def search_wikipedia(self, name, lang='he'):
        """Search Wikipedia in Hebrew or English"""
        try:
            # Clean up name
            query = name.split(' — ')[0].strip()

            url = f"https://{lang}.wikipedia.org/w/api.php"
            params = {
                'action': 'query',
                'list': 'search',
                'srsearch': query,
                'format': 'json'
            }

            response = session.get(url, params=params, timeout=5)
            data = response.json()

            if data.get('query', {}).get('search'):
                return data['query']['search'][0]['title']

            return None
        except Exception as e:
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

            # Get first (only) page
            pages = data.get('query', {}).get('pages', {})
            if pages:
                page = list(pages.values())[0]
                return page.get('extract', '')

            return None
        except Exception as e:
            return None

    def extract_dates(self, text):
        """Extract birth and death dates from Wikipedia text"""
        dates = {'birth': None, 'death': None}

        if not text:
            return dates

        # Hebrew patterns
        birth_he = re.search(r'נולד.*?(\d{3,4})\s*(?:לפנ"ס|לס"נ|לספ"נ)?', text)
        death_he = re.search(r'(?:מת|נפטר).*?(\d{3,4})\s*(?:לפנ"ס|לס"נ|לספ"נ)?', text)

        # English patterns
        if not birth_he:
            birth_en = re.search(r'born\s+(?:on\s+)?(?:\w+\s+)*(\d{1,2})?\s+(\w+)?\s+(\d{3,4})', text)
            if birth_en:
                dates['birth'] = birth_en.group(3)
        else:
            dates['birth'] = birth_he.group(1)

        if not death_he:
            death_en = re.search(r'died\s+(?:on\s+)?(?:\w+\s+)*(\d{1,2})?\s+(\w+)?\s+(\d{3,4})', text)
            if death_en:
                dates['death'] = death_en.group(3)
        else:
            dates['death'] = death_he.group(1)

        return dates

    def extract_locations(self, text):
        """Extract location mentions"""
        locations = set()

        if not text:
            return list(locations)

        # Common location mentions
        location_words = [
            'Jerusalem', 'ירושלים',
            'Egypt', 'מצרים', 'Alexandria', 'אלכסנדריה',
            'Spain', 'ספרד', 'Toledo', 'טולדו',
            'Germany', 'גרמניה', 'Ashkenaz', 'אשכנז',
            'France', 'צרפת',
            'Poland', 'פולין',
            'Babylon', 'בבל',
            'Safed', 'צפת',
            'Israel', 'ישראל',
            'Rome', 'רומא',
            'Greece', 'יוון'
        ]

        for loc in location_words:
            if loc in text:
                locations.add(loc)

        return list(locations)

    def extract_works(self, text):
        """Extract major works"""
        works = set()

        if not text:
            return list(works)

        # Patterns for works: "wrote X", "authored Y", "composed Z"
        patterns = [
            r'wrote\s+(?:the\s+)?["\']?([^".;]+)["\']?',
            r'authored\s+(?:the\s+)?["\']?([^".;]+)["\']?',
            r'composed\s+(?:the\s+)?["\']?([^".;]+)["\']?',
            r'published\s+(?:the\s+)?["\']?([^".;]+)["\']?',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                work = match.strip()
                if len(work) > 5 and len(work) < 200:
                    works.add(work)

        return list(works)[:5]  # Limit to 5 works

    def compare_data(self, sage, wiki_data):
        """Compare Supabase data with Wikipedia data"""
        issues = {
            'correct': 0,
            'minor_diff': [],
            'missing': [],
            'conflicts': []
        }

        # Check dates
        if wiki_data['birth']:
            if sage.get('years_range'):
                if wiki_data['birth'] in str(sage['years_range']):
                    issues['correct'] += 1
                else:
                    issues['conflicts'].append(
                        f"Birth year: DB has {sage['years_range']}, Wiki says {wiki_data['birth']}"
                    )

        # Check locations
        if wiki_data['locations']:
            sage_region = (sage.get('region') or '').lower()
            wiki_locs = [l.lower() for l in wiki_data['locations']]

            if any(wl in sage_region or sage_region in wl for wl in wiki_locs):
                issues['correct'] += 1
            elif wiki_data['locations']:
                issues['missing'].append(
                    f"Location: DB has {sage_region}, Wiki mentions {', '.join(wiki_data['locations'][:3])}"
                )

        # Check era
        if sage.get('era'):
            issues['correct'] += 1

        return issues

    def validate_all(self):
        """Validate all sages"""
        print("\n" + "="*70)
        print("🔍 WIKIPEDIA VALIDATION - אוצר חכמים")
        print("="*70 + "\n")

        # Fetch all sages
        response = supabase.table('sages').select('id,name_he,name_en,era,region,years_range').execute()
        sages = response.data
        self.total = len(sages)

        print(f"📊 Validating {self.total} sages...\n")

        for i, sage in enumerate(sages, 1):
            self.processed = i
            status = f"[{i:3d}/{self.total}]"

            # Try Hebrew name first, then English
            name = sage.get('name_he', '').split(' — ')[0].strip() or sage.get('name_en', '').strip()

            if not name:
                self.results['error'].append({'id': sage['id'], 'reason': 'No name found'})
                continue

            print(f"\r{status} Checking {name[:40]:40s}", end='', flush=True)

            # Search Wikipedia (try Hebrew first, then English)
            wiki_title = self.search_wikipedia(sage.get('name_he', ''), 'he')
            if not wiki_title:
                wiki_title = self.search_wikipedia(name, 'en')

            if not wiki_title:
                self.results['not_found'].append({
                    'id': sage['id'],
                    'name': name,
                    'reason': 'Not found on Wikipedia'
                })
                continue

            # Get Wikipedia page
            wiki_content = self.get_wikipedia_page(wiki_title, 'he')
            if not wiki_content:
                wiki_content = self.get_wikipedia_page(wiki_title, 'en')

            if not wiki_content:
                self.results['error'].append({
                    'id': sage['id'],
                    'name': name,
                    'reason': f'Could not read: {wiki_title}'
                })
                continue

            # Extract data from Wikipedia
            wiki_data = {
                'title': wiki_title,
                'birth': self.extract_dates(wiki_content)['birth'],
                'death': self.extract_dates(wiki_content)['death'],
                'locations': self.extract_locations(wiki_content),
                'works': self.extract_works(wiki_content)
            }

            # Compare
            comparison = self.compare_data(sage, wiki_data)

            if comparison['conflicts']:
                self.results['wrong_data'].append({
                    'id': sage['id'],
                    'name': name,
                    'supabase': {
                        'era': sage.get('era'),
                        'region': sage.get('region'),
                        'years': sage.get('years_range')
                    },
                    'wikipedia': wiki_data,
                    'issues': comparison['conflicts']
                })
            elif comparison['missing']:
                self.results['missing_data'].append({
                    'id': sage['id'],
                    'name': name,
                    'missing': comparison['missing'],
                    'wiki_data': wiki_data
                })
            elif wiki_data['locations'] or wiki_data['birth']:
                self.results['correct'].append({
                    'id': sage['id'],
                    'name': name
                })
            else:
                self.results['minor_diff'].append({
                    'id': sage['id'],
                    'name': name,
                    'reason': 'Limited data available'
                })

            # Rate limiting
            time.sleep(0.1)

        print("\n")
        return self.results

    def generate_report(self):
        """Generate validation report"""
        report = []
        report.append("\n" + "="*70)
        report.append("📊 WIKIPEDIA VALIDATION REPORT")
        report.append("="*70 + "\n")

        # Summary
        total = (
            len(self.results['correct']) +
            len(self.results['minor_diff']) +
            len(self.results['missing_data']) +
            len(self.results['wrong_data']) +
            len(self.results['not_found']) +
            len(self.results['error'])
        )

        report.append(f"✅ CORRECT DATA:     {len(self.results['correct']):3d}/{self.total}")
        report.append(f"⚠️  MINOR DIFF:      {len(self.results['minor_diff']):3d}/{self.total}")
        report.append(f"📝 MISSING DATA:     {len(self.results['missing_data']):3d}/{self.total}")
        report.append(f"❌ WRONG DATA:       {len(self.results['wrong_data']):3d}/{self.total}")
        report.append(f"🔲 NOT FOUND:        {len(self.results['not_found']):3d}/{self.total}")
        report.append(f"⚡ ERRORS:           {len(self.results['error']):3d}/{self.total}")
        report.append("\n" + "-"*70 + "\n")

        # Wrong data (high priority)
        if self.results['wrong_data']:
            report.append("❌ WRONG DATA (Conflicts with Wikipedia):\n")
            for item in self.results['wrong_data'][:10]:
                report.append(f"  ID {item['id']}: {item['name']}")
                for issue in item['issues']:
                    report.append(f"    ⚠️  {issue}")
                report.append("")
            if len(self.results['wrong_data']) > 10:
                report.append(f"  ... and {len(self.results['wrong_data']) - 10} more\n")

        # Missing data (can improve)
        if self.results['missing_data']:
            report.append("\n📝 MISSING DATA (Can add from Wikipedia):\n")
            for item in self.results['missing_data'][:5]:
                report.append(f"  ID {item['id']}: {item['name']}")
                for missing in item['missing']:
                    report.append(f"    • {missing}")
                report.append("")

        # Not found
        if self.results['not_found']:
            report.append(f"\n🔲 NOT FOUND ON WIKIPEDIA: {len(self.results['not_found'])} sages")
            for item in self.results['not_found'][:5]:
                report.append(f"  • {item['name']} (ID {item['id']})")
            if len(self.results['not_found']) > 5:
                report.append(f"  ... and {len(self.results['not_found']) - 5} more")

        report.append("\n" + "="*70)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("="*70 + "\n")

        return "\n".join(report)

    def save_report(self):
        """Save report to file"""
        report = self.generate_report()
        timestamp = datetime.now().strftime('%Y-%m-%d')
        filename = f'wikipedia-validation-{timestamp}.txt'

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(report)

        print(report)
        print(f"📄 Report saved: {filename}\n")

        # Also save detailed JSON
        json_filename = f'wikipedia-validation-{timestamp}.json'
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)
        print(f"📊 Detailed results: {json_filename}\n")


# Run validation
if __name__ == '__main__':
    validator = WikipediaValidator()

    try:
        results = validator.validate_all()
        validator.save_report()

        # Summary
        print("\n✅ Validation complete!")
        print(f"   Correct: {len(results['correct'])}")
        print(f"   Missing data: {len(results['missing_data'])}")
        print(f"   Wrong data: {len(results['wrong_data'])}")
        print(f"   Not found: {len(results['not_found'])}\n")

    except KeyboardInterrupt:
        print("\n\n⚠️  Validation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
