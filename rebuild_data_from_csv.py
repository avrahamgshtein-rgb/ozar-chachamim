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
import openpyxl
from collections import Counter

G = lambda r, k: (r.get(k) or '').strip()

def norm_name(s):
    if not s: return ''
    s = s.replace('״', '"').replace('׳', "'")
    # Trailing descriptive epithet: "הרב צבי הירש קלישר – ציונות דתית לפני הרצל"
    # is the same person as the bare "הרב צבי הירש קלישר", and treating them as
    # two produced a dozen duplicate sages. The separator must be a SPACED dash;
    # an unspaced one belongs to the name itself (שרה שטרן-קטן, מקלעת־חמאד).
    s = re.sub(r'\s+[־–—-]\s+.*$', '', s.strip())
    s = s.replace('־', '-').replace('–', '-')
    s = re.sub(r'\(.*?\)', ' ', s)           # drop parentheses
    s = re.sub(r'^(רבנו|רבינו|רבי|הרב|רב|ר\'|חכם|האדמו"ר|אדמו"ר|הרבי|מרן)\s+', '', s.strip())
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
    ('second-temple',['בית שני','מקרא','תנ"ך','עת העתיקה','הלניסט','חשמונא','בית המקדש','פרושים','נביא']),
]

# Pre-rabbinic (biblical) sub-periods. Checked BEFORE `RULES`, against the era label
# AND the years column joined together, because the CSV often puts the generic label
# in `תקופה` ("תנ״ך") and the actual sub-period in `שנים/תקופה` ("תקופת השופטים").
# Order matters: earliest period first, so a row spanning "תקופת האבות עד ימי דוד"
# lands on its earliest anchor rather than its latest.
# These keywords are deliberately narrow phrases, never bare personal names — a bare
# name would misfile later rabbis (רבי דוד קמחי, רבי ישעיה די טראני, אהרן הכהן מלוניל…).
BIBLICAL_RULES = [
    ('patriarchs', ['תקופת האבות','ימי האבות','דור האבות','תקופת האימהות','תקופת האמהות','האבות והאימהות','האבות והאמהות']),
    ('exodus',     ['יציאת מצרים','שעבוד מצרים','דור המדבר','תקופת המדבר','המסע במדבר','המשכן במדבר','מעמד הר סיני']),
    ('judges',     ['תקופת השופטים','ימי השופטים','שופטים','המשכן בשילה','משכן שילה']),
    ('kings',      ['ימי בית ראשון','בית ראשון','המקדש הראשון','ראשית המלוכה','תקופת המלוכה','ימי המלוכה','מלוכה',
                    'תקופת דוד','ימי דוד','דוד המלך','שלמה המלך','ממלכת יהודה','ממלכת ישראל','נביאי בית ראשון']),
]

# Generic biblical era labels that carry no sub-period of their own. When one of these
# is the era label and no BIBLICAL_RULES phrase matched, defer to the years column so a
# dated row (e.g. "המאה ה־13 לפנה״ס") gets bucketed by year instead of falling through
# to the catch-all 'מקרא'/'תנ"ך' -> second-temple rule.
VAGUE_BIBLICAL = ['תנ"ך','עת המקרא','תקופת המקרא','ימי המקרא']

def year_bucket(y):
    # Pre-Common-Era subdivisions (approximate conventional boundaries)
    if y < -1400: return 'patriarchs'
    if y < -1200: return 'exodus'
    if y < -1020: return 'judges'
    if y < -586:  return 'kings'
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

def life_years(years_text, era_text):
    """
    Structured life span from the free-text years column.

    Returns (birth, death, precision) where precision is:
      'exact'  — the source gave two plausible years, e.g. "1798–1866"
      'century'— only a century is known, e.g. "המאה ה־16"; the pair is the
                 century window, NOT a lifespan, so consumers must not present
                 it as a specific date
      None     — nothing usable; emit no years rather than guess

    A bare pair of numbers is only accepted as birth/death when the span is
    plausible for a human life. That rejects event years ("גירוש 1492"),
    century ranges written as digits, and reign dates.
    """
    def clean(t):
        return (t or '').replace('־', '-').replace('–', '-').replace('״', '"')

    yrs, era = clean(years_text), clean(era_text)

    # Explicit years always win over a century label. The spreadsheet routinely
    # carries "1905-1997" in the years column while the era column says
    # "המאה ה־20"; checking the century first would throw the real dates away.
    for src in (yrs, era):
        if 'לפנה' in src and 'לספירה' in src:
            continue                      # spans BCE into CE — sign is ambiguous, skip
        bce = 'לפנה' in src
        ys = [int(x) for x in re.findall(r'\b(\d{3,4})\b', src)]
        if len(ys) >= 2:
            a, b = ys[0], ys[1]
            if bce: a, b = -a, -b
            if 0 < b - a <= 120:
                return a, b, 'exact'

    # Century fallback. Handles both "המאה ה-16" and the plural span form
    # "המאות ה-12-13", which is a 200-year window rather than a lifespan.
    for src in (yrs, era):
        m = re.search(r'המאות ה-?(\d+)-(\d+)', src)
        if m:
            c1, c2 = int(m.group(1)), int(m.group(2))
            start, end = (c1 - 1) * 100, c2 * 100
            if 'לפנה' in src: start, end = -end, -start
            return start, end, 'century'
        m = re.search(r'המאה ה-?(\d+)', src)
        if m:
            c = int(m.group(1))
            start, end = (c - 1) * 100, c * 100
            if 'לפנה' in src: start, end = -end, -start
            return start, end, 'century'

    return None, None, None

def norm_era(era_text, years_text):
    t = (era_text or '').replace('״','"')
    yt = (years_text or '').replace('״','"')

    # 1. Explicit biblical sub-period phrase, in either the era label or the years column.
    both = t + ' | ' + yt
    for key, kws in BIBLICAL_RULES:
        for kw in kws:
            if kw in both:
                return key

    # 2. Generic biblical label with no sub-period phrase -> let the year decide.
    if any(v in t for v in VAGUE_BIBLICAL):
        y = parse_year(yt)
        if y is None: y = parse_year(t)
        if y is not None: return year_bucket(y)

    for key, kws in RULES:
        for kw in kws:
            if kw in t:
                return 'modern' if key == 'modern2' else key
    y = parse_year(years_text)
    if y is not None: return year_bucket(y)
    y = parse_year(era_text)
    if y is not None: return year_bucket(y)
    return 'unknown'

# ---------- Load master spreadsheet & dedupe ----------
# The .xlsx is the master the user maintains by hand. The sibling .csv was
# produced by merging this file's rows into a different sheet's 26-column
# layout; that merge mangled the data, so the CSV is not a usable source.
MASTER_XLSX = 'data/חכמי_ישראל.xlsx'

def load_master(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    header = [str(c.value).strip() if c.value is not None else '' for c in ws[1]]
    out = []
    for raw in ws.iter_rows(min_row=2, values_only=True):
        row = {header[i]: ('' if raw[i] is None else str(raw[i]).strip())
               for i in range(len(header)) if header[i]}
        if row.get('שם הדמות/הנושא'):
            out.append(row)
    wb.close()
    return out

rows = load_master(MASTER_XLSX)

def score(r):
    s = sum(1 for k in ['שנים/תקופה','אזור/מרחב','תקופה','תחום עיקרי','תגיות','רעיון מרכזי/חידוש','דמויות/השפעות קשורות','קישור ספוטיפיי'] if G(r,k))
    return s * 1000 + len(G(r,'תקציר (2–3 שורות)'))

best = {}
for r in rows:
    key = norm_name(G(r,'שם הדמות/הנושא'))
    if key not in best or score(r) > score(best[key]):
        best[key] = r
print(f'XLSX: {len(rows)} rows -> {len(best)} unique sages')

# ---------- Build nodes ----------
nodes, era_stats = [], Counter()
byname = {}
year_stats = Counter()
for key, r in best.items():
    era_key = norm_era(G(r,'תקופה'), G(r,'שנים/תקופה'))
    era_stats[era_key] += 1
    birth, death, precision = life_years(G(r,'שנים/תקופה'), G(r,'תקופה'))
    year_stats[precision or 'none'] += 1
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
    if precision:
        node['birth_year'] = birth
        node['death_year'] = death
        # Consumers must check this before showing a specific date: 'century'
        # means the pair is a 100-year window, not a lifespan.
        node['date_precision'] = precision
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

# ---------- has_research ----------
# Set from the file actually being on disk, not from a summaries index that
# drifted: the About page read 241 while 329 sages had a research document.
import os as _os
_rdir = _os.path.join('nextjs-app', 'public', 'research')
_present = set()
if _os.path.isdir(_rdir):
    for _f in _os.listdir(_rdir):
        if _f.endswith('.json') and '.en.' not in _f and '.ru.' not in _f:
            _present.add(_f[:-5])
for n in nodes:
    n['has_research'] = n['id'] in _present
print(f'has_research set from disk: {sum(1 for n in nodes if n["has_research"])}')

# ---------- Merge same-sage-twice pairs ----------
# Normalised-name dedup cannot see that "הרד״ק" and "רבי דוד קמחי" are one man,
# or that "הנודע ביהודה" is how the Rav Yechezkel Landau row is titled. Those
# pairs are curated in data/sage-aliases-by-name.json and merged here, at the
# source, so nothing downstream has to carry an alias table. The manifest is
# keyed by NAME on purpose: an id-keyed one reactivates on whoever later
# occupies a reused id, which is how רבי חנינא בר פפא came to be merged into
# בת שבע.
merged = 0
try:
    with open('data/sage-aliases-by-name.json', encoding='utf-8') as f:
        alias_pairs = json.load(f).get('pairs', [])
    by_label = {n['label']: n for n in nodes}
    remap = {}
    for p in alias_pairs:
        a, b = by_label.get(p['from']), by_label.get(p['to'])
        if not a or not b or a is b:
            continue
        # Honour the manifest's direction: `to` is the row a human chose to
        # keep. Picking by bio length instead silently discarded the label the
        # curator meant to survive, and orphaned every research document
        # attributed to it.
        keep, drop = b, a
        # carry over anything the kept row happens to lack
        for k, v in drop.items():
            if v and not keep.get(k):
                keep[k] = v
        remap[drop['id']] = keep['id']
        nodes = [n for n in nodes if n is not drop]
        merged += 1

    if remap:
        rewired, seen = [], set()
        for l in links:
            s = remap.get(str(l['source']), str(l['source']))
            t = remap.get(str(l['target']), str(l['target']))
            if s == t:
                continue                      # self-link created by the merge
            k = (s, t, l.get('type'))
            if k in seen:
                continue
            seen.add(k)
            rewired.append({**l, 'source': s, 'target': t})
        links = rewired
    print(f'merged duplicate sages: {merged}')
except FileNotFoundError:
    print('alias manifest absent, no merges')

# ---------- Migration paths ----------
# Life journeys (born X -> moved to Y) extracted from the research corpus and
# kept in data/migration_paths.json, since the spreadsheet has no column for
# them. Merged here rather than hand-edited into data.json, which a rebuild
# would wipe — that is exactly how the previously extracted paths were lost.
# Keyed by sage id, so re-key this file by NAME whenever the id space moves.
# GeoMap.tsx draws {from, intermediate[], to} as an arrowed polyline; the
# audit fields (_sage, evidence, confidence) stay in the source file only.
mig_applied = mig_stale = 0
try:
    with open('data/migration_paths.json', encoding='utf-8') as f:
        mig = json.load(f)
    by_id = {n['id']: n for n in nodes}
    for sid, p in mig.items():
        node = by_id.get(sid)
        if not node:
            mig_stale += 1
            continue
        path = {'from': p['from'], 'to': p['to']}
        if p.get('intermediate'):
            path['intermediate'] = p['intermediate']
        node['migration_path'] = path
        mig_applied += 1
    print(f'migration paths: {mig_applied} applied, {mig_stale} stale (id not in master)')
except FileNotFoundError:
    print('migration paths: data/migration_paths.json absent, skipped')

# ---------- Write ----------
shutil.copy('data.json', 'data.json.backup_pre_rebuild')
json.dump({'nodes': nodes, 'links': links}, open('data.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'\n=== DONE: {len(nodes)} nodes, {len(links)} links ===')
print('era distribution:', dict(era_stats.most_common()))
print('life-year precision:', dict(year_stats.most_common()))
