#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Export the sages that exist in the master spreadsheet but have no research
document yet, so they can be filled in later.

A sage "has research" when nextjs-app/public/research/<id>.json exists. The
id is the join key across the whole system, so this is the same check the site
itself makes when deciding whether to show a research section.

Writes data/חכמים_ללא_מחקר.xlsx, ordered chronologically by period.
"""
import json, io, os, glob, openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

REPO = os.path.dirname(os.path.abspath(__file__))
MASTER = os.path.join(REPO, 'data', 'חכמי_ישראל.xlsx')
DATA = os.path.join(REPO, 'nextjs-app', 'public', 'data.json')
RESEARCH = os.path.join(REPO, 'nextjs-app', 'public', 'research')
OUT = os.path.join(REPO, 'data', 'חכמים_ללא_מחקר.xlsx')

PERIOD_HE = {
    'patriarchs': 'האבות', 'exodus': 'יציאת מצרים', 'judges': 'השופטים',
    'kings': 'המלכים', 'second-temple': 'בית שני', 'tannaim': 'תנאים',
    'amoraim': 'אמוראים', 'geonim': 'גאונים', 'rishonim': 'ראשונים',
    'acharonim': 'אחרונים', 'modern': 'מודרני',
}
ORDER = list(PERIOD_HE.keys())

data = json.load(io.open(DATA, encoding='utf-8'))
nodes = {x['id']: x for x in data['nodes']}

have = {
    os.path.splitext(os.path.basename(f))[0]
    for f in glob.glob(os.path.join(RESEARCH, '*.json'))
    if '.en.' not in f and '.ru.' not in f
}

wb = openpyxl.load_workbook(MASTER)
ws = wb.active
hdr = [str(c.value).strip() if c.value else '' for c in ws[1]]
col = {h: i for i, h in enumerate(hdr)}
master = {}
for r in ws.iter_rows(min_row=2, values_only=True):
    sid = str(r[col['מזהה']]).strip() if r[col['מזהה']] is not None else ''
    if sid and sid not in master:
        master[sid] = r
wb.close()

def cell(row, name):
    i = col.get(name)
    if row is None or i is None or i >= len(row) or row[i] is None:
        return ''
    return str(row[i]).strip()

# Candidate .docx already sitting in data/, verified against document content
# by verify_docx_candidates.py. Surfaced here so one file answers both "who is
# missing research" and "for whom is the material already on disk".
VERDICT_HE = {
    'confirmed': 'מאושר',
    'likely': 'סביר — לבדיקה',
    'uncertain': 'לא ודאי',
    'rejected': 'נפסל — מסמך של אדם אחר',
    'none': '',
    'no-name-words': '',
}
cand_by_id = {}
try:
    for r in json.load(io.open(os.path.join(REPO, 'data', 'docx_verified_candidates.json'), encoding='utf-8')):
        c = r['candidates'][0] if r.get('candidates') else {}
        cand_by_id[r['id']] = {
            'verdict': VERDICT_HE.get(r['verdict'], r['verdict']),
            'file': c.get('file', '') if r['verdict'] in ('confirmed', 'likely', 'uncertain') else '',
            'opens': c.get('first_line', '') if r['verdict'] in ('confirmed', 'likely', 'uncertain') else '',
        }
except FileNotFoundError:
    pass

records = []
for sid, n in nodes.items():
    if sid in have:
        continue
    m = master.get(sid)
    cand = cand_by_id.get(sid, {})
    records.append({
        'id': sid,
        'name': n.get('label', ''),
        'period': PERIOD_HE.get(n.get('era_key', ''), n.get('era_key', '')),
        'period_key': n.get('era_key', ''),
        'years': n.get('era', ''),
        'region': n.get('location', ''),
        'field': n.get('field', ''),
        'tags': n.get('tags', ''),
        'summary': n.get('bio', ''),
        'idea': cell(m, 'רעיון מרכזי/חידוש'),
        'related': cell(m, 'דמויות/השפעות קשורות'),
        'spotify': n.get('spotify_url', ''),
        'cand_verdict': cand.get('verdict', ''),
        'cand_file': cand.get('file', ''),
        'cand_opens': cand.get('opens', ''),
    })

RANK = {'מאושר': 0, 'סביר — לבדיקה': 1, 'לא ודאי': 2}
records.sort(key=lambda r: (RANK.get(r['cand_verdict'], 9),
                            ORDER.index(r['period_key']) if r['period_key'] in ORDER else 99,
                            r['name']))

out = openpyxl.Workbook()
sh = out.active
sh.title = 'חכמים ללא מחקר'
sh.sheet_view.rightToLeft = True

COLS = [
    ('מזהה', 'id', 8),
    ('שם הדמות/הנושא', 'name', 42),
    ('תקופה', 'period', 14),
    ('שנים', 'years', 20),
    ('אזור/מרחב', 'region', 26),
    ('תחום עיקרי', 'field', 24),
    ('תגיות', 'tags', 30),
    ('תקציר', 'summary', 60),
    ('רעיון מרכזי', 'idea', 45),
    ('דמויות קשורות', 'related', 30),
    ('קישור ספוטיפיי', 'spotify', 26),
    ('מסמך בתיקייה?', 'cand_verdict', 20),
    ('שם הקובץ המועמד', 'cand_file', 55),
    ('שורת הפתיחה של המסמך', 'cand_opens', 55),
]

head_fill = PatternFill('solid', fgColor='1A140E')
head_font = Font(bold=True, color='E8B84B', size=11)
thin = Side(style='thin', color='D9CDB8')

for j, (title, _, width) in enumerate(COLS, start=1):
    c = sh.cell(row=1, column=j, value=title)
    c.fill, c.font = head_fill, head_font
    c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    sh.column_dimensions[get_column_letter(j)].width = width

for i, rec in enumerate(records, start=2):
    for j, (_, key, _w) in enumerate(COLS, start=1):
        c = sh.cell(row=i, column=j, value=rec[key])
        c.alignment = Alignment(vertical='top',
                                wrap_text=(key in ('summary', 'idea', 'tags', 'related', 'cand_file', 'cand_opens')))
        c.border = Border(bottom=thin)

sh.freeze_panes = 'A2'
sh.auto_filter.ref = f'A1:{get_column_letter(len(COLS))}{len(records) + 1}'
sh.row_dimensions[1].height = 28

out.save(OUT)

by_period = {}
for r in records:
    by_period[r['period']] = by_period.get(r['period'], 0) + 1
with_spotify = sum(1 for r in records if r['spotify'])
with_doc = sum(1 for r in records if r['cand_verdict'] in ('מאושר', 'סביר — לבדיקה', 'לא ודאי'))

print(f'sages without research : {len(records)}')
print(f'  of those, have a Spotify episode : {with_spotify}')
print(f'  of those, a document already sits in data/ : {with_doc}')
print(f'written: {os.path.relpath(OUT, REPO).encode("ascii", "backslashreplace").decode()}')
io.open(os.path.join(REPO, 'missing_research_summary.txt'), 'w', encoding='utf-8').write(
    f'חכמים ללא מחקר: {len(records)}\nעם פרק ספוטיפיי: {with_spotify}\n\nלפי תקופה:\n'
    + '\n'.join(f'  {k}: {v}' for k, v in sorted(by_period.items(), key=lambda t: -t[1]))
    + '\n\nרשימה:\n'
    + '\n'.join(f"{r['id']:>5} | {r['period']:<12} | {r['name']}" for r in records)
)
