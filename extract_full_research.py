#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract FULL text from data/*.docx research documents.
Outputs: research.json (full content), research_summaries.json,
research_by_sage.json (keyed by current data.json node ids)."""
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

def match_node(filename):
    base = re.sub(r'\.docx$', '', filename)
    base = re.sub(r'\(\d+\)$', '', base).strip()
    # try full name, then split on separators (research titles like "רבי X_ ניתוח...")
    candidates = [base] + re.split(r'[_:–—-]| - ', base)
    for c in candidates:
        k = norm_name(c)
        if k and k in byname: return byname[k]
    # containment
    k = norm_name(base)
    hits = [n for key, n in byname.items() if len(key) > 6 and (key in k)]
    if len(hits) == 1: return hits[0]
    if hits:
        return max(hits, key=lambda n: len(norm_name(n['label'])))
    return None

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
total_words = sum(r['word_count'] for r in research)
print(f'docs: {len(research)} | matched to sages: {matched} | sages with research: {len(by_sage)}')
print(f'total words: {total_words:,} | research.json size: {os.path.getsize("research.json")//1024} KB')
if skipped: print('skipped:', skipped[:5])
