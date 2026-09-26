#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rebuild data.json from data/חכמי ישראל.csv (master source).
- Dedupes rows by normalized name (keeps most complete row)
- Normalizes era_key to the 7 canonical keys
- Builds links from the 'דמויות/השפעות קשורות' column
- Recovers curated links from data_with_connections.json + data.json.backup_v4
- Validates teacher/student links; see data/link_validation_report.txt
- Enriches missing bios from research_summaries.json
Creates data.json.backup_pre_rebuild before writing.
"""
import csv, json, os, re, shutil
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
            # summaries were cut from the papers' opening lines, so they start
            # with NotebookLM's "Source guide" header (see rebuild_research_corpus.py)
            summary = re.sub(r'^Source guide\s*|\s*Source guide', '', s.get('summary') or '')
            if not node['bio'] and summary:
                node['bio'] = summary[:600]
                enriched += 1
except Exception as e:
    print('research enrich skipped:', e)
print(f'bios filled from research: {enriched}')

# ---------- Match helper ----------
def fathers(s):
    return set(re.findall(r'\b(?:בן|בר)\s+([\u05d0-\u05ea\'"]+)', (s or '').replace('״', '"')))

def find_node(token):
    k = norm_name(token)
    if not k or len(k) < 3: return None
    if k in byname: return byname[k]
    # A substring match joins two people who share a first name, so a named
    # father that disagrees vetoes it: ישמעאל בן נתניה, Gedaliah's assassin,
    # is not the tanna רבי ישמעאל (בן אלישע).
    mine = fathers(token)
    cands = [n for key2, n in byname.items() if len(k) > 5 and (k in key2 or key2 in k)
             and not (mine and fathers(n['label']) and not mine & fathers(n['label']))]
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
# Two parts of backup_v4's links are not what they claim to be, and are skipped.
#
# 1. Mis-resolved sources. Its links were extracted from the research papers,
#    and the paper's own sage was looked up by word overlap, falling back to the
#    first node, in file order, that shares a word with the paper title. So every
#    "הרב …" paper became id 29 (הרב אפרים מקלעת־חמאד, the first label with
#    "הרב"), every "רבי …" paper id 4 (רבי עקיבא, the first with "רבי"), every
#    "רבנו …" paper id 12, and so on. Relabelled faithfully, that had a
#    12th-century North African "teaching" Rav Tzvi Yehuda Kook and Rabbi Akiva
#    "teaching" the Lubavitcher Rebbe. The real source of each edge is lost, so
#    these ids' outgoing links are dropped whole. Each is the first holder of a
#    common title word (29 הרב, 4 רבי/יוסף, 12 רבנו, 8 בר, 2 שמעון, 16 על,
#    182 שיטת, 5 יהודה, 23 מנחם, 24 אבן, 67 גשר, 183 ספר, 394 שרה), has
#    in-degree ~0, and has out-edges spanning Tannaim to today (4: 83, 29: 22,
#    12: 10, 182: 8, 2: 5 …). Several point at the paper's own subject:
#    29 -> הרב אביחי רונצקי, 2 -> רבי יוסף בן יהודה אבן שמעון, 81 -> ריב"א
#    (81's other two edges repeat those of the ריב"א paper, 556). The ids are
#    backup_v4's own, and that file is a frozen snapshot, so they cannot drift.
# 2. A synthetic sample batch: the 24 links carrying strength/period/context_he.
#    Their context is templated ("תלמיד בדירוג ראשון", "עמיתים בדירוג") and
#    invented: הר"ן a student of the Rambam, מנחם מנדל לפין the teacher of רבי
#    יוסף בכור שור, הרב שמואל הלוי וואזנר and הרב מאיר זייני "אישה ובעלה".
V4_MISRESOLVED_SOURCES = {'2', '4', '5', '8', '12', '16', '23', '24', '29', '67', '81', '182', '183', '394'}
V4_SYNTHETIC_FIELD = 'context_he'
recovery_skipped = []   # (reason, type, source, target, strict match) as the old matcher linked them

def nicknames(label):
    """Parenthesised epithets, gershayim-normalised: 'רבי יצחק אלפסי (הרי"ף)' -> {'הרי"ף'}."""
    out = set()
    for x in re.findall(r'\(([^()]*)\)', (label or '').replace('״', '"').replace('׳', "'")):
        x = re.sub(r'(?<=[א-ת])[-_](?=[א-ת])', '"', x).strip()
        if x and not x.isdigit():
            out.add(x)
    return out

def old_label_candidates(label):
    """
    Names to try for a node label from an old id space, grouped by title
    segment, name-bearing segment first. Many old nodes are research papers,
    titled after their file name: gershayim became "_" (הרי_ף), a colon became
    "_ " or "- ", duplicates got "(1)", and the name often sits inside a longer
    title ("משנתו … של חכם מנחם מנשה").
    """
    s = re.sub(r'\(\d+\)', ' ', label or '')
    s = re.sub(r'(?<=[א-ת])_(?=[א-ת])', '"', s)   # הרי_ף -> הרי"ף
    s = re.sub(r'(?<![א-ת])ר_\s', "ר' ", s)                  # ר_ יצחק -> ר' יצחק
    s = re.sub(r'\s*זצ"ל', '', s)
    groups = [[s]]
    for seg in re.split(r'_\s|_$|(?<=\S)-\s|\s[–—-]\s|:', s):
        seg = seg.strip(' _')
        if not seg: continue
        g = [seg]
        if ' של ' in seg:
            g.append(seg.rsplit(' של ', 1)[1])
        m = re.search(r'(?:^|\s)((?:רבי|הרב|רבנו|רבינו|רב|חכם)\s.*)$', seg)
        if m:
            g.append(m.group(1))
        g.extend(nicknames(seg))
        groups.append(g)
    return groups

def find_node_strict(label):
    """
    find_node for labels from an OLD id space. Per title segment, in order, an
    exact normalised name wins; the substring fallback is kept only when the
    given name agrees and no epithet disagrees. Plain substring matching turned
    "רבי יעקב בן הרב יצחק הלוי פולק" (1460-1541) into Rashi's teacher רבי יצחק
    הלוי, "רבי יהודה הלוי מינץ" into ריה"ל, and a stray "היהודית" into יהודית.
    Segment order matters: "רבי נתן בן מאיר מטרינקטיי_ צומת הדרכים של חכמי
    פרובנס" is about the man, not the topic node "חכמי פרובנס".
    """
    for group in old_label_candidates(label):
        for c in group:
            k = norm_name(c)
            if k and k in byname:
                return byname[k]
        for c in group:
            n = find_node(c)
            if not n: continue
            k, nk = norm_name(c), norm_name(n['label'])
            if not k or k.split()[0] != nk.split()[0]:
                continue
            a, b = nicknames(c), nicknames(n['label'])
            if a and b and not a & b:
                continue
            return n
    return None

def recover(fname, skip_types=(), skip_sources=(), skip_field=None):
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
        why = None
        if str(l['source']) in skip_sources:
            why = f"source mis-resolved in {fname} (old id {l['source']})"
        elif skip_field and l.get(skip_field):
            why = f'synthetic sample link in {fname} ({skip_field}: {l[skip_field]})'
        sn, tn = find_node_strict(s.get('label','')), find_node_strict(t.get('label',''))
        # The strict match only vetoes. A link it would newly place (a paper
        # title the loose matcher could not read) is not added: those links'
        # direction is as unreliable as the rest of backup_v4's, and nothing
        # here can vouch for them.
        ls, lt = find_node(s.get('label','')), find_node(t.get('label',''))
        if not why and (not (sn and tn) or (sn, tn) != (ls, lt)):
            why = 'name match rejected (strict matching finds no one, or someone else)'
        if why:
            if ls and lt and ls is not lt:      # only what the old matcher would have linked
                recovery_skipped.append((why, l.get('type','influence'), ls, lt, (sn, tn) if sn and tn else None))
            continue
        extra = {k: l[k] for k in ('strength','period','context_he','evidence_source') if l.get(k)}
        if add_link(sn['id'], tn['id'], l.get('type','influence'), **extra):
            n += 1
    return n

r1 = recover('data_with_connections.json')
r2 = recover('data.json.backup_v4', skip_types=('colleague',),
             skip_sources=V4_MISRESOLVED_SOURCES, skip_field=V4_SYNTHETIC_FIELD)
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

# ---------- Validate teacher/student links ----------
# Canonical meaning, as GenealogyTree.tsx (the chain-of-transmission view),
# GeographyPanel.tsx ("Teacher of" / "Student of") and the NetworkGraph edge
# card all read it: the type names the SOURCE's role towards the target.
#   teacher: source is the teacher of target
#   student: source is the student of target
# Both types are kept rather than folding `student` into `teacher`: the sage
# page labels each related sage with the edge type regardless of direction, so
# rewriting a correct `student` edge as `teacher` would change what it shows.
#
# The rules work on the (teacher, student) pair, so they apply to both types.
# "Birth" is birth_year as stored, i.e. the window start when date_precision
# is 'century'.
#  0. a book, topic, event or group at either end: dropped.
#  1. teacher born after student: flipped when both dates are exact, dropped
#     otherwise (the order is then too uncertain to flip).
#  2. exact lifetimes that never overlap, or births more than 90 years apart:
#     downgraded to `influence` from the earlier to the later (who could at
#     most have learned from the other's books), with evidence_source saying
#     so; dropped instead when the pair already has an influence link.
#  3. either end undated: kept.
#  4. the same pair twice (teacher A->B and student B->A) is kept once; a pair
#     where each is the other's teacher is removed, as neither can be trusted.
#     A pair the hand-curated supplement files already state, with their
#     evidence, is left to them: generated edges agreeing with them would only
#     list the same person twice, and ones disagreeing with them are wrong.
# Every change is listed in data/link_validation_report.txt, together with the
# backup_v4 links the recovery above no longer creates.
TS = ('teacher', 'student')
NOT_A_PERSON = {'נושא/מושג', 'נושא', 'ספר', 'חיבור', 'אירוע היסטורי', 'דמויות'}
SUPPLEMENTS = ['data-ancient.json', 'data-supplement.json', 'data-supplement-2.json', 'data-research-links.json']
by_id = {n['id']: n for n in nodes}

def merged_into(i):
    """The id a node was merged into above (recovery ran before the merge)."""
    return globals().get('remap', {}).get(i, i)

def dated(n):
    return n.get('birth_year') is not None and n.get('death_year') is not None

def exact(n):
    # A "lifespan" under 20 years is a tenure or an event misread as one
    # (רב שמואל בן חפני 997–1013, רבי יחיאל מפריז 1260–1268, בר כוכבא 132–136),
    # too weak to flip an edge on.
    return (dated(n) and n.get('date_precision') == 'exact'
            and n['death_year'] - n['birth_year'] >= 20)

def fmt(n):
    n = by_id.get(merged_into(n['id']), n)
    if not dated(n):
        y = 'ללא שנים'
    else:
        y = f"{n['birth_year']}–{n['death_year']}"
        if n.get('date_precision') != 'exact':
            y += ' מאה'
        elif not exact(n):
            y += ', קצר מכדי להיות תוחלת חיים'
    return f"{n['label']} [{n['id']}] ({y})"

def pair(l):
    return (l['source'], l['target']) if l['type'] == 'teacher' else (l['target'], l['source'])

curated = {}
for f in SUPPLEMENTS:
    try:
        with open(os.path.join('nextjs-app', 'public', f), encoding='utf-8') as fh:
            for l in json.load(fh).get('links', []):
                if l.get('type') in TS:
                    curated[frozenset(pair(l))] = (f, pair(l))
    except FileNotFoundError:
        pass

changes = {'dropped (already stated by a curated supplement link)': [], 'dropped (not a person)': [],
           'flipped': [], 'dropped (teacher younger, dates not exact)': [],
           'downgraded to influence': [], 'dropped (downgrade would duplicate an influence link)': [],
           'dropped (duplicate)': [], 'dropped (contradictory)': []}
ts_before = Counter(l['type'] for l in links if l['type'] in TS)
influence_pairs = {frozenset((l['source'], l['target'])) for l in links if l['type'] == 'influence'}
validated = []
for l in links:
    if l['type'] not in TS:
        validated.append(l); continue
    t, s = pair(l)
    T, S = by_id.get(t), by_id.get(s)
    if not T or not S:
        validated.append(l); continue
    desc = f"{l['type']} {l['source']}->{l['target']}: {fmt(T)} teacher of {fmt(S)}"
    if frozenset((t, s)) in curated:                         # rule 4, curated pairs
        f, (ct, cs) = curated[frozenset((t, s))]
        changes['dropped (already stated by a curated supplement link)'].append(
            f"{desc}  ({f} has {by_id[ct]['label']} teacher of {by_id[cs]['label']})")
        continue
    if T.get('chapter_type') in NOT_A_PERSON or S.get('chapter_type') in NOT_A_PERSON:
        changes['dropped (not a person)'].append(desc)       # rule 0
        continue
    if not dated(T) or not dated(S):
        validated.append(l); continue                        # rule 3
    flipped = False
    if T['birth_year'] > S['birth_year']:                    # rule 1
        if not (exact(T) and exact(S)):
            changes['dropped (teacher younger, dates not exact)'].append(desc)
            continue
        t, s, T, S = s, t, S, T
        l = {**l, 'source': l['target'], 'target': l['source']}
        flipped = True
    no_overlap = exact(T) and exact(S) and (T['death_year'] < S['birth_year'] or S['death_year'] < T['birth_year'])
    gap = S['birth_year'] - T['birth_year']
    if no_overlap or gap > 90:                               # rule 2
        why = 'lifetimes do not overlap' if no_overlap else f'births {gap} years apart'
        if frozenset((t, s)) in influence_pairs:
            changes['dropped (downgrade would duplicate an influence link)'].append(f'{desc}  ({why})')
            continue
        ev = ('הורד מקשר רב–תלמיד: ' + ('שנות חייהם אינן חופפות' if no_overlap else f'{gap} שנים בין לידותיהם')
              + '; לכל היותר למד מספריו')
        if l.get('evidence_source'):
            ev += f" | מקור קודם: {l['evidence_source']}"
        rest = {k: v for k, v in l.items() if k not in ('source', 'target', 'type', 'evidence_source')}
        validated.append({'source': t, 'target': s, 'type': 'influence', **rest, 'evidence_source': ev})
        influence_pairs.add(frozenset((t, s)))
        changes['downgraded to influence'].append(
            f"{desc}  =>  influence {t}->{s} ({why}{', after flipping' if flipped else ''})")
        continue
    if flipped:
        changes['flipped'].append(f"{desc}  =>  {l['type']} {l['source']}->{l['target']}")
    validated.append(l)

seen_pairs = {}                                              # rule 4
for l in validated:
    if l['type'] in TS:
        seen_pairs.setdefault(pair(l), []).append(l)
drop = set()
for (t, s), ls in seen_pairs.items():
    if (s, t) in seen_pairs:
        if t < s:
            both = ls + seen_pairs[(s, t)]
            drop.update(id(x) for x in both)
            changes['dropped (contradictory)'].append(
                f"{fmt(by_id[t])} <-> {fmt(by_id[s])}: " + ', '.join(f"{x['type']} {x['source']}->{x['target']}" for x in both))
    elif len(ls) > 1:
        keep = next((x for x in ls if x.get('evidence_source')), ls[0])
        for x in ls:
            if x is not keep:
                drop.add(id(x))
                changes['dropped (duplicate)'].append(
                    f"{x['type']} {x['source']}->{x['target']}: {fmt(by_id[t])} teacher of {fmt(by_id[s])}"
                    f" (same as {keep['type']} {keep['source']}->{keep['target']})")
links = [l for l in validated if id(l) not in drop]

ts_after = Counter(l['type'] for l in links if l['type'] in TS)
print(f'teacher/student validation: {dict(ts_before)} -> {dict(ts_after)}; '
      + ', '.join(f'{k}={len(v)}' for k, v in changes.items() if v))
by_reason = {}
for why, typ, a, b, new in recovery_skipped:
    line = f"{typ}: {fmt(a)} -> {fmt(b)}"
    if new:
        same = merged_into(new[0]['id']) == merged_into(new[1]['id'])
        line += '  (strict match: ' + ('one person at both ends' if same else f"{fmt(new[0])} -> {fmt(new[1])}") + ')'
    by_reason.setdefault(why.split(' (')[0] if why.startswith('synthetic') else why, []).append(line)
with open('data/link_validation_report.txt', 'w', encoding='utf-8') as f:
    f.write('Teacher/student link report. Written by rebuild_data_from_csv.py on every build; do not edit by hand.\n\n')
    f.write('Semantics: teacher = source is the teacher of target; student = source is the student of target.\n')
    f.write('Each node is shown as label [id] (birth–death); "מאה" marks a century window, not a lifespan.\n\n')
    f.write('Part 1. backup_v4 links the recovery no longer creates.\n')
    f.write('Shown as the old matcher resolved them. Colleague links were never recovered and are not listed.\n')
    for why, lines in by_reason.items():
        f.write(f'\n== {why}: {len(lines)} ==\n')
        for line in sorted(lines):
            f.write(f'  {line}\n')
    f.write('\n\nPart 2. Validation of the teacher/student links that were recovered.\n')
    f.write(f'Before: {dict(ts_before)}. After: {dict(ts_after)}.\n')
    for k, v in changes.items():
        f.write(f'\n== {k}: {len(v)} ==\n')
        for line in v:
            f.write(f'  {line}\n')
    # The supplements are hand-curated and merged at load time; this script
    # does not rewrite them, only checks them against the same rules.
    f.write('\n\nPart 3. Teacher/student links in the hand-curated supplement files, checked read-only.\n')
    for fname, (t, s) in sorted(curated.values()):
        T, S = by_id.get(t), by_id.get(s)
        if not T or not S:
            f.write(f'  {fname}: {t} teacher of {s}: NOT SHOWN, id not in the master\n'); continue
        if T.get('chapter_type') in NOT_A_PERSON or S.get('chapter_type') in NOT_A_PERSON:
            verdict = 'PROBLEM: not a person'
        elif not dated(T) or not dated(S):
            verdict = 'ok (undated)'
        elif T['birth_year'] > S['birth_year']:
            verdict = 'PROBLEM: teacher born after student'
        elif exact(T) and exact(S) and (T['death_year'] < S['birth_year'] or S['death_year'] < T['birth_year']):
            verdict = 'PROBLEM: lifetimes do not overlap'
        elif S['birth_year'] - T['birth_year'] > 90:
            verdict = f"PROBLEM: births {S['birth_year'] - T['birth_year']} years apart"
        else:
            verdict = 'ok'
        f.write(f'  {fname}: {fmt(T)} teacher of {fmt(S)}: {verdict}\n')

# ---------- Write ----------
shutil.copy('data.json', 'data.json.backup_pre_rebuild')
json.dump({'nodes': nodes, 'links': links}, open('data.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'\n=== DONE: {len(nodes)} nodes, {len(links)} links ===')
print('era distribution:', dict(era_stats.most_common()))
print('life-year precision:', dict(year_stats.most_common()))
