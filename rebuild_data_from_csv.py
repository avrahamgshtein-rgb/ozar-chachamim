#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rebuild data.json from data/חכמי ישראל.csv (master source).
- Dedupes rows by normalized name (keeps most complete row)
- Normalizes era_key to the 7 canonical keys
- Builds links from the 'דמויות/השפעות קשורות' column
- Recovers curated links from data_with_connections.json + data.json.backup_v4
- Enriches missing bios from research_summaries.json
Creates data.json.backup_pre_rebuild before writing.
"""
import csv, json, re, shutil
from collections import Counter

G = lambda r, k: (r.get(k) or '').strip()

def norm_name(s):
    if not s: return ''
    s = s.replace('״', '"').replace('׳', "'").replace('־', '-').replace('–', '-')
    s = re.sub(r'\(.*?\)', ' ', s)           # drop parentheses
    s = re.sub(r'^(רבנו|רבינו|רבי|הרב|רב|ר\'|חכם|האדמו"ר|אדמו"ר|מרן)\s+', '', s.strip())
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

# ---------- Era normalization ----------
RULES = [
    ('modern',       ['המאה ה־19','המאה ה-19','המאה ה־20','המאה ה-20','המאה ה־21','המאה ה-21','ימינו','דורנו','עכשווי','השכלה','ציונות','שואה','המדינה','מודרנ','עת חדשה מאוחרת','סוף המאה ה-19']),
    ('acharonim',    ['העת החדשה המוקדמת','עת חדשה מוקדמת','ראשית העת החדשה','רנסנס','רנסאנס','צפת','המאה ה־16','המאה ה-16','המאה ה־17','המאה ה-17','המאה ה־18','המאה ה-18','אחרונים','חסידות','מוסר וישיבות']),
    ('modern2',      ['העת החדשה','עת חדשה','עת המודרנית']),   # generic modern AFTER מוקדמת checks
    ('rishonim',     ['ראשונים','ימי הביניים','תור הזהב','בעלי התוספות','חסידי אשכנז','ראשוני','פרובנס','פרובאנס','רש"י','שלהי ימי הביניים']),
    ('geonim',       ['גאון','גאונים','סבורא','פיוט קדום']),
    ('amoraim',      ['אמורא','תלמוד ירושלמי','תלמוד בבלי']),
    ('tannaim',      ['תנא','משנה','חז"ל','מרד','יבנה']),
    ('second-temple',['בית שני','בית ראשון','מקרא','תנ"ך','שופטים','מלוכה','עת העתיקה','הלניסט','חשמונא','בית המקדש','פרושים','נביא']),
]
def year_bucket(y):
    if y < 70: return 'second-temple'
    if y < 220: return 'tannaim'
    if y < 500: return 'amoraim'
    if y < 1038: return 'geonim'
    if y < 1500: return 'rishonim'
    if y < 1800: return 'acharonim'
    return 'modern'

def parse_year(s):
    if not s: return None
    s2 = s.replace('־','-').replace('–','-')
    neg = 'לפנה' in s2
    m = re.search(r'המאה ה-?(\d+)', s2)
    if m:
        y = (int(m.group(1)) - 1) * 100 + 50
        return -y if neg else y
    ys = [int(x) for x in re.findall(r'\b(\d{3,4})\b', s2)]
    if ys:
        y = sum(ys) / len(ys)
        return -y if neg else y
    m = re.search(r'\b(\d{1,2})\b', s2)
    if m and neg: return -int(m.group(1))
    return None

def norm_era(era_text, years_text):
    t = (era_text or '').replace('״','"')
    for key, kws in RULES:
        for kw in kws:
            if kw in t:
                return 'modern' if key == 'modern2' else key
    y = parse_year(years_text)
    if y is not None: return year_bucket(y)
    y = parse_year(era_text)
    if y is not None: return year_bucket(y)
    return 'unknown'

# ---------- Load CSV & dedupe ----------
with open('data/חכמי ישראל.csv', encoding='utf-8-sig') as f:
    rows = [r for r in csv.DictReader(f) if G(r, 'שם הדמות/הנושא')]

def score(r):
    s = sum(1 for k in ['שנים/תקופה','אזור/מרחב','תקופה','תחום עיקרי','תגיות','רעיון מרכזי/חידוש','דמויות/השפעות קשורות','קישור ספוטיפיי'] if G(r,k))
    return s * 1000 + len(G(r,'תקציר (2–3 שורות)'))

best = {}
for r in rows:
    key = norm_name(G(r,'שם הדמות/הנושא'))
    if key not in best or score(r) > score(best[key]):
        best[key] = r
print(f'CSV: {len(rows)} rows -> {len(best)} unique sages')

# ---------- Build nodes ----------
nodes, era_stats = [], Counter()
byname = {}
for key, r in best.items():
    era_key = norm_era(G(r,'תקופה'), G(r,'שנים/תקופה'))
    era_stats[era_key] += 1
    node = {
        'id': G(r,'מזהה'),
        'label': G(r,'שם הדמות/הנושא'),
        'era': G(r,'שנים/תקופה') or G(r,'תקופה'),
        'era_key': era_key,
        'era_label': G(r,'תקופה'),
        'field': G(r,'תחום עיקרי'),
        'location': G(r,'אזור/מרחב'),
        'bio': G(r,'תקציר (2–3 שורות)'),
        'central_idea': G(r,'רעיון מרכזי/חידוש'),
        'tags': G(r,'תגיות'),
        'chapter_type': G(r,'סוג פרק'),
        'spotify_url': G(r,'קישור ספוטיפיי'),
        'related_raw': G(r,'דמויות/השפעות קשורות'),
    }
    nodes.append(node)
    byname[key] = node

# ---------- Enrich bios from research summaries ----------
enriched = 0
try:
    summaries = json.load(open('research_summaries.json', encoding='utf-8'))
    for s in summaries:
        key = norm_name(re.sub(r'\.docx$', '', s.get('filename','')).replace('_','"'))
        node = byname.get(key)
        if not node:
            for k, n in byname.items():
                if k and (k in key or key in k) and len(k) > 6:
                    node = n; break
        if node:
            node['has_research'] = True
            if not node['bio'] and s.get('summary'):
                node['bio'] = s['summary'][:600]
                enriched += 1
except Exception as e:
    print('research enrich skipped:', e)
print(f'bios filled from research: {enriched}')

# ---------- Match helper ----------
def find_node(token):
    k = norm_name(token)
    if not k or len(k) < 3: return None
    if k in byname: return byname[k]
    cands = [n for key2, n in byname.items() if len(k) > 5 and (k in key2 or key2 in k)]
    return cands[0] if len(cands) == 1 else None

# ---------- Links from CSV related figures ----------
links, seen = [], set()
def add_link(src, tgt, ltype, **extra):
    if not src or not tgt or src == tgt: return False
    sig = (src, tgt, ltype)
    if sig in seen or (tgt, src, ltype) in seen: return False
    seen.add(sig)
    links.append({'source': src, 'target': tgt, 'type': ltype, **extra})
    return True

csv_links = 0
for node in nodes:
    raw = node.pop('related_raw', '')
    if not raw: continue
    for token in re.split(r'[;,·•/]', raw):
        rel = find_node(token)
        if rel and add_link(rel['id'], node['id'], 'influence', evidence_source='CSV דמויות קשורות'):
            csv_links += 1
print(f'links from CSV related-figures: {csv_links}')

# ---------- Recover curated links (old id spaces -> label mapping) ----------
def recover(fname, skip_types=()):
    n = 0
    try:
        old = json.load(open(fname, encoding='utf-8'))
    except Exception:
        return 0
    old_byid = {str(x['id']): x for x in old['nodes']}
    for l in old.get('links', []):
        if l.get('type') in skip_types: continue
        s, t = old_byid.get(str(l['source'])), old_byid.get(str(l['target']))
        if not s or not t: continue
        sn, tn = find_node(s.get('label','')), find_node(t.get('label',''))
        if sn and tn:
            extra = {k: l[k] for k in ('strength','period','context_he','evidence_source') if l.get(k)}
            if add_link(sn['id'], tn['id'], l.get('type','influence'), **extra):
                n += 1
    return n

r1 = recover('data_with_connections.json')
r2 = recover('data.json.backup_v4', skip_types=('colleague',))
print(f'recovered links: curated={r1}, backup_v4(non-colleague)={r2}')

# ---------- Write ----------
shutil.copy('data.json', 'data.json.backup_pre_rebuild')
json.dump({'nodes': nodes, 'links': links}, open('data.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'\n=== DONE: {len(nodes)} nodes, {len(links)} links ===')
print('era distribution:', dict(era_stats.most_common()))
