#!/usr/bin/env python3
"""Build nextjs-app/public/data-yahrzeit.json: each sage's Hebrew date of death, as his own research paper states it.

Input: data/yahrzeit-from-research.json, a reviewed list of {id, day, month, quote}: the day and month of the
sage's death and the paper's own words giving it (read from public/research/<id>.json; a paper's dates for
someone else, an event, or two dates that disagree were left out). This script keeps only entries whose
quote is still found in the paper and whose month is one Intl names, and stores the roster label each was
read for, so tests/today.test.ts fails when an id now belongs to another sage.

Usage: python3 scripts/build_yahrzeit.py [--check]
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, 'nextjs-app')
MONTHS = {'Tishri', 'Heshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar I', 'Adar', 'Adar II', 'Nisan', 'Iyar', 'Sivan', 'Tamuz', 'Av', 'Elul'}


def roster_labels():
    labels = {}
    for name in ['data.json', 'data-supplement.json', 'data-supplement-2.json', 'data-ancient.json']:
        p = os.path.join(APP, 'public', name)
        if os.path.exists(p):
            for n in json.load(open(p, encoding='utf-8')).get('nodes', []):
                labels.setdefault(str(n['id']), n['label'])
    return labels


def norm(s):
    return ' '.join(s.replace('״', '"').replace('׳', "'").split())


def main():
    entries = json.load(open(os.path.join(ROOT, 'data', 'yahrzeit-from-research.json'), encoding='utf-8'))
    labels = roster_labels()
    out, dropped = {}, []
    for e in entries:
        sid = str(e['id'])
        if not e.get('day'):
            continue
        paper = os.path.join(APP, 'public', 'research', f'{sid}.json')
        text = norm(' '.join(d.get('content', '') for d in json.load(open(paper, encoding='utf-8')))) if os.path.exists(paper) else ''
        why = None
        if sid not in labels: why = 'not in the roster'
        elif e['month'] not in MONTHS: why = f"month {e['month']!r}"
        elif not 1 <= int(e['day']) <= 30: why = f"day {e['day']}"
        elif norm(e['quote']) not in text: why = 'quote not found in the paper'
        if why:
            dropped.append((sid, why))
            continue
        out[sid] = {'label': labels[sid], 'day': int(e['day']), 'month': e['month'], 'quote': e['quote']}
    out = dict(sorted(out.items(), key=lambda kv: int(kv[0])))
    for sid, why in dropped:
        print(f'dropped {sid}: {why}', file=sys.stderr)
    target = os.path.join(APP, 'public', 'data-yahrzeit.json')
    if '--check' in sys.argv:
        same = json.load(open(target, encoding='utf-8')) == out
        print(f'{len(out)} dates; data file {"up to date" if same else "STALE"}')
        sys.exit(0 if same else 1)
    json.dump(out, open(target, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'wrote {len(out)} dates, dropped {len(dropped)}')


if __name__ == '__main__':
    main()
