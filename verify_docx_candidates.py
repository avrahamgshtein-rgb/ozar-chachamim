#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
For each sage with no research file, find whether a .docx in data/ is actually
ABOUT them — judged on document content, not filename.

Filenames are unreliable here: matching on them is how the existing corpus
ended up with the Ritva's page holding twelve documents about the Rambam. So a
candidate is only accepted when the sage's distinctive name words appear in the
document's opening text, where a Hebrew research paper states its subject.

Writes data/docx_verified_candidates.json and a readable report.
"""
import json, io, os, re, glob
from docx import Document

STOP = set('''רבי רבנו רבינו הרב רב חכם מרן הרבנית בן בר בעל ספר הגאון המקובל דון
זצל הראשון השני בין בית ארץ ישראל ספרד מצרים אשכנז פרובנס צפת ירושלים בבל תורה
הלכה קבלה משנתו פועלו דמותו הגותו העת ימי הביניים המאה גדולי מגדולי הפוסקים חכמי
תולדות ההלכה התורה הקבלה ההגות המשנה התלמוד הציונות החסידות המוסר הפרשנות לציון
מחקר ניתוח מקיף על של יצירתו שיטתו והשפעתו לדורות בראי התקופה והנהגתו הקהילתית
פרק דוח מומחה ניתוחי היסטורי ותורני'''.split())

def norm(s):
    s = s.replace('״', '"').replace('׳', "'").replace('־', '-').replace('–', '-').replace('_', '"')
    s = re.sub(r'\.docx$', '', s)
    return re.sub(r'[(),:;\[\]{}\'"?!.]', ' ', s)

def key(w):
    return w[0] + w[1:-1].replace('י', '').replace('ו', '') + w[-1] if len(w) > 3 else w

def words(s):
    return {key(w.strip('-')) for w in norm(s).split()
            if len(w.strip('-')) >= 3 and w.strip('-') not in STOP}

# Place epithets ("מדווינסק", "מראדין") are what separate otherwise similar
# rabbinic names. Generic prefixes are excluded so "מלובלין" counts but "משנתו"
# and "מנהיגות" do not.
_EPITHET_NOISE = {'משנתו', 'מנהיגות', 'מקיף', 'מומחה', 'מחקר', 'מבשר', 'מעצב',
                  'מחבר', 'מסורת', 'מפעלות', 'מהפכת', 'מדיניות', 'מנהג'}

def discriminator(name):
    """
    The place epithet in a Hebrew rabbinic name, if it has one.

    The leading מ־ ("of") is stripped, so "מודנה" and "ממודנה" are recognised
    as the same town rather than as two different ones.
    """
    head = re.split(r'[–\-—(:,]', norm(name))[0]
    for w in head.split():
        w = w.strip('-')
        if len(w) >= 5 and w.startswith('מ') and w not in _EPITHET_NOISE:
            core = w[1:] if w.startswith('מ') and len(w) > 5 else w
            return key(core.lstrip('מ'))
    return None

def head_text(path, limit=3000):
    """Opening prose of a .docx — where a research paper names its subject."""
    try:
        doc = Document(path)
    except Exception as e:
        return None, f'unreadable: {e}'
    buf = []
    for p in doc.paragraphs:
        t = p.text.strip()
        if t:
            buf.append(t)
        if sum(len(x) for x in buf) > limit:
            break
    return '\n'.join(buf), None

def main():
    missing = json.load(io.open('missing_ids.json', encoding='utf-8'))
    docs = sorted(glob.glob(os.path.join('data', '*.docx')))
    doc_words = [(d, words(os.path.basename(d))) for d in docs]

    # cache opened documents — the same file is a candidate for several sages
    cache = {}
    results = []

    for m in missing:
        mw = words(m['label'])
        if not mw:
            results.append({**m, 'verdict': 'no-name-words', 'candidates': []})
            continue

        # filename shortlist, then confirm against content
        shortlist = sorted(
            ((len(mw & dw), d) for d, dw in doc_words if mw & dw),
            key=lambda t: -t[0],
        )[:4]

        # A place epithet is the strongest identity signal a Hebrew rabbinic
        # name carries, but generic words can outrank it on raw overlap — the
        # Piaseczner Rebbe's own document sat outside the top four. So pull in
        # anything whose filename shares the epithet, regardless of rank.
        ep = discriminator(m['label'])
        if ep:
            already = {d for _s, d in shortlist}
            for d, dw in doc_words:
                if d in already:
                    continue
                if any(discriminator(w) == ep or key(w) == ep for w in norm(os.path.basename(d)).split()):
                    shortlist.append((len(mw & dw), d))

        cands = []
        for fn_score, path in shortlist:
            if path not in cache:
                cache[path] = head_text(path)
            text, err = cache[path]
            if text is None:
                cands.append({'file': os.path.basename(path), 'filename_score': fn_score,
                              'content_hits': 0, 'error': err})
                continue
            head = text[:1200]
            tw = words(head)
            hits = mw & tw
            # weight the very first line highest: that is the title
            first = words(text.split('\n')[0]) if text else set()
            title_hits = mw & first
            cands.append({
                'file': os.path.basename(path),
                'filename_score': fn_score,
                'content_hits': len(hits),
                'title_hits': len(title_hits),
                'first_line': text.split('\n')[0][:120] if text else '',
            })

        # An agreeing place epithet outranks raw word overlap: it is the one
        # token that actually identifies a Hebrew rabbinic name. Without this
        # the Piaseczner Rebbe's own paper tied with an unrelated document and
        # lost on list order.
        ep_sort = discriminator(m['label'])
        def rank(c):
            other = discriminator(c.get('first_line', ''))
            agrees = 1 if (ep_sort and other and ep_sort == other) else 0
            return (-agrees, -c.get('title_hits', 0), -c.get('content_hits', 0))
        cands.sort(key=rank)

        # Shared generic components are not identity. "רבי מאיר שמחה הכהן
        # מדווינסק" and "רבי ישראל מאיר הכהן מראדין" agree on מאיר and הכהן
        # and are different people; what separates them is the toponym. So when
        # both names carry a place epithet, the epithets must agree.
        #
        # A failing top candidate does not condemn the sage: the correct
        # document is often further down the list, as it was for the
        # Piaseczner Rebbe, whose match sat third behind two other Rebbes.
        epithet = discriminator(m['label'])
        best = None
        for c in cands:
            if c.get('error'):
                continue
            other = discriminator(c.get('first_line', ''))
            if epithet and other and epithet != other:
                c['rejected_by'] = f'epithet {epithet} != {other}'
                continue
            best = c
            break

        if best is None:
            results.append({**m, 'verdict': 'rejected', 'candidates': cands})
            continue

        best_ep = discriminator(best.get('first_line', ''))
        epithet_agrees = bool(epithet and best_ep and epithet == best_ep)

        if best and best.get('title_hits', 0) >= 2:
            verdict = 'confirmed'
        elif epithet_agrees and best.get('title_hits', 0) >= 1:
            # A shared town is NOT identity — רבי משה הדרשן מנרבונה and רבינו
            # מנוח מנרבונה are two different sages of Narbonne. So an agreeing
            # epithet only lifts a candidate to review, never to confirmed.
            verdict = 'likely'
        elif best and best.get('title_hits', 0) == 1 and best.get('content_hits', 0) >= 2:
            verdict = 'likely'
        elif best and best.get('content_hits', 0) >= 2:
            verdict = 'uncertain'
        else:
            verdict = 'none'
        results.append({**m, 'verdict': verdict, 'candidates': cands})

    io.open('data/docx_verified_candidates.json', 'w', encoding='utf-8').write(
        json.dumps(results, ensure_ascii=False, indent=2))

    counts = {}
    for r in results:
        counts[r['verdict']] = counts.get(r['verdict'], 0) + 1

    lines = ['בדיקת מסמכים בתיקיית data/ עבור חכמים ללא מחקר', '']
    for k in ('confirmed', 'likely', 'uncertain', 'none', 'no-name-words'):
        if k in counts:
            lines.append(f'{k}: {counts[k]}')
    lines.append('')
    for k in ('confirmed', 'likely', 'uncertain'):
        grp = [r for r in results if r['verdict'] == k]
        if not grp:
            continue
        lines.append(f'==== {k.upper()} ({len(grp)}) ====')
        for r in grp:
            c = r['candidates'][0]
            lines.append(f"[{r['id']}] {r['label'][:52]}")
            lines.append(f"      -> {c['file']}")
            lines.append(f"      title_hits={c.get('title_hits')} content_hits={c.get('content_hits')}")
            lines.append(f"      opens: {c.get('first_line','')[:100]}")
            lines.append('')
    io.open('docx_verified_report.txt', 'w', encoding='utf-8').write('\n'.join(lines))
    print('verdicts:', counts)
    print('documents opened:', len(cache))

if __name__ == '__main__':
    main()
