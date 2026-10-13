#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teacher and family links that the research papers state, between a paper's own sage and another
sage on the roster.

    python3 scripts/build_paper_links.py [--report] [--check]

Input: data/links-from-research.json, a reviewed list of
    {paper, a, b, a_label, b_label, type: teacher|family, relation?, quote}
read from public/research/<paper>.json: `teacher` means a taught b in person (not through his
books); `family` names a's role towards b (father, grandfather, father-in-law, uncle, ancestor,
brother, husband, cousin …), the elder first for the vertical ones. Only what the paper itself
states for its own sage was recorded; a relation it doubts, calls a legend, or gives for someone
else was left out. The labels are the roster labels the ids carried when the papers were read.

Output: nextjs-app/public/data-paper-links.json (a supplement merged over data.json on both paths)
and, with --report, data/paper_links_report.txt. An entry is kept only while
  - its quote is still found in the paper, and the paper's sage is one of its ends
  - both ids still carry the labels it was read under (ids drift, names do not)
  - its dates allow it, on exact dates only, as in build_catalog_links.py: a teacher born after
    his student or a parent after his child is dropped; a teacher and student whose lifetimes
    never overlap, or born more than 90 years apart, is dropped (a paper that says so is wrong
    about one of them, or means his books)
  - no other link file, or another paper, says the reverse of who taught whom
  - the same relation is not already on the site (data.json, the supplements, the catalogue
    links); two papers stating the same relation give one link with both quotes
--check exits non-zero when the data file is not what the input builds.
"""
import json, os, sys
from collections import defaultdict

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(REPO, 'nextjs-app', 'public')
SRC = os.path.join(REPO, 'data', 'links-from-research.json')
OUT = os.path.join(PUBLIC, 'data-paper-links.json')
REPORT = os.path.join(REPO, 'data', 'paper_links_report.txt')
SITE_FILES = ['data.json', 'data-ancient.json', 'data-supplement.json', 'data-supplement-2.json',
              'data-research-links.json', 'data-catalog-links.json']
VERTICAL = {'father', 'mother', 'grandfather', 'grandmother', 'father-in-law', 'mother-in-law', 'uncle', 'aunt', 'ancestor'}
FAMILY = VERTICAL | {'brother', 'sister', 'husband', 'wife', 'cousin', 'brother-in-law', 'sister-in-law', 'relative'}


def load(name):
    return json.load(open(os.path.join(PUBLIC, name), encoding='utf-8'))


def norm(s):
    return ' '.join(s.replace('״', '"').replace('׳', "'").split())


roster = {n['id']: n for n in load('data.json')['nodes']}
label = {i: n['label'] for i, n in roster.items()}


def exact(i):
    n = roster[i]
    return (n.get('date_precision') == 'exact' and n.get('birth_year') is not None
            and n.get('death_year') is not None and n['death_year'] - n['birth_year'] >= 20)


def fmt(i):
    n = roster.get(i, {})
    y = f"{n.get('birth_year')}–{n.get('death_year')}" if n.get('birth_year') is not None else 'ללא שנים'
    return f'{label.get(i, "?")} [{i}] ({y})'


papers = {}
def paper_text(pid):
    if pid not in papers:
        p = os.path.join(PUBLIC, 'research', f'{pid}.json')
        papers[pid] = norm(' '.join(d.get('content', '') for d in json.load(open(p, encoding='utf-8')))) if os.path.exists(p) else ''
    return papers[pid]


site = []
for f in SITE_FILES:
    if os.path.exists(os.path.join(PUBLIC, f)):
        site += load(f).get('links', [])
lesson = lambda l: (l['source'], l['target']) if l['type'] == 'teacher' else (l['target'], l['source'])
site_teach = {lesson(l) for l in site if l['type'] in ('teacher', 'student')}
site_family = {frozenset((l['source'], l['target'])) for l in site if l['type'] == 'family'}

entries = json.load(open(SRC, encoding='utf-8'))
log = defaultdict(list)
merged = {}
for e in entries:
    a, b, kind, pid = str(e['a']), str(e['b']), e['type'], str(e['paper'])
    rel = e.get('relation', '')
    desc = f"{kind}{' ' + rel if rel else ''}: {fmt(a)} -> {fmt(b)}  [מחקר {pid}: {e['quote'][:120]}]"
    why = None
    if a not in roster or b not in roster or pid not in roster:
        why = 'not on the roster'
    elif label[a] != e.get('a_label') or label[b] != e.get('b_label'):
        why = 'an id now belongs to someone else (re-read the paper)'
    elif pid not in (a, b) or a == b:
        why = "not the paper's own sage"
    elif kind not in ('teacher', 'family') or kind == 'family' and rel not in FAMILY:
        why = f'unknown relation {kind} {rel}'
    elif norm(e['quote']) not in paper_text(pid):
        why = 'quote not found in the paper'
    if why:
        log[f'dropped: {why}'].append(desc)
        continue
    both = exact(a) and exact(b)
    gap = roster[b]['birth_year'] - roster[a]['birth_year'] if both else None
    if kind == 'teacher' and both:
        if gap < 0:
            log['dropped: teacher born after student'].append(desc); continue
        if roster[a]['death_year'] < roster[b]['birth_year'] or gap > 90:
            log['dropped: lifetimes rule out a teacher'].append(desc); continue
    if kind == 'family' and rel in VERTICAL and both and gap < 0:
        log['dropped: the elder relative born after the younger'].append(desc); continue
    key = (kind, a, b) if kind == 'teacher' or rel in VERTICAL else (kind, *sorted((a, b)))
    m = merged.setdefault(key, {'type': kind, 'source': key[1], 'target': key[2], 'relation': set(), 'quotes': []})
    if rel:
        m['relation'].add(rel)
    m['quotes'].append((pid, e['quote'], desc))

teach_here = {(m['source'], m['target']) for m in merged.values() if m['type'] == 'teacher'}
out = []
for m in sorted(merged.values(), key=lambda m: (m['type'], int(m['source']), int(m['target']))):
    a, b, kind = m['source'], m['target'], m['type']
    desc = m['quotes'][0][2]
    if kind == 'teacher':
        if (b, a) in teach_here:
            log['dropped: the papers disagree on who taught whom'].append(desc); continue
        if (b, a) in site_teach:
            log['dropped: the site says the other taught'].append(desc); continue
        if (a, b) in site_teach:
            log['already on the site'].append(desc); continue
    elif frozenset((a, b)) in site_family:
        log['already on the site'].append(desc); continue
    entry = {'source': a, 'target': b, 'type': kind}
    if m['relation']:
        entry['relation'] = ', '.join(sorted(m['relation']))
    entry.update({
        'source_label': label[a], 'target_label': label[b],
        'quotes': [{'paper': pid, 'quote': q} for pid, q, _ in m['quotes']],
        'evidence_source': ' | '.join(f'מחקר {pid}: {q}' for pid, q, _ in m['quotes']),
    })
    out.append(entry)
    log[f'added: {kind}'].append(desc)

about = ('Generated by scripts/build_paper_links.py from data/links-from-research.json: teacher and family links '
         'the research papers state between their own sage and another sage on the roster, each with the paper\'s '
         'words. Never edit by hand; regenerate. source_label and target_label are the roster labels the ids '
         'carried when the papers were read (tests fail when an id drifts).')
data = {'_about': about, 'nodes': [], 'links': out}
if '--check' in sys.argv:
    same = os.path.exists(OUT) and json.load(open(OUT, encoding='utf-8')) == data
    print(f'{len(out)} links; data file {"up to date" if same else "STALE"}')
    sys.exit(0 if same else 1)
json.dump(data, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
open(OUT, 'a', encoding='utf-8').write('\n')

counts = defaultdict(int)
for e in out:
    counts[e['type']] += 1
print(f'entries read: {len(entries)}; written: {len(out)} {dict(counts)}')
for k in sorted(log):
    print(f'  {k}: {len(log[k])}')
if '--report' in sys.argv:
    with open(REPORT, 'w', encoding='utf-8') as fh:
        fh.write('Links from the research papers (scripts/build_paper_links.py): every relation read from the papers\n'
                 'and what became of it. Generated; do not edit.\n')
        for k in sorted(log):
            fh.write(f'\n== {k}: {len(log[k])} ==\n')
            for line in log[k]:
                fh.write(f'  {line}\n')
    print('report:', os.path.relpath(REPORT, REPO))
