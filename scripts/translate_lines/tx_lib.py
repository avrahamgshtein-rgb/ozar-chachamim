# Line-aligned translation of the research papers (no API): shared helpers.
import json, os, re, glob
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RES = f'{REPO}/nextjs-app/public/research'
PUB = f'{REPO}/nextjs-app/public'
# working files (<id>.src.txt, <id>.en.txt, ...) live outside the repo
TX = os.environ.get('TX_WORK', '/tmp/ozar-translate-lines')
os.makedirs(TX, exist_ok=True)
HEB = re.compile(r'[א-ת]')
CYR = re.compile(r'[Ѐ-ӿ]')
LAT = re.compile(r'[A-Za-z]')

def load_he(sid):
    return json.load(open(f'{RES}/{sid}.json', encoding='utf-8'))

def lines_of(content):
    return re.split(r'\r?\n', content)

def classify(line):
    """'h' = translate for en and ru, 'l' = Latin prose: translate for ru only, 'v' = copy verbatim."""
    s = line.strip()
    if not s:
        return 'v'
    urls = len(re.findall(r'https?://', s))
    rest = re.sub(r'https?://\S+', '', s)
    if urls >= 2 or (urls == 1 and len(rest) < 400):
        return 'v'
    if not HEB.search(s):
        if len(re.findall(r'[A-Za-z]{2,}', s)) >= 4 and not CYR.search(s):
            return 'l'
        return 'v'
    return 'h'

def split_into(t, cands):
    """t as a run of other lines with the text between them as gaps: the list of parts, or None."""
    cands = [c for c in cands if len(c) < len(t)]
    parts, pos = [], 0
    while pos < len(t):
        while pos < len(t) and t[pos].isspace():
            pos += 1
        if pos >= len(t):
            break
        best = None
        for c in cands:
            if len(c) < len(t) and t.startswith(c, pos) and (best is None or len(c) > len(best)):
                best = c
        if best is not None:
            parts.append(best)
            pos += len(best)
            continue
        nxt = len(t)
        for c in cands:
            i = t.find(c, pos)
            if i != -1 and i < nxt:
                nxt = i
        gap = t[pos:nxt].strip()
        if gap:
            parts.append(gap)
        pos = nxt
    return parts if sum(1 for x in parts if x in cands) >= 2 else None

def units(sid):
    """Unique translatable texts in order of first appearance: [(id, text, kind)], the parsed docs, the
    text -> id map, and `composite`: lines that are a run of other lines (a paper stored twice, once with
    its paragraphs joined into one line) -> the parts (known lines and the gaps between them), each
    translated once and joined with a space."""
    docs = load_he(sid)
    texts = []
    for d in docs:
        for t in [d.get('title', '')] + lines_of(d.get('content', '')):
            if classify(t) != 'v' and t not in texts:
                texts.append(t)
    cands = [t for t in texts if len(t) >= 15]
    composite, gaps = {}, []
    for t in sorted(texts, key=len, reverse=True):
        if len(t) > 400:
            parts = split_into(t, [c for c in cands if c not in composite])
            if parts:
                composite[t] = parts
                gaps += [x for x in parts if x not in cands and classify(x) != 'v' and x not in gaps]
    seen, out = {}, []
    for t in texts + [g for g in gaps if g not in texts]:
        if t in composite:
            continue
        seen[t] = len(out) + 1
        out.append((len(out) + 1, t, classify(t)))
    return docs, out, seen, composite

def parse_tx(path):
    got, problems = {}, []
    if not os.path.exists(path):
        return got, [f'{os.path.basename(path)} does not exist']
    for i, raw in enumerate(open(path, encoding='utf-8').read().split('\n'), 1):
        if not raw.strip():
            continue
        m = re.match(r'^(\d+)\|(.*)$', raw)
        if not m:
            problems.append(f'line {i}: not "N|text": {raw[:60]!r}')
            continue
        n = int(m.group(1))
        if n in got and got[n] != m.group(2).strip():
            problems.append(f'unit {n} is given twice')
        got[n] = m.group(2).strip()
    return got, problems
