#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Match each sage on the roster to his author page on Sefaria and record the works
Sefaria lists under that author, so a sage's page can link straight to his writings.

    python3 scripts/build_sefaria_links.py            # writes nextjs-app/public/data-sefaria.json
    python3 scripts/build_sefaria_links.py --report   # same, and prints every match and every near miss

How a sage is matched (names are stable, ids are not, so the join is on names):
  1. Sefaria's topic list (all ~4,400 topics, Hebrew and English titles) is indexed
     by the normalized Hebrew title. A sage's name, and every name inside the
     parentheses of its label ("רש״י (רבי שלמה יצחקי)"), is looked up there.
  2. Each candidate is fetched (/api/topics/<slug>?with_indexes=1) and must pass a
     check against the sage, because the same name belongs to several people:
       - the birth/death years agree (within 20 years for the closest pair, 60 for
         the other), or, when one side has no years, the era agrees;
       - Sefaria knows works for it (a person without works has nothing to link to).
  3. A candidate that fails is not used. Several candidates that pass is a tie and
     is not used either. Both are printed with --report for a human to settle.

The result lists only what Sefaria itself returns for the author; nothing is
written by hand except the optional MANUAL map below for people whose books
Sefaria files under the book, not under an author (the prophets, for example).

Network: only sefaria.org, with a short pause between requests. Responses are
cached under --cache so a re-run costs nothing.
"""
import argparse, hashlib, json, os, re, subprocess, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sage_names import ERA, GENERIC, HONORIFIC, forms, norm, raw_names, variants, years_ok  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(REPO, 'nextjs-app', 'public', 'data.json')
OUT = os.path.join(REPO, 'nextjs-app', 'public', 'data-sefaria.json')
API = 'https://www.sefaria.org/api'

ap = argparse.ArgumentParser()
ap.add_argument('--cache', default=os.path.join(os.environ.get('TMPDIR', '/tmp'), 'sefaria-cache'))
ap.add_argument('--report', action='store_true')
ap.add_argument('--max-works', type=int, default=24)
args = ap.parse_args()
os.makedirs(args.cache, exist_ok=True)

# People whose writings Sefaria files under the book rather than under an author page.
# sage id -> list of (Sefaria index title in English, Hebrew title). Verified by hand
# against the roster; extend deliberately.
# Where two sages carry names that lead to one Sefaria page, the page belongs to
# the one named here. (Isaiah di Trani the Elder, "הרי״ד הזקן", wrote the Tosafot
# Rid; his grandson of the same name, "הריא״ז", is a different man whom Sefaria
# does not list under that page.)
PREFER = {'isaiah-dtrani': '308'}

# Keyed by Sefaria topic slug.
MANUAL = {
    'moses': [('Torah', 'תורה', '/texts/Tanakh/Torah')],
    'king-david': [('Psalms', 'תהלים', '/Psalms')],
    'king-solomon': [('Proverbs', 'משלי', '/Proverbs'), ('Ecclesiastes', 'קהלת', '/Ecclesiastes'),
                     ('Song of Songs', 'שיר השירים', '/Song_of_Songs')],
    'isaiah': [('Isaiah', 'ישעיהו', '/Isaiah')],
    'ezra': [('Ezra', 'עזרא', '/Ezra')],
}


def get(path):
    """GET a Sefaria API path, cached on disk. Returns parsed JSON or None."""
    key = hashlib.sha1(path.encode()).hexdigest()
    f = os.path.join(args.cache, key + '.json')
    if os.path.exists(f):
        return json.load(open(f, encoding='utf-8'))
    time.sleep(0.12)
    r = subprocess.run(['curl', '-sS', '-m', '60', '--compressed', API + path], capture_output=True)
    if r.returncode != 0 or not r.stdout:
        print('FAILED', path, r.stderr.decode()[:100], file=sys.stderr)
        return None
    try:
        j = json.loads(r.stdout)
    except ValueError:
        return None
    json.dump(j, open(f, 'w', encoding='utf-8'), ensure_ascii=False)
    return j


def main():
    sages = json.load(open(DATA, encoding='utf-8'))['nodes']
    topics = get('/topics?limit=0')
    if not topics:
        sys.exit('could not fetch the Sefaria topic list')
    by_title = {}
    for t in topics:
        titles = [x['text'] for x in t.get('titles', []) if x.get('lang') == 'he'] + [t.get('he') or '']
        for title in titles:
            for n in forms(norm(title), title):
                if n:
                    by_title.setdefault(n, set()).add(t['slug'])

    # Loose matching: Sefaria often gives only "רבי עקיבא" where the roster has
    # "רבי עקיבא בן יוסף". Both directions are tried, but a loose match is only
    # accepted when the birth/death years agree, never on the era alone.
    title_tokens = []
    for t in topics:
        for title in [x['text'] for x in t.get('titles', []) if x.get('lang') == 'he'] + [t.get('he') or '']:
            tk = frozenset(norm(title).split()) - GENERIC
            if len(tk) >= 2:
                title_tokens.append((t['slug'], tk))

    def loose(label):
        found = []
        for v in variants(label):
            vt = frozenset(v.split()) - GENERIC
            if not vt:
                continue
            for slug, tk in title_tokens:
                if slug in found:
                    continue
                if (len(tk) >= 2 and tk <= vt) or (len(vt) >= 2 and vt <= tk):
                    found.append(slug)
        return found

    detail_cache = {}

    def detail(slug):
        if slug not in detail_cache:
            detail_cache[slug] = get('/topics/%s?with_indexes=1&with_refs=0' % urllib.parse.quote(slug))
        return detail_cache[slug]

    def evaluate(s, slugs, exact):
        """Sort candidate slugs into (works verified, person pages, rejected)."""
        good, persons, bad = [], [], []
        for slug in slugs:
            d = detail(slug)
            if not d or d.get('subclass') not in ('author', 'person'):
                continue
            verdict = years_ok(s, d.get('properties') or {}, need_years=slug not in exact)
            works = d.get('indexes') or []
            if verdict is True and works:
                good.append((slug, d))
            elif not works and (verdict is True or (slug in exact and verdict is None)):
                # A person Sefaria lists no books for (the tannaim, the prophets):
                # the topic page still collects every source in which he appears.
                # Accepted when the years agree, or when the name is exactly his
                # and nothing contradicts it.
                persons.append((slug, d))
            else:
                bad.append((slug, verdict, len(works), d))
        return good, persons, bad

    def name_search(s):
        """Candidates from Sefaria's name search for sages the topic list did not
        settle. The search is fuzzy ("בעל העקידה" returns "בעל הסולם"), so a result
        counts only if its title is the sage's name, or contains it, or is contained
        in it; the birth/death years then decide, as for any loose match."""
        found, exact = [], set()
        wanted = set(variants(s['label']))
        for q in raw_names(s['label']):
            r = get('/name/%s?limit=10' % urllib.parse.quote(q))
            for c in (r or {}).get('completion_objects', []):
                if c.get('type') not in ('AuthorTopic', 'PersonTopic'):
                    continue
                tn = norm(c['title'])
                is_exact = any(f in wanted for f in forms(tn, c['title']))
                tt = frozenset(tn.split()) - GENERIC
                is_loose = any(
                    (len(tt) >= 2 and tt <= vt) or (len(vt) >= 2 and vt <= tt)
                    for vt in (frozenset(v.split()) - GENERIC for v in wanted) if vt)
                if (is_exact or is_loose) and c['key'] not in found:
                    found.append(c['key'])
                    if is_exact:
                        exact.add(c['key'])
        return found, exact

    matches, ties, rejected, nothing = {}, [], [], []
    for s in sages:
        slugs = []
        for v in variants(s['label']):
            for slug in sorted(by_title.get(v, ())):
                if slug not in slugs:
                    slugs.append(slug)
        exact = set(slugs)
        for slug in loose(s['label']):
            if slug not in slugs:
                slugs.append(slug)
        good, persons, bad = evaluate(s, slugs, exact) if slugs else ([], [], [])
        if not good and not persons:
            more, more_exact = name_search(s)
            more = [m for m in more if m not in slugs]
            if more:
                g2, p2, b2 = evaluate(s, more, more_exact)
                good, persons, bad = good + g2, persons + p2, bad + b2
                slugs += more
        if not slugs:
            nothing.append(s)
            continue
        if len(good) == 1:
            matches[s['id']] = (s, good[0][0], good[0][1])
        elif len(good) > 1:
            ties.append((s, [g[0] for g in good]))
        elif len(persons) == 1:
            matches[s['id']] = (s, persons[0][0], persons[0][1])
        elif len(persons) > 1:
            ties.append((s, [g[0] for g in persons]))
        else:
            rejected.append((s, bad))

    # One page, one sage. A page claimed by two sages goes to the one in PREFER; if
    # there is none, to neither, and both are reported.
    claimed = {}
    for sid, (s, slug, d) in matches.items():
        claimed.setdefault(slug, []).append(sid)
    shared = []
    for slug, sids in claimed.items():
        if len(sids) < 2:
            continue
        keep = PREFER.get(slug)
        for sid in sids:
            if sid != keep:
                shared.append((matches.pop(sid)[0], slug))

    out = {}
    for sid, (s, slug, d) in matches.items():
        works = []
        for en, he, url in MANUAL.get(slug, []):
            works.append({'he': he, 'en': en, 'url': url})
        for w in d.get('indexes') or []:
            title = w.get('title') or {}
            works.append({
                'he': title.get('he') or '',
                'en': title.get('en') or '',
                'url': w['url'],
                **({'cat': True} if w.get('isCategory') else {}),
            })
        # Sefaria's own links to the person's Wikipedia articles, as article titles
        wiki = {}
        for key, prop in (('he', 'heWikiLink'), ('en', 'enWikiLink')):
            url = ((d.get('properties') or {}).get(prop) or {}).get('value') or ''
            if '/wiki/' in url:
                wiki[key] = urllib.parse.unquote(url.split('/wiki/', 1)[1]).split('#')[0].replace('_', ' ')
        out[sid] = {
            # The roster label is stored so a test can notice when an id has been
            # given to a different sage (ids drift, names do not).
            'label': s['label'],
            'slug': slug,
            'kind': 'author' if d.get('indexes') else 'person',
            'he': d.get('he') or '',
            'en': d.get('en') or '',
            'total': len(works),
            'works': works[: args.max_works],
            **({'wiki': wiki} if wiki else {}),
        }

    doc = {
        '_about': 'Generated by scripts/build_sefaria_links.py from sefaria.org/api. Keys are sage ids; works are what Sefaria lists for the author.',
        'authors': dict(sorted(out.items(), key=lambda kv: int(kv[0]))),
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')

    print('sages: %d | matched: %d | tie: %d | page claimed twice: %d | rejected: %d | no Sefaria topic by that name: %d'
          % (len(sages), len(matches), len(ties), len(shared), len(rejected), len(nothing)))
    for s, slug in shared:
        print('  not used: %s %s also leads to %s' % (s['id'], s['label'].split(' – ')[0], slug))
    if args.report:
        print('\n== MATCHED ==')
        for sid, (s, slug, d) in matches.items():
            print('%4s %-40s -> %-28s %-24s %2d works  years %s-%s vs %s-%s' % (
                sid, s['label'].split(' – ')[0][:40], slug, (d.get('he') or '')[:24], len(d.get('indexes') or []),
                s.get('birth_year'), s.get('death_year'),
                ((d.get('properties') or {}).get('birthYear') or {}).get('value'),
                ((d.get('properties') or {}).get('deathYear') or {}).get('value')))
        print('\n== TIES (not used) ==')
        for s, sl in ties:
            print('%4s %s -> %s' % (s['id'], s['label'].split(' – ')[0], sl))
        print('\n== NO SEFARIA TOPIC UNDER ANY OF THE SAGE\'S NAMES ==')
        for s in nothing:
            print('%4s %s   %s' % (s['id'], s['label'].split(' – ')[0], variants(s['label'])))
        print('\n== REJECTED (name matched, years/era/works did not) ==')
        for s, bad in rejected:
            print('%4s %s' % (s['id'], s['label'].split(' – ')[0]))
            for slug, verdict, nworks, d in bad:
                p = d.get('properties') or {}
                print('       %-30s years_ok=%s works=%d  %s-%s era=%s' % (
                    slug, verdict, nworks, (p.get('birthYear') or {}).get('value'), (p.get('deathYear') or {}).get('value'),
                    (p.get('era') or {}).get('value')))


main()
