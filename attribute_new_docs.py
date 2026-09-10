#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Attribute newly added .docx files to sages and fold them into
data/research_attribution.json.

Matching is on the document's own opening line, never the filename alone, and
a disagreeing place epithet vetoes a match — the corpus is full of pairs that
share every word except the town (מדווינסק / מראדין) or share a name across
centuries (יש"ר מקנדיה / יש"ר מגוריציה, the two Bat Shevas, the two Francks).

Writes data/new_attribution_review.txt for eyeballing before anything is
ingested.
"""
import json, io, os, re, glob
from docx import Document

REPO = os.path.dirname(os.path.abspath(__file__))
ATTR = os.path.join(REPO, 'data', 'research_attribution.json')
DATA = os.path.join(REPO, 'nextjs-app', 'public', 'data.json')

STOP = set('''רבי רבנו רבינו הרב רב חכם מרן הרבנית בן בר בעל ספר הגאון המקובל דון
זצל הראשון השני בין בית ארץ ישראל ספרד מצרים אשכנז פרובנס צפת ירושלים בבל תורה
הלכה קבלה משנתו משנתה פועלו פועלה דמותו הגותו הגותה העת ימי הביניים המאה גדולי
מגדולי הפוסקים חכמי תולדות ההלכה התורה הקבלה ההגות המשנה התלמוד הציונות החסידות
המוסר הפרשנות לציון מחקר ניתוח מקיף על של יצירתו שיטתו והשפעתו לדורות בראי
התקופה והנהגתו הקהילתית פרק דוח מומחה היסטורי ותורני מורשתו מורשתה עולמו
מנהיגות מנהיגותו חייו ועיון עיון תורנית תורני הציבורי הציבורית'''.split())

def norm(s):
    s = (s or '').replace('״', '"').replace('׳', "'").replace('־', '-').replace('–', '-').replace('_', '"')
    s = re.sub(r'\.docx$', '', s)
    return re.sub(r'[(),:;\[\]{}\'"?!.]', ' ', s)

def key(w):
    return w[0] + w[1:-1].replace('י', '').replace('ו', '') + w[-1] if len(w) > 3 else w

def words(s):
    return {key(w.strip('-')) for w in norm(s).split()
            if len(w.strip('-')) >= 3 and w.strip('-') not in STOP}

_NOISE = {'משנתו', 'משנתה', 'מנהיגות', 'מקיף', 'מומחה', 'מחקר', 'מבשר', 'מעצב',
          'מחבר', 'מסורת', 'מפעלות', 'מהפכת', 'מדיניות', 'מנהג', 'מבט', 'מורשתו',
          'מורשתה', 'מפעל', 'מגן', 'מוסר', 'מלכות'}

def epithet(name):
    head = re.split(r'[–\-—(:,]', norm(name))[0]
    for w in head.split():
        w = w.strip('-')
        if len(w) >= 5 and w.startswith('מ') and w not in _NOISE:
            core = w[1:] if len(w) > 5 else w
            return key(core.lstrip('מ'))
    return None

def opening(path, limit=1500):
    try:
        doc = Document(path)
    except Exception as e:
        return None, str(e)
    buf = []
    for p in doc.paragraphs:
        t = p.text.strip()
        if t:
            buf.append(t)
        if sum(len(x) for x in buf) > limit:
            break
    return '\n'.join(buf), None

def main():
    attribution = json.load(io.open(ATTR, encoding='utf-8'))
    known = {d['file'] for d in attribution['documents']}
    roster = json.load(io.open(DATA, encoding='utf-8'))['nodes']

    new_files = [os.path.basename(f) for f in glob.glob(os.path.join(REPO, 'data', '*.docx'))
                 if os.path.basename(f) not in known]
    print(f'documents not yet attributed: {len(new_files)}')

    sages = [(n['label'], words(n['label']), epithet(n['label'])) for n in roster]

    results, rows = [], []
    for fn in sorted(new_files):
        text, err = opening(os.path.join(REPO, 'data', fn))
        if text is None:
            results.append({'file': fn, 'sage_label': None, 'confidence': 'none',
                            'reason': f'unreadable: {err}'})
            continue
        first = text.split('\n')[0]
        dw = words(first) | words(fn)
        dep = epithet(first) or epithet(fn)

        scored = []
        for label, sw, sep in sages:
            if not sw:
                continue
            shared = sw & dw
            if not shared:
                continue
            # A place epithet that disagrees means a different person, whatever
            # else the names share.
            if dep and sep and dep != sep:
                continue
            agree = 1 if (dep and sep and dep == sep) else 0
            scored.append((agree, len(shared), len(sw), label))
        # prefer epithet agreement, then overlap, then the tighter sage name
        scored.sort(key=lambda t: (-t[0], -t[1], t[2]))

        if scored and (scored[0][1] >= 2 or scored[0][0] == 1):
            best = scored[0]
            runner = scored[1] if len(scored) > 1 else None
            close = runner and runner[0] == best[0] and runner[1] == best[1]
            results.append({'file': fn, 'sage_label': best[3],
                            'confidence': 'medium' if close else 'high',
                            'evidence': first[:160]})
            rows.append(f"{'?' if close else ' '} {fn[:64]}\n     -> {best[3][:52]}  (shared={best[1]}, epithet={'yes' if best[0] else 'no'})"
                        + (f"\n        runner-up: {runner[3][:52]}" if close else ''))
        else:
            results.append({'file': fn, 'sage_label': None, 'confidence': 'none',
                            'reason': 'no sage on the roster matches its subject',
                            'evidence': first[:160]})
            rows.append(f"X {fn[:64]}\n     -> NO MATCH\n        opens: {first[:90]}")

    attribution['documents'].extend(results)
    io.open(ATTR, 'w', encoding='utf-8').write(json.dumps(attribution, ensure_ascii=False, indent=1))

    matched = sum(1 for r in results if r.get('sage_label'))
    ambiguous = sum(1 for r in results if r.get('confidence') == 'medium')
    io.open(os.path.join(REPO, 'data', 'new_attribution_review.txt'), 'w', encoding='utf-8').write(
        f'NEW DOCUMENTS: {len(results)}   matched: {matched}   needs a look: {ambiguous}\n\n'
        + '\n'.join(rows))
    print(f'matched: {matched} / {len(results)}   flagged for review: {ambiguous}')

if __name__ == '__main__':
    main()
