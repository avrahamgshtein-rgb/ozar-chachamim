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
import argparse, hashlib, json, os, re, subprocess, sys, time, unicodedata, urllib.parse

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

# Sefaria era codes -> our era_key
ERA = {'T': 'tannaim', 'A': 'amoraim', 'GN': 'geonim', 'RI': 'rishonim', 'AH': 'acharonim', 'CO': 'modern'}

# People whose writings Sefaria files under the book rather than under an author page.
# sage id -> list of (Sefaria index title in English, Hebrew title). Verified by hand
# against the roster; extend deliberately.
# sage label (normalized) is not used; the key is the Sefaria topic slug.
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


NIKUD = re.compile(r'[֑-ׇ]')
QUOTES = re.compile(r'["\'״׳”“’‘`´]')      # dropped: רמב"ם and רמב״ם are the same word
PUNCT = re.compile(r'[().,:;!?\-–—־_/\\]')  # become a space
HONORIFIC = {'רבי', 'ר', 'רבנו', 'רבינו', 'הרב', 'רבן', 'מרן', 'הגאון', 'החכם', 'האדמור'}


def norm(s):
    s = unicodedata.normalize('NFKD', s or '')
    s = NIKUD.sub('', s)
    s = QUOTES.sub('', s)
    s = PUNCT.sub(' ', s)
    for a, b in zip('ךםןףץ', 'כמנפצ'):
        s = s.replace(a, b)
    return ' '.join(s.split())


def forms(n, raw=''):
    """A normalized name plus the spellings it is also written under."""
    out = [n]
    toks = n.split()
    if len(toks) >= 3 and toks[0] in HONORIFIC:
        out.append(' '.join(toks[1:]))
    # "הרמב״ם" -> "רמב״ם": a leading article on an acronym
    if len(toks) == 1 and toks[0].startswith('ה') and re.search(r'["״\']', raw or ''):
        out.append(toks[0][1:])
    # "המהרל מפראג" -> "מהרל מפראג": a leading article on a short first word
    if toks and toks[0].startswith('ה') and 4 <= len(toks[0]) <= 6 and toks[0] not in ('הלוי', 'הכהנ'):
        out.append(' '.join([toks[0][1:]] + toks[1:]))
    return out


def variants(label):
    """Every name a sage label can be looked up under, normalized."""
    main = label.split(' – ')[0]
    out = []
    parens = re.findall(r'\(([^)]*)\)', main)
    base = re.sub(r'\([^)]*\)', ' ', main).strip()
    out.append(base)
    for p in parens:
        if re.search(r'\d', p):
            continue
        out.append(p)
    res = []
    for v in out:
        n = norm(v)
        if not n:
            continue
        res.extend(forms(n, v))
    seen, uniq = set(), []
    for r in res:
        if r not in seen:
            seen.add(r)
            uniq.append(r)
    return uniq


def years_ok(sage, prop, need_years=False):
    """True/False when decidable, None when neither years nor era can decide.
    need_years: refuse to decide on era alone (used for loose name matches)."""
    sb, sd = sage.get('birth_year'), sage.get('death_year')
    pb = (prop.get('birthYear') or {}).get('value')
    pd = (prop.get('deathYear') or {}).get('value')
    pairs = []
    if isinstance(sb, int) and isinstance(pb, int):
        pairs.append(abs(sb - pb))
    if isinstance(sd, int) and isinstance(pd, int):
        pairs.append(abs(sd - pd))
    if pairs:
        # The roster rounds some lifetimes to 50 or 100 years (1200-1400 for the Rosh).
        # Against a rounded span, "agrees" means the real lifetime sits mostly inside it.
        if isinstance(sb, int) and isinstance(sd, int) and sb % 50 == 0 and sd % 50 == 0 \
                and isinstance(pb, int) and isinstance(pd, int) and pd > pb:
            return (min(sd, pd) - max(sb, pb)) / (pd - pb) >= 0.5
        return min(pairs) <= 20 and max(pairs) <= 60
    if need_years:
        return None
    era = (prop.get('era') or {}).get('value')
    if era in ERA and sage.get('era_key'):
        return ERA[era] == sage['era_key']
    return None


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
    GENERIC = HONORIFIC | {'בנ', 'בר', 'אבנ', 'הלוי', 'הכהנ', 'מ', 'של', 'רב'}
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
        if not slugs:
            nothing.append(s)
            continue
        good, bad, persons = [], [], []
        for slug in slugs:
            d = detail(slug)
            if not d:
                continue
            if d.get('subclass') not in ('author', 'person'):
                continue
            verdict = years_ok(s, d.get('properties') or {}, need_years=slug not in exact)
            works = d.get('indexes') or []
            if verdict is True and works:
                good.append((slug, d))
            elif not works and slug in exact and verdict in (True, None):
                # A person Sefaria knows by this very name but lists no books for
                # (the tannaim, the prophets): the topic page still collects every
                # source in which he appears.
                persons.append((slug, d))
            else:
                bad.append((slug, verdict, len(works), d))
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
        }

    doc = {
        '_about': 'Generated by scripts/build_sefaria_links.py from sefaria.org/api. Keys are sage ids; works are what Sefaria lists for the author.',
        'authors': dict(sorted(out.items(), key=lambda kv: int(kv[0]))),
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')

    print('sages: %d | matched: %d | tie: %d | rejected: %d | no Sefaria topic by that name: %d'
          % (len(sages), len(matches), len(ties), len(rejected), len(nothing)))
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
