#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rebuild nextjs-app/public/research/ from data/research_attribution.json.

An audit found 109 of 355 research files (31%) filed under the wrong sage —
including a contiguous index shift across ids 499-562 where nearly every file
held a neighbour's document. Patching that case by case invites new errors, so
the corpus is regenerated wholesale from a mapping in which every document was
read and its subject identified from its own text.

The mapping is keyed by sage NAME. Ids have shifted three times during this
work; names have not. Resolution to ids happens here, at write time.

Translations (<id>.en.json / <id>.ru.json) are the deliverable of a paid batch
job and are never deleted. They are re-homed to follow their Hebrew document to
its corrected id, and anything that cannot be placed is parked, not discarded.

Everything is backed up before a single file is written.
"""
import json, io, os, re, glob, shutil, sys
from datetime import datetime
from docx import Document

REPO = os.path.dirname(os.path.abspath(__file__))
RESEARCH = os.path.join(REPO, 'nextjs-app', 'public', 'research')
ATTR = os.path.join(REPO, 'data', 'research_attribution.json')
DATA = os.path.join(REPO, 'nextjs-app', 'public', 'data.json')
PARK = os.path.join(REPO, 'data', 'parked_research')

def docx_text(path):
    doc = Document(path)
    return '\n'.join(p.text.strip() for p in doc.paragraphs if p.text.strip())

def main(apply_changes):
    attribution = json.load(io.open(ATTR, encoding='utf-8'))['documents']
    roster = json.load(io.open(DATA, encoding='utf-8'))['nodes']
    id_of = {n['label']: n['id'] for n in roster}

    # A merged duplicate leaves one of its two labels off the roster, and any
    # document attributed to the folded-away name would be dropped. Follow the
    # alias pairs in BOTH directions so the document lands on whichever twin
    # survived, without caring which one that was.
    try:
        pairs = json.load(io.open(os.path.join(REPO, 'data', 'sage-aliases-by-name.json'),
                                  encoding='utf-8')).get('pairs', [])
        for p in pairs:
            a, b = p.get('from'), p.get('to')
            if a in id_of and b not in id_of:
                id_of[b] = id_of[a]
            elif b in id_of and a not in id_of:
                id_of[a] = id_of[b]
    except FileNotFoundError:
        pass

    # sage id -> documents destined for it
    plan, unplaceable = {}, []
    for entry in attribution:
        label = entry.get('sage_label')
        if not label:
            unplaceable.append((entry['file'], entry.get('reason', '')))
            continue
        sid = id_of.get(label)
        if not sid:
            unplaceable.append((entry['file'], f'sage not on roster: {label}'))
            continue
        plan.setdefault(sid, []).append(entry)

    # translations, keyed by the id they currently sit under
    translations = {}
    for f in glob.glob(os.path.join(RESEARCH, '*.json')):
        b = os.path.basename(f)
        m = re.match(r'^(\d+)\.(en|ru)\.json$', b)
        if m:
            translations.setdefault(m.group(1), []).append((m.group(2), f))

    # where does each old id's Hebrew content end up now? Match on source_file,
    # which survives the id change; that is how a translation follows its text.
    old_home = {}
    for f in glob.glob(os.path.join(RESEARCH, '*.json')):
        b = os.path.basename(f)
        if not re.match(r'^\d+\.json$', b):
            continue
        try:
            docs = json.load(io.open(f, encoding='utf-8'))
        except Exception:
            continue
        for d in docs:
            src = (d.get('source_file') or '').replace('Google Docs: ', '').strip()
            if src:
                old_home.setdefault(b[:-5], set()).add(src)

    src_to_new = {}
    for sid, entries in plan.items():
        for e in entries:
            src_to_new[e['file']] = sid

    print(f'documents attributed : {sum(len(v) for v in plan.values())}')
    print(f'sages receiving files: {len(plan)}')
    print(f'unplaceable          : {len(unplaceable)}')
    print(f'translation files    : {sum(len(v) for v in translations.values())}')

    if not apply_changes:
        print('\n(dry run — pass --apply to write)')
        return

    stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    backup = os.path.join(REPO, 'data', f'research_backup_{stamp}')
    shutil.copytree(RESEARCH, backup)
    print(f'backup: {os.path.relpath(backup, REPO)}')

    for f in glob.glob(os.path.join(RESEARCH, '*.json')):
        os.remove(f)

    written = words = 0
    failed = []
    for sid, entries in sorted(plan.items()):
        out = []
        for e in entries:
            path = os.path.join(REPO, 'data', e['file'])
            try:
                text = docx_text(path)
            except Exception as ex:
                failed.append((e['file'], str(ex)[:60]))
                continue
            if not text.strip():
                failed.append((e['file'], 'no extractable text'))
                continue
            out.append({
                'title': text.split('\n')[0][:200],
                'source_file': e['file'],
                'word_count': len(text.split()),
                'content': text,
            })
            words += len(text.split())
        if not out:
            continue
        io.open(os.path.join(RESEARCH, f'{sid}.json'), 'w', encoding='utf-8').write(
            json.dumps(out, ensure_ascii=False, indent=2))
        written += 1

    # re-home translations by following the source document they translate
    moved = parked = 0
    os.makedirs(PARK, exist_ok=True)
    for old_id, items in translations.items():
        sources = old_home.get(old_id, set())
        targets = {src_to_new[s] for s in sources if s in src_to_new}
        for lang, path in items:
            # Source from the BACKUP: the live copy was removed when the corpus
            # was cleared a moment ago, and reading it here raised
            # FileNotFoundError mid-run on the first attempt.
            src = os.path.join(backup, os.path.basename(path))
            if not os.path.exists(src):
                continue
            if len(targets) == 1:
                new_id = next(iter(targets))
                shutil.copy(src, os.path.join(RESEARCH, f'{new_id}.{lang}.json'))
                moved += 1
            else:
                shutil.copy(src, os.path.join(PARK, os.path.basename(path)))
                parked += 1

    print(f'\nfiles written        : {written}')
    print(f'words                : {words:,}')
    print(f'extraction failures  : {len(failed)}')
    print(f'translations re-homed: {moved}  parked: {parked}')

    io.open(os.path.join(REPO, 'data', 'corpus_rebuild_report.txt'), 'w', encoding='utf-8').write(
        f'files written: {written}\nwords: {words}\n\n'
        + f'UNPLACEABLE ({len(unplaceable)}):\n'
        + '\n'.join(f'  {f} — {why}' for f, why in unplaceable)
        + f'\n\nEXTRACTION FAILURES ({len(failed)}):\n'
        + '\n'.join(f'  {f} — {why}' for f, why in failed))

if __name__ == '__main__':
    main('--apply' in sys.argv)
