#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Open EVERY .docx in data/ once, record what each is about, then match the whole
corpus against the whole sage roster.

The earlier pass shortlisted candidates by filename overlap and so only ever
opened 193 of 452 files. A document whose filename shares no word with any sage
label — a thematic title, a different transliteration — was invisible to it.
This reads all of them and matches on the document's own opening line, which is
where a Hebrew research paper names its subject.

Outputs:
  data/doc_subject_index.json   every document with its opening line
  data/unmatched_docs.txt       documents that match no sage at all
  data/newly_found.txt          sages currently without research that a
                                document does cover
"""
import json, io, os, re, glob
from docx import Document

STOP = set('''רבי רבנו רבינו הרב רב חכם מרן הרבנית בן בר בעל ספר הגאון המקובל דון
זצל הראשון השני בין בית ארץ ישראל ספרד מצרים אשכנז פרובנס צפת ירושלים בבל תורה
הלכה קבלה משנתו פועלו דמותו הגותו העת ימי הביניים המאה גדולי מגדולי הפוסקים חכמי
תולדות ההלכה התורה הקבלה ההגות המשנה התלמוד הציונות החסידות המוסר הפרשנות לציון
מחקר ניתוח מקיף על של יצירתו שיטתו והשפעתו לדורות בראי התקופה והנהגתו הקהילתית
פרק דוח מומחה ניתוחי היסטורי ותורני בעולם מבט דיוקן חייו מורשתו עולמו'''.split())

def norm(s):
    s = (s or '').replace('״', '"').replace('׳', "'").replace('־', '-').replace('–', '-').replace('_', '"')
    s = re.sub(r'\.docx$', '', s)
    return re.sub(r'[(),:;\[\]{}\'"?!.]', ' ', s)

def key(w):
    return w[0] + w[1:-1].replace('י', '').replace('ו', '') + w[-1] if len(w) > 3 else w

def words(s):
    return {key(w.strip('-')) for w in norm(s).split()
            if len(w.strip('-')) >= 3 and w.strip('-') not in STOP}

_NOISE = {'משנתו', 'מנהיגות', 'מקיף', 'מומחה', 'מחקר', 'מבשר', 'מעצב', 'מחבר',
          'מסורת', 'מפעלות', 'מהפכת', 'מדיניות', 'מנהג', 'מבט', 'מורשתו'}

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
    files = sorted(glob.glob(os.path.join('data', '*.docx')))
    data = json.load(io.open(os.path.join('nextjs-app', 'public', 'data.json'), encoding='utf-8'))
    sages = data['nodes']
    have = {os.path.splitext(os.path.basename(f))[0]
            for f in glob.glob(os.path.join('nextjs-app', 'public', 'research', '*.json'))
            if '.en.' not in f and '.ru.' not in f}

    index, failed = [], []
    for i, f in enumerate(files, 1):
        text, err = opening(f)
        if text is None:
            failed.append({'file': os.path.basename(f), 'error': err})
            continue
        first = text.split('\n')[0]
        index.append({
            'file': os.path.basename(f),
            'first_line': first[:160],
            # subject words come from the title AND the filename: some papers
            # open with a generic heading and name the subject only in the path
            'subject_words': sorted(words(first) | words(os.path.basename(f))),
            'epithet': epithet(first) or epithet(os.path.basename(f)),
        })
        if i % 100 == 0:
            print(f'  opened {i}/{len(files)}')

    io.open(os.path.join('data', 'doc_subject_index.json'), 'w', encoding='utf-8').write(
        json.dumps({'documents': index, 'unreadable': failed}, ensure_ascii=False, indent=1))

    # match every sage against every document
    sw = [(s, words(s['label']), epithet(s['label'])) for s in sages]
    matched_docs = set()
    found = []
    for s, mw, sep in sw:
        if not mw:
            continue
        best = None
        for d in index:
            dw = set(d['subject_words'])
            shared = mw & dw
            if not shared:
                continue
            if sep and d['epithet'] and sep != d['epithet']:
                continue                      # different town, different man
            score = len(shared)
            agree = 1 if (sep and d['epithet'] and sep == d['epithet']) else 0
            cand = (agree, score, d)
            if best is None or cand[:2] > best[:2]:
                best = cand
        if best and (best[1] >= 2 or best[0] == 1):
            matched_docs.add(best[2]['file'])
            if s['id'] not in have:
                found.append({'id': s['id'], 'label': s['label'],
                              'file': best[2]['file'], 'opens': best[2]['first_line'],
                              'score': best[1], 'epithet_agrees': bool(best[0])})

    orphans = [d for d in index if d['file'] not in matched_docs]

    io.open(os.path.join('data', 'newly_found.txt'), 'w', encoding='utf-8').write(
        f'חכמים ללא מחקר שנמצא להם מסמך ({len(found)}):\n\n'
        + '\n'.join(f"[{x['id']}] {x['label'][:50]}\n    score={x['score']} epithet={x['epithet_agrees']}\n"
                    f"    -> {x['file']}\n    opens: {x['opens'][:100]}\n" for x in found))
    io.open(os.path.join('data', 'unmatched_docs.txt'), 'w', encoding='utf-8').write(
        f'מסמכים שלא הותאמו לאף חכם ({len(orphans)}):\n\n'
        + '\n'.join(f"{d['file']}\n    opens: {d['first_line'][:110]}\n" for d in orphans))

    print(f'documents read      : {len(index)}  (unreadable: {len(failed)})')
    print(f'documents matched   : {len(matched_docs)}')
    print(f'documents unmatched : {len(orphans)}')
    print(f'sages without research that a document DOES cover: {len(found)}')

if __name__ == '__main__':
    main()
