import sys, json, re, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tx_lib import *

def roster_names():
    labels = {}
    for n in ['data.json', 'data-supplement.json', 'data-supplement-2.json', 'data-ancient.json']:
        p = f'{PUB}/{n}'
        if os.path.exists(p):
            for x in json.load(open(p, encoding='utf-8')).get('nodes', []):
                labels.setdefault(str(x['id']), x['label'])
    en = json.load(open(f'{PUB}/i18n/sages.en.json', encoding='utf-8'))
    ru = json.load(open(f'{PUB}/i18n/sages.ru.json', encoding='utf-8'))
    return labels, en, ru

def short(s):
    return re.split(r'\s+[—–]\s+', s or '')[0].strip()

def hints(text, sid):
    labels, en, ru = roster_names()
    out = []
    for k, lab in labels.items():
        e, r = short(en.get(k, {}).get('label')), short(ru.get(k, {}).get('label'))
        if not (e or r):
            continue
        for piece in re.split(r'[()–—]', lab):
            piece = piece.strip(' "״')
            if len(piece) >= 5 and piece in text:
                out.append((piece, e, r, k))
                break
    out.sort(key=lambda t: -len(t[0]))
    return out

def main(sid):
    docs, us, seen, composite = units(sid)
    labels, en, ru = roster_names()
    words = sum(len(d.get('content', '').split()) for d in docs)
    text = '\n'.join(t for _, t, _ in us)
    print(f'## {sid} {labels.get(sid)} | docs {len(docs)} | {words} words | {len(us)} units | en: {short(en.get(sid, {}).get("label"))} | ru: {short(ru.get(sid, {}).get("label"))}')
    hs = [h for h in hints(text, sid) if h[3] != sid][:25]
    if hs:
        print('names: ' + '; '.join(f'{p} = {e or "?"} / {r or "?"}' for p, e, r, _ in hs))
    for n, t, k in us:
        print(f'{n}|{"(ru only) " if k == "l" else ""}{t}')

if __name__ == '__main__':
    main(sys.argv[1])
