#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract FULL text from data/*.docx research documents.
Outputs: research.json (full content), research_summaries.json,
research_by_sage.json (keyed by current data.json node ids).
Matching: exact/normalized name, then word-based with plene/defective
spelling tolerance (פינחס=פנחס) and unique-word identifiers (קהתי)."""
import json, re, os
from docx import Document

def norm_name(s):
    if not s: return ''
    s = s.replace('״','"').replace('׳',"'").replace('־','-').replace('–','-').replace('_','"')
    s = re.sub(r'\(.*?\)', ' ', s)
    s = re.sub(r'^(רבנו|רבינו|רבי|הרב|רב|ר\'|חכם|האדמו"ר|אדמו"ר|מרן|המקובל|הגאון)\s+', '', s.strip())
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

nodes = json.load(open('data.json', encoding='utf-8'))['nodes']
byname = {norm_name(n['label']): n for n in nodes}

STOP = {'רבי','רבנו','רבינו','הרב','רב','בן','בר','בעל','ספר','הגאון','המקובל','חכם','דון','זצ"ל','הראשון','השני',
        'בין','בית','ארץ','ישראל','ספרד','מצרים','אשכנז','פרובנס','צפת','ירושלים','בבל','תורה','הלכה','קבלה',
        'משנתו','פועלו','דמותו','הגותו','העת','ימי','הביניים','המאה','גדולי','מגדולי','הפוסקים','חכמי','תולדות',
        'ההלכה','התורה','הקבלה','ההגות','המשנה','התלמוד','הציונות','החסידות','המוסר','הפרשנות','לציון','יצחק','יוסף','יעקב','אברהם','משה','דוד','שלמה','שמעון','שמואל','יהודה','ישעיה','אליהו','חיים','מאיר'}

def word_key(w):
    """Spelling-insensitive word key: strip quotes + internal yod/vav."""
    w = w.replace('"','').replace("'",'').replace('״','').replace('׳','')
    if len(w) <= 3: return w
    return w[0] + w[1:-1].replace('י','').replace('ו','') + w[-1]

WORD_INDEX = {}          # word -> node ids (anywhere in label)
NAME_INDEX = {}          # word -> node ids (first 4 words = the name part)
for _k, _n in byname.items():
    for _i, _w in enumerate(_k.split()):
        if len(_w) >= 3 and _w not in STOP:
            wk = word_key(_w)
            if wk:
                WORD_INDEX.setdefault(wk, []).append(_n['id'])
                if _i < 4:
                    NAME_INDEX.setdefault(wk, []).append(_n['id'])

BLACKLIST = set()  # (empty — ראובן מרגליות added to the network July 2026)

OVERRIDES = {
    'Rabbi Isaiah ben Elijah di Trani (Riaz).docx': 'הריא״ז (רבי ישעיה בן אליהו דטראני)',
    'רבי דוד בן זמרא (הרדב_ז) – גשר בין הרמב_ם לקבלה בצפת.docx': 'הרדב"ז (1479–1573) – מגדולי הפוסקים: בין ספרד למצרים וארץ ישראל',
}

def match_node(filename):
    if filename in BLACKLIST:
        return None
    if filename in OVERRIDES:
        k = norm_name(OVERRIDES[filename])
        for key, n in byname.items():
            if n['label'] == OVERRIDES[filename] or key == k:
                return n
    base = re.sub(r'\.docx$', '', filename)
    base = re.sub(r'\(\d+\)$', '', base).strip()
    candidates = [base] + re.split(r'[_:–—-]| - ', base)
    for c in candidates:
        k = norm_name(c)
        if k and k in byname: return byname[k]
    # Word-based matching over the whole title.
    # Filenames use '_' both as ':' separator and as gershayim (הרדב_ז) —
    # index words from both interpretations.
    raw = base + ' ' + base.replace('_', '"')
    # compressed-key -> original max length (length checks use ORIGINAL word)
    fn_words = {}
    for w in re.split(r'[\s,.:;()\[\]_–—-]+', raw):
        if len(w) >= 4:
            wk = word_key(w)
            if wk: fn_words[wk] = max(fn_words.get(wk, 0), len(w))
    best, best_score, best_len = None, 0, 10**9
    for key, n in byname.items():
        n_words = {}
        for i, w in enumerate(key.split()):
            if len(w) >= 4 and w not in STOP and i < 8:
                wk = word_key(w)
                if wk: n_words[wk] = max(n_words.get(wk, 0), len(w))
        if not n_words: continue
        shared = [(wk, max(olen, fn_words[wk])) for wk, olen in n_words.items() if wk in fn_words]
        score = len(shared)
        # a single shared word must be a UNIQUE NAME identifier (first 4 words
        # of the label), original length >= 5
        if score == 1:
            wk0, olen0 = shared[0]
            owners = set(NAME_INDEX.get(wk0, []))
            if olen0 < 5 or n['id'] not in owners or len(owners) > 1:
                score = 0
        # tie-break: prefer the more specific (shorter) node label
        if score > best_score or (score == best_score and score > 0 and len(key) < best_len):
            best, best_score, best_len = n, score, len(key)
    return best

research, summaries, by_sage = [], [], {}
skipped = []
files = sorted(f for f in os.listdir('data') if f.endswith('.docx'))
for f in files:
    try:
        doc = Document(os.path.join('data', f))
        paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        if not paras:
            skipped.append((f, 'empty')); continue
        title = paras[0][:200]
        content = '\n\n'.join(paras)
        node = match_node(f)
        sid = node['id'] if node else None
        research.append({'source_file': f, 'title': title, 'sage_id': sid,
                         'sage_label': node['label'] if node else None,
                         'content': content, 'word_count': len(content.split())})
        summaries.append({'filename': f, 'title': title, 'sage_id': sid,
                          'summary': ' '.join(paras[1:3])[:300] if len(paras) > 1 else title,
                          'word_count': len(content.split())})
        if sid:
            by_sage.setdefault(sid, []).append(f)
    except Exception as e:
        skipped.append((f, str(e)[:60]))

json.dump(research, open('research.json','w',encoding='utf-8'), ensure_ascii=False)
json.dump(summaries, open('research_summaries.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(by_sage, open('research_by_sage.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)

matched = sum(1 for r in research if r['sage_id'])
print(f'docs: {len(research)} | matched to sages: {matched} | sages with research: {len(by_sage)}')
print(f'total words: {sum(r["word_count"] for r in research):,} | research.json: {os.path.getsize("research.json")//1024} KB')
if skipped: print('skipped:', skipped)
