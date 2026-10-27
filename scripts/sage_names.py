#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Name matching shared by the scripts that link roster sages to outside catalogues
(build_sefaria_links.py, build_wikidata_links.py).

Names are stable across id spaces and ids are not, so every join is on names, then
checked against the sage's years: the same name belongs to several people.
"""
import re, unicodedata

# Sefaria era codes -> our era_key
ERA = {'T': 'tannaim', 'A': 'amoraim', 'GN': 'geonim', 'RI': 'rishonim', 'AH': 'acharonim', 'CO': 'modern'}

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


# Names a sage is also catalogued under that his roster label does not carry: a spelling variant, or the title his Wikipedia article
# has. Keyed by the LABEL (ids drift, labels do not). variants() and raw_names() add them, so the catalogue builders look the sage up
# under them too; every match still has to agree with his years (years_ok), so a name shared with another man links nobody.
#   רב אחאי משבחא: Sefaria's topic is "אחאי גאון" / "רב אחא משבחא" and his Hebrew Wikipedia article "רב אחא משבחא" (the roster spells אחאי,
#   as the owner's episode and the Sefaria translations do); it is a different man from רבי אחאי בר פפא (619), whose years do not agree.
ALSO_KNOWN_AS = {
    'רב אחאי משבחא (בעל השאילתות)': ['רב אחא משבחא', 'אחאי גאון'],
    'רבי יצחק אייזיק מקומרנא': ['יצחק אייזיק ספרין', 'אדמו"ר מקומרנא'],
    'רב יהודאי גאון': ['יהודאי גאון'],
}


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
    out.extend(ALSO_KNOWN_AS.get(label, []))
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


GENERIC = HONORIFIC | {'בנ', 'בר', 'אבנ', 'הלוי', 'הכהנ', 'מ', 'של', 'רב'}


def raw_names(label):
    """The names a sage goes by, as written (not normalized), for Sefaria's own search."""
    main = label.split(' – ')[0]
    parens = [p for p in re.findall(r'\(([^)]*)\)', main) if not re.search(r'\d', p)]
    base = re.sub(r'\([^)]*\)', ' ', main).strip()
    out = []
    for n in [base] + parens:
        toks = n.split()
        for cand in [n] + ([' '.join(toks[1:])] if len(toks) >= 3 and norm(toks[0]) in HONORIFIC else []):
            if cand and cand not in out:
                out.append(cand)
    for cand in ALSO_KNOWN_AS.get(label, []):
        if cand not in out:
            out.append(cand)
    return out


def relation(title, wanted):
    """How an outside title relates to a sage: 'exact' when it is one of his names,
    'loose' when its words contain his name or are contained in it, else None.
    `wanted` is the set returned by variants(label)."""
    tn = norm(title)
    if not tn:
        return None
    if any(f in wanted for f in forms(tn, title)):
        return 'exact'
    tt = frozenset(tn.split()) - GENERIC
    for v in wanted:
        vt = frozenset(v.split()) - GENERIC
        if vt and ((len(tt) >= 2 and tt <= vt) or (len(vt) >= 2 and vt <= tt)):
            return 'loose'
    return None
