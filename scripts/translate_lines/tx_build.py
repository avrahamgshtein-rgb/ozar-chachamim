import sys, json, re, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tx_lib import *

LANGS = ('en', 'ru')

def cites(s):
    return sorted(re.findall(r'\[(?:cite:\s*)?\d{1,3}(?:\s*[-–,]\s*\d{1,3})*\]', s))

def nums(s):
    return sorted(set(re.findall(r'\d+', s)))

def build(sid, lang, write=True):
    docs, us, seen, composite = units(sid)
    got, problems = parse_tx(f'{TX}/{sid}.{lang}.txt')
    need = {n for n, t, k in us if k == 'h' or (k == 'l' and lang == 'ru')}
    missing = sorted(need - set(got))
    extra = sorted(set(got) - {n for n, _, _ in us})
    warn = []
    byid = {n: (t, k) for n, t, k in us}
    for n, tr in got.items():
        if n not in byid:
            continue
        src, k = byid[n]
        if k == 'l' and lang == 'en':
            continue
        if not tr:
            problems.append(f'unit {n} is empty')
            continue
        if cites(src) != cites(tr):
            warn.append(f'{n}: citation markers differ {cites(src)} vs {cites(tr)}')
        if not set(nums(src)) <= set(nums(tr)):
            warn.append(f'{n}: numbers {sorted(set(nums(src)) - set(nums(tr)))} of the source are not in the translation')
        want = LAT if lang == 'en' else CYR
        if not want.search(tr) and len(src) > 8:
            warn.append(f'{n}: no {"Latin" if lang == "en" else "Cyrillic"} letters')
        if len(src) > 120 and len(tr) < 0.55 * len(src):
            warn.append(f'{n}: translation is much shorter than the source ({len(tr)} vs {len(src)} chars)')
        hl = len(HEB.findall(tr))
        if hl > 12:
            warn.append(f'{n}: {hl} Hebrew letters remain')
        if lang == 'ru' and k == 'h' and len(LAT.findall(tr)) > 0.4 * max(1, len(tr)) and len(tr) > 40:
            warn.append(f'{n}: mostly Latin letters in the Russian')
    if missing or problems or extra:
        print(f'{sid}.{lang}: NOT WRITTEN. missing {missing[:60]}{"…" if len(missing) > 60 else ""} ({len(missing)}); extra {extra[:20]}; problems {problems[:8]}')
        return False
    def tr_of(t):
        k = classify(t)
        if k == 'v' or (k == 'l' and lang == 'en'):
            return t
        if t in composite:
            return ' '.join(tr_of(x) for x in composite[t])
        return got[seen[t]]
    out = []
    for d in docs:
        content = '\n'.join(tr_of(ln) for ln in lines_of(d.get('content', '')))
        out.append({**d, 'title': tr_of(d.get('title', '')), 'content': content, 'word_count': len(content.split())})
    for w in warn[:25]:
        print(f'  warn {sid}.{lang} {w}')
    if len(warn) > 25:
        print(f'  … {len(warn) - 25} more warnings')
    if write:
        with open(f'{RES}/{sid}.{lang}.json', 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, indent=1)
        words = sum(d['word_count'] for d in out)
        print(f'{sid}.{lang}: written, {len(out)} doc(s), {words} words ({len(warn)} warnings)')
    return True

def protected():
    # translations that existed before this run (one file name per line): never rebuilt
    p = f'{TX}/protected.txt'
    return set(open(p, encoding='utf-8').read().split()) if os.path.exists(p) else set()

if __name__ == '__main__':
    sid = sys.argv[1]
    langs = [a for a in sys.argv[2:] if a in LANGS] or list(LANGS)
    keep = protected()
    for l in [l for l in langs if f'{sid}.{l}.json' in keep]:
        print(f'{sid}.{l}: an existing translation, left as it is')
        langs.remove(l)
    ok = all([build(sid, l) for l in langs])
    sys.exit(0 if ok else 1)
