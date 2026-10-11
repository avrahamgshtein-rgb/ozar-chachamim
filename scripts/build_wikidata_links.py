#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Find each sage's Hebrew Wikipedia article, English Wikipedia article and Hebrew
Wikisource author page ("מחבר:...", where the texts he wrote are collected), so the
sage page can link to the exact article instead of a search.

    python3 scripts/build_wikidata_links.py            # writes nextjs-app/public/data-wikipedia.json
    python3 scripts/build_wikidata_links.py --report   # same, and prints every match and every near miss

How a sage is matched (the join is on names; ids drift):
  1. Hebrew Wikipedia is asked, 50 titles to a request, which of the sage's names
     (his name, the names in the parentheses of his label, and the Wikipedia link
     Sefaria already holds for him) are articles. Redirects are followed, and a
     disambiguation page is dropped. The answer includes each article's Wikidata item.
  2. Wikidata is asked, 20 items to a request, for each item's claims and sitelinks.
     A candidate must be a person (human, or a human biblical figure).
  3. Then the years decide, as in build_sefaria_links.py: his birth and death years
     must agree with the roster's. When either side has no years (the tannaim, the
     prophets), a candidate is accepted only if its Hebrew label or alias is exactly
     the sage's name and it is the only such person. Anything else is left unmatched
     and printed with --report.

Why batches: Wikimedia's anonymous API limit is per address, and from a shared
address a request a second is answered with 429 and a 20-second wait. About eighty
batched requests, paced and cached under --cache, finish where one request per
candidate would not. Retry-After is honoured, and the run can be stopped and resumed.
"""
import argparse, hashlib, json, os, re, subprocess, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sage_names import raw_names, relation, variants, years_ok  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(REPO, 'nextjs-app', 'public', 'data.json')
SEFARIA = os.path.join(REPO, 'nextjs-app', 'public', 'data-sefaria.json')
OUT = os.path.join(REPO, 'nextjs-app', 'public', 'data-wikipedia.json')
UA = 'OzarChachamim/1.0 (https://github.com/avrahamgshtein-rgb/ozar-chachamim; linking sages to their articles)'

ap = argparse.ArgumentParser()
ap.add_argument('--cache', default=os.path.join(os.environ.get('TMPDIR', '/tmp'), 'wikidata-cache'))
ap.add_argument('--report', action='store_true')
ap.add_argument('--pause', type=float, default=3.0, help='seconds between uncached requests')
ap.add_argument('--limit', type=int, default=0, help='only the first N sages (for a trial run)')
args = ap.parse_args()
os.makedirs(args.cache, exist_ok=True)

HUMAN = {'Q5', 'Q20643955'}  # human, human biblical figure


def call(base, **params):
    """One API call, cached on disk, paced, Retry-After honoured. Returns parsed JSON or None."""
    params['format'] = 'json'
    url = base + '?' + urllib.parse.urlencode(params)
    f = os.path.join(args.cache, hashlib.sha1(url.encode()).hexdigest() + '.json')
    if os.path.exists(f):
        return json.load(open(f, encoding='utf-8'))
    for _ in range(10):
        time.sleep(args.pause)
        r = subprocess.run(['curl', '-s', '-m', '120', '-A', UA, '-D', '-', '--compressed', url], capture_output=True)
        head, _, body = r.stdout.partition(b'\r\n\r\n')
        while body.startswith(b'HTTP/'):   # curl -D - prints every response of a redirect chain
            head, _, body = body.partition(b'\r\n\r\n')
        status = head.split(b' ', 2)[1] if head.startswith(b'HTTP/') else b'0'
        if status == b'429':
            m = re.search(rb'(?i)retry-after:\s*(\d+)', head)
            time.sleep(int(m.group(1)) + 1 if m else 20)
            continue
        if status != b'200':
            print('HTTP', status.decode(), url[:140], file=sys.stderr)
            return None
        try:
            j = json.loads(body)
        except ValueError:
            return None
        json.dump(j, open(f, 'w', encoding='utf-8'), ensure_ascii=False)
        return j
    print('gave up (429)', url[:140], file=sys.stderr)
    return None


def wikipedia_title(guess):
    """Hebrew Wikipedia writes gershayim as an ASCII quote."""
    return guess.replace('״', '"').replace('׳', "'").strip()


def resolve_titles(titles):
    """title -> (final title, Wikidata item) for every title that is an article.
    Redirects are followed; disambiguation pages and missing pages are left out."""
    found = {}
    titles = sorted(set(titles))
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        r = call('https://he.wikipedia.org/w/api.php', action='query', titles='|'.join(chunk), redirects=1,
                 prop='pageprops', ppprop='wikibase_item|disambiguation', formatversion=2)
        q = (r or {}).get('query', {})
        hop = {}
        for x in q.get('normalized', []):
            hop[x['from']] = x['to']
        for x in q.get('redirects', []):
            hop[x['from']] = x['to']
        pages = {p['title']: p for p in q.get('pages', [])}
        for t in chunk:
            cur = t
            for _ in range(4):
                if cur in hop:
                    cur = hop[cur]
            p = pages.get(cur)
            if not p or p.get('missing'):
                continue
            pp = p.get('pageprops') or {}
            if 'disambiguation' in pp or not pp.get('wikibase_item'):
                continue
            found[t] = (p['title'], pp['wikibase_item'])
    return found


def entities(qids):
    """Claims, sitelinks, labels and aliases for items, 20 to a request."""
    out = {}
    qids = sorted(set(qids))
    for i in range(0, len(qids), 20):
        r = call('https://www.wikidata.org/w/api.php', action='wbgetentities', ids='|'.join(qids[i:i + 20]),
                 props='claims|sitelinks|labels|aliases', languages='he|en')
        out.update((r or {}).get('entities', {}))
    return out


def year_of(claim_list):
    for c in claim_list or []:
        v = (c.get('mainsnak', {}).get('datavalue') or {}).get('value')
        if isinstance(v, dict) and v.get('time') and v.get('precision', 0) >= 7:
            m = re.match(r'^([+-])(\d+)-', v['time'])
            if m:
                return int(m.group(2)) * (1 if m.group(1) == '+' else -1)
    return None


def is_human(e):
    return any(((c.get('mainsnak', {}).get('datavalue') or {}).get('value') or {}).get('id') in HUMAN
               for c in e.get('claims', {}).get('P31', []))


def title_of(e, site):
    return (e.get('sitelinks', {}).get(site) or {}).get('title')


def main():
    sages = json.load(open(DATA, encoding='utf-8'))['nodes']
    if args.limit:
        sages = sages[: args.limit]
    sefaria = json.load(open(SEFARIA, encoding='utf-8'))['authors'] if os.path.exists(SEFARIA) else {}

    # 1. which of the sage's names are Hebrew Wikipedia articles
    guesses = {}
    for s in sages:
        g = []
        he = ((sefaria.get(s['id']) or {}).get('wiki') or {}).get('he')   # Sefaria's own link first
        if he:
            g.append(wikipedia_title(he))
        g += [wikipedia_title(n) for n in raw_names(s['label'])[:4]]
        guesses[s['id']] = list(dict.fromkeys(g))
    resolved = resolve_titles([t for g in guesses.values() for t in g])

    # 2. who those articles are about
    cand = {s['id']: list(dict.fromkeys(resolved[t][1] for t in guesses[s['id']] if t in resolved)) for s in sages}
    ents = entities([q for qs in cand.values() for q in qs])

    # 3. keep a candidate only if it is this sage
    matches, ties, rejected = {}, [], []
    for s in sages:
        wanted = set(variants(s['label']))
        verified = []
        for q in cand[s['id']]:
            e = ents.get(q)
            if not e or not is_human(e):
                continue
            prop = {'birthYear': {'value': year_of(e['claims'].get('P569'))},
                    'deathYear': {'value': year_of(e['claims'].get('P570'))}}
            verdict = years_ok(s, prop, need_years=True)
            names = [(e.get('labels', {}).get('he') or {}).get('value', '')]
            names += [a['value'] for a in e.get('aliases', {}).get('he', [])]
            exact = any(relation(n, wanted) == 'exact' for n in names if n)
            if verdict is True:
                verified.append((q, 'years'))
            elif verdict is None and exact:
                verified.append((q, 'name'))
        by_years = [v for v in verified if v[1] == 'years']
        pick = by_years or verified
        if len(pick) == 1:
            matches[s['id']] = (s, pick[0][0], pick[0][1], ents[pick[0][0]])
        elif len(pick) > 1:
            ties.append((s, [p[0] for p in pick]))
        else:
            rejected.append(s)

    # one article, one sage: an article two sages lead to belongs to neither
    claimed = {}
    for sid, (s, q, how, e) in matches.items():
        claimed.setdefault(q, []).append(sid)
    shared = []
    for q, sids in claimed.items():
        if len(sids) > 1:
            for sid in sids:
                shared.append(matches.pop(sid)[0])

    out = {}
    for sid, (s, qid, how, e) in matches.items():
        entry = {'label': s['label'], 'qid': qid, 'how': how}
        for key, site in (('he', 'hewiki'), ('en', 'enwiki'), ('wikisource', 'hewikisource')):
            t = title_of(e, site)
            # Wikisource also links categories ("קטגוריה:...") and single works for some
            # people; only an author page ("מחבר:...") collects the texts he wrote.
            if t and (site != 'hewikisource' or t.startswith('מחבר:')):
                entry[key] = t
        out[sid] = entry

    doc = {
        '_about': 'Generated by scripts/build_wikidata_links.py from wikipedia.org and wikidata.org. Keys are sage ids; he/en are Wikipedia article titles, wikisource is the Hebrew Wikisource author page.',
        'sages': dict(sorted(out.items(), key=lambda kv: int(kv[0]))),
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')

    ws = sum(1 for e in out.values() if 'wikisource' in e)
    print('sages: %d | matched: %d (%d with a Wikisource page) | tie: %d | article claimed twice: %d | no candidate passed: %d'
          % (len(sages), len(out), ws, len(ties), len(shared), len(rejected)))
    if args.report:
        print('\n== MATCHED ==')
        for sid, (s, qid, how, e) in matches.items():
            print('%4s %-36s -> %-11s %-6s %-26s | %s' % (sid, s['label'].split(' – ')[0][:36], qid, how,
                                                          (title_of(e, 'hewiki') or '-')[:26], title_of(e, 'hewikisource') or '-'))
        print('\n== TIES (not used) ==')
        for s, qs in ties:
            print('%4s %s -> %s' % (s['id'], s['label'].split(' – ')[0], qs))
        print('\n== ARTICLE CLAIMED TWICE (not used) ==')
        for s in shared:
            print('%4s %s' % (s['id'], s['label'].split(' – ')[0]))
        print('\n== NO CANDIDATE PASSED ==')
        for s in rejected:
            print('%4s %s' % (s['id'], s['label'].split(' – ')[0]))


main()
