#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Teacher, student and family links between sages already on the roster, as two outside
catalogues state them: Sefaria's topic graph and Wikidata.

    python3 scripts/build_catalog_links.py [--report] [--cache DIR]

Writes nextjs-app/public/data-catalog-links.json (a supplement file, merged over data.json
on both paths like data-research-links.json) and, with --report, data/catalog_links_report.txt.

Which outside page is which sage is not decided here: it comes from the two files that
already match the roster to those catalogues by name and years (data-sefaria.json for the
Sefaria topic, data-wikipedia.json for the Wikidata item). An entry is used only while it
still carries the roster label it was matched on, so a drifted id links nobody.

Relations read (X is the page read, Y the other end, both on the roster):
  Sefaria   X taught Y / X learned-from Y              -> teacher
            X parent-of / child-of / grandparent-of / grandchild-of / ancestor-of /
            descendant-of / sibling-of / spouse-of / cousin-of / parent-in-law-of /
            child-in-law-of / sibling-in-law-of Y           -> family
            X opposed Y                                     -> oppose
            X corresponded-with Y                           -> colleague
  Wikidata  X student of (P1066) Y / X student (P802) Y  -> teacher
            father (P22), mother (P25), child (P40), sibling (P3373), spouse (P26),
            relative (P1038)                              -> family
            influenced by (P737)                          -> influence
Direction follows the site's convention: `teacher` source is the teacher, `family` source
is the elder relative (lineage.ts draws it above), `influence` source influenced target.

Checked like the spreadsheet's links in rebuild_data_from_csv.py, but never flipped, since a
catalogue states its direction outright, and only on exact dates (a century-precision sage's
birth_year is the start of a window, too loose to overrule a catalogue):
  - a book, topic or group at either end: dropped
  - teacher born after student, or parent after child, or the influenced born more than a
    generation before the influencer: dropped
  - teacher and student whose lifetimes never overlap, or born more than 90 years apart:
    kept as influence from the earlier to the later
  - the two catalogues, or a catalogue and the site, disagreeing on who taught whom: dropped
  - a link the site already states (same pair, same relation): not repeated
An influence link the site holds for a pair that gets a teacher or family link here stays
in its file; lib/dataFoundation.ts::mergeDatasets lets the stronger link stand for the pair.
"""
import argparse, hashlib, json, os, re, subprocess, sys, time, urllib.parse
from collections import defaultdict

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(REPO, 'nextjs-app', 'public')
OUT = os.path.join(PUBLIC, 'data-catalog-links.json')
REPORT = os.path.join(REPO, 'data', 'catalog_links_report.txt')
# The site's own links, which a catalogue link must not repeat or contradict.
SITE_FILES = ['data.json', 'data-ancient.json', 'data-supplement.json', 'data-supplement-2.json', 'data-research-links.json',
              'data-paper-links.json']
UA = 'OzarChachamim/1.0 (https://github.com/avrahamgshtein-rgb/ozar-chachamim; linking sages to each other)'
NOT_A_PERSON = {'נושא/מושג', 'נושא', 'ספר', 'חיבור', 'אירוע היסטורי', 'דמויות'}   # as in rebuild_data_from_csv.py
# Entries typed 'טקסט יסוד' are mostly people (Rav Sherira Gaon, Ben Sira); these two are books.
# data-sefaria.json matches מחזור ויטרי to the page of its author, R. Simchah of Vitry.
TEXTS = {'מחזור ויטרי', 'מדרש רבה'}
GENERATION = 25

ap = argparse.ArgumentParser()
ap.add_argument('--cache', default=os.path.join(os.environ.get('TMPDIR', '/tmp'), 'catalog-links-cache'))
ap.add_argument('--report', action='store_true')
ap.add_argument('--pause', type=float, default=3.0, help='seconds between uncached Wikidata requests')
args = ap.parse_args()
os.makedirs(args.cache, exist_ok=True)


def call(url, pause):
    """One GET, cached on disk, paced, Retry-After honoured. Parsed JSON or None."""
    f = os.path.join(args.cache, hashlib.sha1(url.encode()).hexdigest() + '.json')
    if os.path.exists(f):
        return json.load(open(f, encoding='utf-8'))
    for _ in range(10):
        time.sleep(pause)
        r = subprocess.run(['curl', '-s', '-m', '120', '-A', UA, '-D', '-', '--compressed', url], capture_output=True)
        head, _, body = r.stdout.partition(b'\r\n\r\n')
        while body.startswith(b'HTTP/'):
            head, _, body = body.partition(b'\r\n\r\n')
        status = head.split(b' ', 2)[1] if head.startswith(b'HTTP/') else b'0'
        if status == b'429':
            m = re.search(rb'(?i)retry-after:\s*(\d+)', head)
            time.sleep(int(m.group(1)) + 1 if m else 20)
            continue
        if status != b'200':
            print('HTTP', status.decode(), url[:140], file=sys.stderr)
            return None
        try:
            j = json.loads(body)
        except ValueError:
            return None
        json.dump(j, open(f, 'w', encoding='utf-8'), ensure_ascii=False)
        return j
    sys.exit(f'gave up (429): {url[:140]}')


def load(name):
    return json.load(open(os.path.join(PUBLIC, name), encoding='utf-8'))


roster = {n['id']: n for n in load('data.json')['nodes']}
label = {i: n['label'] for i, n in roster.items()}

# Which catalogue page is which sage: only entries still carrying their roster label.
drifted = []
slug_of, qid_of = {}, {}
for i, e in load('data-sefaria.json')['authors'].items():
    if label.get(i) != e.get('label'):
        drifted.append(f'data-sefaria.json {i}: "{e.get("label")}" vs roster "{label.get(i)}"')
    elif e.get('slug'):
        slug_of[i] = e['slug']
for i, e in load('data-wikipedia.json')['sages'].items():
    if label.get(i) != e.get('label'):
        drifted.append(f'data-wikipedia.json {i}: "{e.get("label")}" vs roster "{label.get(i)}"')
    elif e.get('qid'):
        qid_of[i] = e['qid']
if drifted:
    sys.exit('ids have drifted, regenerate the side files first:\n  ' + '\n  '.join(drifted))
id_of_slug = {s: i for i, s in slug_of.items()}
id_of_qid = {q: i for i, q in qid_of.items()}

# ---------- read the catalogues ----------
# A claim: (kind, a, b, relation, evidence), a/b already oriented to the site's convention.
claims = []

SEFARIA_TEACH = {'taught': 'ab', 'learned-from': 'ba'}            # a teaches b
SEFARIA_FAMILY = {                                                 # elder first; '' = symmetric
    'parent-of': 'ab', 'child-of': 'ba', 'grandparent-of': 'ab', 'grandchild-of': 'ba',
    'parent-in-law-of': 'ab', 'child-in-law-of': 'ba',
    'ancestor-of': 'ab', 'descendant-of': 'ba',
    'sibling-of': '', 'spouse-of': '', 'sibling-in-law-of': '', 'cousin-of': '',
}
SEFARIA_OTHER = {'opposed': ('oppose', 'ab'), 'corresponded-with': ('colleague', '')}
other_types = defaultdict(int)
for i, slug in sorted(slug_of.items(), key=lambda kv: int(kv[0]) if kv[0].isdigit() else 0):
    j = call(f'https://www.sefaria.org/api/topics/{urllib.parse.quote(slug)}?with_links=1', 0.3)
    for ltype, block in (j or {}).get('links', {}).items():
        for l in block.get('links', []):
            other = id_of_slug.get(l.get('topic'))
            if not other or other == i:
                continue
            ev = f'ספריא: {slug} {ltype} {l["topic"]}'
            if ltype in SEFARIA_TEACH:
                a, b = (i, other) if SEFARIA_TEACH[ltype] == 'ab' else (other, i)
                claims.append(('teacher', a, b, '', ev, 'sefaria'))
            elif ltype in SEFARIA_FAMILY:
                a, b = (i, other) if SEFARIA_FAMILY[ltype] != 'ba' else (other, i)
                claims.append(('family', a, b, ltype, ev, 'sefaria'))
            elif ltype in SEFARIA_OTHER:
                kind, d = SEFARIA_OTHER[ltype]
                a, b = (i, other) if d == 'ab' or i < other else (other, i)
                claims.append((kind, a, b, ltype, ev, 'sefaria'))
            else:
                other_types[ltype] += 1

WD = {  # property: (kind, direction, relation); 'ab' = the item is the source
    'P1066': ('teacher', 'ba', 'student of'), 'P802': ('teacher', 'ab', 'student'),
    'P22': ('family', 'ba', 'father'), 'P25': ('family', 'ba', 'mother'), 'P40': ('family', 'ab', 'child'),
    'P3373': ('family', '', 'sibling'), 'P26': ('family', '', 'spouse'), 'P1038': ('family', '', 'relative'),
    'P737': ('influence', 'ba', 'influenced by'),
}
qids = sorted(id_of_qid)
for k in range(0, len(qids), 20):
    j = call('https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode(
        {'action': 'wbgetentities', 'ids': '|'.join(qids[k:k + 20]), 'props': 'claims', 'format': 'json'}), args.pause)
    for q, ent in (j or {}).get('entities', {}).items():
        i = id_of_qid.get(q)
        for p, (kind, d, rel) in WD.items():
            for c in ent.get('claims', {}).get(p, []):
                v = c.get('mainsnak', {}).get('datavalue', {}).get('value')
                other = id_of_qid.get(v.get('id')) if isinstance(v, dict) else None
                if not other or other == i:
                    continue
                a, b = (other, i) if d == 'ba' else (i, other)
                claims.append((kind, a, b, rel, f'ויקינתונים: {q} {rel} ({p}) {v["id"]}', 'wikidata'))

# ---------- check them ----------
def year(i, k):
    return roster[i].get(k)

def dated(i):
    return year(i, 'birth_year') is not None and year(i, 'death_year') is not None

def exact(i):
    n = roster[i]
    return dated(i) and n.get('date_precision') == 'exact' and n['death_year'] - n['birth_year'] >= 20

site = []
for f in SITE_FILES:
    if os.path.exists(os.path.join(PUBLIC, f)):
        site += load(f).get('links', [])

def teach_pair(l):
    return (l['source'], l['target']) if l['type'] == 'teacher' else (l['target'], l['source'])

site_teach = {teach_pair(l) for l in site if l['type'] in ('teacher', 'student')}
site_family = {frozenset((l['source'], l['target'])) for l in site if l['type'] == 'family'}
site_any = {frozenset((l['source'], l['target'])) for l in site}

log = defaultdict(list)
def fmt(i):
    n = roster[i]
    y = f"{n['birth_year']}–{n['death_year']}" if dated(i) else 'ללא שנים'
    return f'{n["label"]} [{i}] ({y})'

# Merge claims that say the same thing, keeping every source's evidence.
merged = {}
for kind, a, b, rel, ev, via in claims:
    if kind == 'family' and not rel.startswith(('parent', 'child', 'grand', 'father', 'mother', 'ancestor', 'descendant')):
        # symmetric relations: elder first when both are dated, else the lower id
        if dated(a) and dated(b) and year(b, 'birth_year') < year(a, 'birth_year') or not (dated(a) and dated(b)) and b < a:
            a, b = b, a
    # family is symmetric; so is a mutual 'opposed' (Sefaria states it from both ends): one edge per pair
    key = (kind, a, b) if kind not in ('family', 'oppose') else (kind, *sorted((a, b)))
    m = merged.setdefault(key, {'type': kind, 'source': a, 'target': b, 'relation': set(), 'via': set(), 'evidence': []})
    if rel:
        m['relation'].add(rel)
    m['via'].add(via)
    if ev not in m['evidence']:
        m['evidence'].append(ev)

teach_claimed = {(m['source'], m['target']) for m in merged.values() if m['type'] == 'teacher'}
out = []
for m in sorted(merged.values(), key=lambda m: (m['type'], int(m['source']), int(m['target']))):
    a, b, kind = m['source'], m['target'], m['type']
    desc = f"{kind}: {fmt(a)} -> {fmt(b)}  [{'; '.join(m['evidence'])}]"
    if any(roster[x].get('chapter_type') in NOT_A_PERSON or label[x] in TEXTS for x in (a, b)):
        log['dropped: not a person'].append(desc); continue
    # Only exact dates can overrule a catalogue: a century-precision sage's birth_year is the
    # start of a window (the Rosh is stored as 1200–1400), not a year to compare.
    both = exact(a) and exact(b)
    gap = year(b, 'birth_year') - year(a, 'birth_year') if both else None
    if kind == 'teacher':
        if (b, a) in teach_claimed:
            log['dropped: the catalogues disagree on who taught whom'].append(desc); continue
        if (b, a) in site_teach:
            log['dropped: the site says the other taught'].append(desc); continue
        if (a, b) in site_teach:
            log['already on the site'].append(desc); continue
        if both and gap < 0:
            log['dropped: teacher born after student'].append(desc); continue
        no_overlap = both and year(a, 'death_year') < year(b, 'birth_year')
        if both and (no_overlap or gap > 90):
            why = 'שנות חייהם אינן חופפות' if no_overlap else f'{gap} שנים בין לידותיהם'
            if frozenset((a, b)) in site_any:
                log['already on the site (as influence; lifetimes rule out a teacher)'].append(desc); continue
            kind = 'influence'
            m['evidence'].insert(0, f'הורד מקשר רב–תלמיד: {why}; לכל היותר למד מספריו')
            log['added: influence (lifetimes rule out a teacher)'].append(desc)
    elif kind == 'family':
        if frozenset((a, b)) in site_family:
            log['already on the site'].append(desc); continue
        directional = any(r.startswith(('parent', 'child', 'grand', 'father', 'mother', 'ancestor', 'descendant')) for r in m['relation'])
        if directional and both and gap < 0:
            log['dropped: the elder relative born after the younger'].append(desc); continue
    elif kind in ('influence', 'oppose', 'colleague'):
        if frozenset((a, b)) in site_any:
            log['already on the site'].append(desc); continue
        if kind == 'influence' and both and gap < -GENERATION:
            log['dropped: influenced a generation before the influencer was born'].append(desc); continue
    entry = {'source': a, 'target': b, 'type': kind}
    if kind != 'teacher' and m['relation']:
        entry['relation'] = ', '.join(sorted(m['relation']))
    entry.update({
        'via': sorted(m['via']),
        'source_label': label[a], 'target_label': label[b],
        'evidence_source': ' | '.join(m['evidence']),
    })
    out.append(entry)
    if kind == m['type']:
        log[f'added: {kind}'].append(desc)

about = ('Generated by scripts/build_catalog_links.py from sefaria.org and wikidata.org: teacher, student and '
         'family links between sages on the roster, as those catalogues state them, checked against the sages\' '
         'years and against the links the site already holds. Never edit by hand; regenerate. source_label and '
         'target_label are the roster labels the ids carried when the file was built (tests fail when an id drifts).')
json.dump({'_about': about, 'nodes': [], 'links': out}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
open(OUT, 'a', encoding='utf-8').write('\n')

counts = defaultdict(int)
for e in out:
    counts[e['type']] += 1
print(f'claims read: {len(claims)} ({len(merged)} distinct); written: {len(out)} {dict(counts)}')
for k in sorted(log):
    print(f'  {k}: {len(log[k])}')
if other_types:
    print('Sefaria relations between roster sages not read:', dict(other_types))
if args.report:
    with open(REPORT, 'w', encoding='utf-8') as fh:
        fh.write('Catalogue links (scripts/build_catalog_links.py): every claim read from Sefaria and Wikidata between two\n'
                 'roster sages, and what became of it. Generated; do not edit.\n')
        for k in sorted(log):
            fh.write(f'\n== {k}: {len(log[k])} ==\n')
            for line in log[k]:
                fh.write(f'  {line}\n')
    print('report:', os.path.relpath(REPORT, REPO))
