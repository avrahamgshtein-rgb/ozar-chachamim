#!/usr/bin/env python3
"""Append the translation of a NEW document to a sage's existing English and Russian files.

A sage whose site paper exists already (and is translated) can gain a second document. Only the new document is translated:
  1. put the new document alone in a scratch folder as <scratch>/<id>.json (the same shape as the research files)
  2. TX_RES=<scratch> TX_WORK=<work> tx_prepare / tx_api / tx_build as usual, which write <scratch>/<id>.en.json and <id>.ru.json
  3. TX_RES=<scratch> python3 tx_append.py <id> [--write]

It checks that the Hebrew file in the repo is the old document(s) plus exactly that new document at the end, that the repo's English
and Russian files hold the old documents only, and that the scratch translation is line-aligned with the new document; then it
appends the translated document, leaving every byte of the old ones as it was (the files' own formatting, indent 1, is kept).
Without --write it only checks.
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tx_lib import *

REPO_RES = f'{REPO}/nextjs-app/public/research'
sid = sys.argv[1]
write = '--write' in sys.argv
if RES == REPO_RES:
    sys.exit('set TX_RES to the scratch folder')
new_he = json.load(open(f'{RES}/{sid}.json', encoding='utf-8'))
assert len(new_he) == 1
he_raw = open(f'{REPO_RES}/{sid}.json', encoding='utf-8').read()
he = json.loads(he_raw)
assert he[-1] == new_he[0], 'the last document of the repo paper is not the scratch document'
for lang in ('en', 'ru'):
    p = f'{REPO_RES}/{sid}.{lang}.json'
    raw = open(p, encoding='utf-8').read()
    old = json.loads(raw)
    assert json.dumps(old, ensure_ascii=False, indent=1) == raw, f'{p} does not round-trip'
    assert len(old) == len(he) - 1, f'{p} has {len(old)} docs, the Hebrew paper had {len(he) - 1}'
    tr = json.load(open(f'{RES}/{sid}.{lang}.json', encoding='utf-8'))
    assert len(tr) == 1 and sorted(tr[0]) == sorted(new_he[0])
    assert len(lines_of(tr[0]['content'])) == len(lines_of(new_he[0]['content'])), 'line count differs'
    out = json.dumps(old + tr, ensure_ascii=False, indent=1)
    assert raw.endswith('\n]') and out.startswith(raw[:-2] + ','), 'the old documents would change'
    print(f'{sid}.{lang}: ok, {len(old)} old doc(s) kept, new document {tr[0]["word_count"]} words')
    if write:
        open(p, 'w', encoding='utf-8').write(out)
