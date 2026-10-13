# Manager check of every translated research file against its Hebrew base:
#   same number of documents and keys, same number of lines, citation markers equal line by line,
#   every number of a Hebrew line present, no leftover Hebrew prose, right script, sane length ratio.
import sys, os, re, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tx_lib import *
CITE = re.compile(r'\[(?:cite:\s*)?\d{1,3}(?:\s*[-–,]\s*\d{1,3})*\]')
ids = sys.argv[1:] or sorted({os.path.basename(p).split('.')[0] for p in glob.glob(f'{RES}/*.en.json') + glob.glob(f'{RES}/*.ru.json')}, key=lambda s: (len(s), s))
bad = 0
for sid in ids:
    he = load_he(sid)
    for lang in ('en', 'ru'):
        p = f'{RES}/{sid}.{lang}.json'
        if not os.path.exists(p):
            continue
        problems = []
        try:
            tr = json.load(open(p, encoding='utf-8'))
        except Exception as e:
            print(f'{sid}.{lang}: INVALID JSON {e}'); bad += 1; continue
        if not isinstance(tr, list) or len(tr) != len(he):
            problems.append(f'{len(tr) if isinstance(tr, list) else "?"} docs vs {len(he)}')
        else:
            for k, (h, t) in enumerate(zip(he, tr)):
                if sorted(h) != sorted(t):
                    problems.append(f'doc {k}: keys differ')
                hl, tl = lines_of(h['content']), lines_of(t['content'])
                if len(hl) != len(tl):
                    problems.append(f'doc {k}: {len(tl)} lines vs {len(hl)}')
                    continue
                short = heb = scr = cit = num = 0
                for a, b in zip(hl, tl):
                    if classify(a) == 'v':
                        if a != b: problems.append(f'doc {k}: a verbatim line changed')
                        continue
                    if sorted(CITE.findall(a)) != sorted(CITE.findall(b)): cit += 1
                    if not set(re.findall(r'\d{3,}', a)) <= set(re.findall(r'\d+', b)): num += 1
                    if len(a) > 120 and len(b) < 0.5 * len(a): short += 1
                    if len(HEB.findall(b)) > 40: heb += 1
                    want = LAT if lang == 'en' else CYR
                    if len(a) > 40 and not want.search(b): scr += 1
                for name, n in (('citation markers differ', cit), ('numbers missing', num), ('too short', short), ('Hebrew remains', heb), ('wrong script', scr)):
                    if n: problems.append(f'doc {k}: {name} in {n} line(s)')
                if not t.get('title', '').strip(): problems.append(f'doc {k}: empty title')
                ratio = t['word_count'] / max(1, h['word_count'] or len(h['content'].split()))
                if not (0.7 < ratio < 2.2): problems.append(f'doc {k}: word count ratio {ratio:.2f}')
        if problems:
            bad += 1
            print(f'{sid}.{lang}: ' + '; '.join(problems[:6]))
print(f'checked {len(ids)} ids; {bad} file(s) with problems')
