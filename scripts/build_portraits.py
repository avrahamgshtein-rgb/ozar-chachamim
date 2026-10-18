#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Builds the portraits of the sages: the picture of each sage's own podcast episode (the owner's cover for it, mostly an
illustration of the sage), cut to his head and shoulders and served from this site, so a visitor's browser never asks
Spotify for it.

    python3 scripts/build_portraits.py              # validate the review, build, write, print a one-line summary
    python3 scripts/build_portraits.py --fetch      # first download the 640 px covers the cache does not hold
    python3 scripts/build_portraits.py --report     # also print the report for the owner (see below)
    python3 scripts/build_portraits.py --check      # rebuild in memory, write nothing, exit 1 when a file differs
    python3 scripts/build_portraits.py --root DIR   # the same, on a copy of the repo's layout under DIR

Input: data/portraits-review.json, the reviewed decisions (the file a human edits; the rest is generated):
  { "_about": str?, "_approved_photos": ["161", "610"],
    "portraits": { "<id>": { "label", "episode", "title", "image", "kind": "illustration"|"photo", "crop": [x, y, size],
                             "note"?, "title_confirmed"? } },
    "_left_out": { "<id>": { "label", "episode", "reason", "note", "crop"?, "image"? } } }
  `crop` is [x, y, size] in the pixels of the 640 x 640 cover, `image` the 24-hex hash of that cover
  (https://i.scdn.co/image/ab6765630000ba8a<image>). `kind` is `photo` only for the photographs the owner approved
  (`_approved_photos`): a photograph is never shown under the illustration caption. Every other photograph is left out
  as `photo` with a crop recorded, so that approving more later is adding their ids to `_approved_photos`: this build then
  treats each such id that is left out as `photo` with a `crop` and an `image` as kept, kind `photo`.

Output, rewritten whole from the review (a file that is not in the review is removed; never edit them by hand):
  nextjs-app/public/portraits/<id>.webp       384 x 384, webp method 6, quality 78 lowered by 4 down to 50 until at most 38 KB
  nextjs-app/public/portraits/<id>.sm.webp    128 x 128, quality 75 lowered the same way until at most 7 KB
  nextjs-app/assets/og/portraits/<id>.jpg     320 x 320 baseline JPEG, quality 82 lowered by 4 down to 60 until at most 30 KB:
                                              the copy the share card and the story image draw, because Satori cannot read WebP
  nextjs-app/public/data-portraits.json       { "<id>": { "label", "episode", "w": 384, "kind" } } in id order
  nextjs-app/public/portraits/atlas.webp      every portrait as a 64 x 64 tile, 32 columns, in id order (row-major, the top row first),
                                              the rows rounded up to a power of two (331 portraits: 2048 x 1024, black where unused);
                                              webp method 6, quality 80 lowered by 4 down to 50 until at most 400 KB. The tower draws
                                              the faces from it in one texture (components/tower)
  nextjs-app/public/portraits/atlas.json      { "tile", "cols", "rows", "w", "h", "v", "ids" }: the geometry, `v` the first 8 hex digits
                                              of the sha256 of atlas.webp (the page asks for atlas.webp?v=<v>, so a copy a visitor's
                                              service worker kept never meets a newer page), `ids[k]` the sage in tile k
The same review and the same covers give the same bytes. Every build (and every --check) decodes the atlas it just made and
compares each tile with that sage's own small file (mean difference at most 12/255: on the 331 portraits of 2026-10-18 a right
tile differs by up to 6.3, the nearest wrong pairing by 20.6): a tile in the wrong place is an error and nothing is written.

The 640 px covers are read from a cache outside the repo, files <hash>.jpg: $OZAR_PORTRAITS_CACHE, else
~/.cache/ozar-portraits (under --root: DIR/.portraits-cache). --fetch fills it from the image CDN (paced, retried).

Validation (any error stops the run before anything is written): every id is on the roster (nextjs-app/public/data.json) with
its roster label; the episode is the one in the sage's spotify_url; every sage is decided exactly once (kept or left out), the
ones with no episode as `no-episode`; the crop rules (three integers, inside the picture, at least 160 px, a warning under 240
and one for a crop that reaches the bottom-right corner, where the image generator's small star watermark sits); reasons from the list; `photo` kind only
for an approved id; a kept sage whose episode title does not name him carries `title_confirmed`.
"""
import argparse, hashlib, io, json, os, re, subprocess, sys, time

from PIL import Image, ImageChops, ImageStat

HERE = os.path.dirname(os.path.abspath(__file__))
REASONS = ['photo', 'other-person', 'symbol', 'text', 'gender', 'quality', 'no-episode', 'title-mismatch']
KINDS = ['illustration', 'photo']
EP_RE = re.compile(r'open\.spotify\.com/(?:intl-[a-z]+/)?episode/([A-Za-z0-9]{22})')
HASH_RE = re.compile(r'^[0-9a-f]{24}$')
PIC, MIN_CROP, WARN_CROP = 640, 160, 240
BIG, SMALL, OG = 384, 128, 320
BIG_MAX, BIG_Q = 38 * 1024, 78
SMALL_MAX, SMALL_Q = 7 * 1024, 75
OG_MAX, OG_Q = 30 * 1024, 82
WEBP_FLOOR, OG_FLOOR, STEP = 50, 60, 4
TILE, ATLAS_COLS, ATLAS_SIDE_MAX = 64, 32, 4096
ATLAS_MAX, ATLAS_Q, TILE_TOLERANCE = 400 * 1024, 80, 12
ATLAS_WEBP, ATLAS_JSON = 'atlas.webp', 'atlas.json'
IMG_HOSTS = ['https://i.scdn.co/image/', 'https://image-cdn-ak.spotifycdn.com/image/', 'https://image-cdn-fa.spotifycdn.com/image/']
IMG_PREFIX = 'ab6765630000ba8a'
UA = 'Mozilla/5.0 (compatible; ozar-chachamim-portraits/1.0)'

TOP_KEYS = {'_about', '_approved_photos', 'portraits', '_left_out'}
PORTRAIT_KEYS = {'label', 'episode', 'title', 'image', 'kind', 'crop', 'note', 'title_confirmed'}
PORTRAIT_REQ = {'label', 'episode', 'title', 'image', 'kind', 'crop'}
LEFT_KEYS = {'label', 'episode', 'reason', 'note', 'crop', 'image'}
LEFT_REQ = {'label', 'episode', 'reason', 'note'}


# ---- does the episode title name the sage? (a heuristic: the same one the Fetch step marked the episodes with) ----
NIKUD = re.compile('[֑-ׇ]')
QUOTES = re.compile('[\"״׳\'’“”‘`]')
STOP = set('רבי רבנו רבן הרב ר הגאון מרן החכם הרבנית רבינו רבותינו של בן בר בת ה ו את על אל the of and rabbi'.split())
PREFIX = 'הוולבמכש'


def _norm(s):
    s = NIKUD.sub('', s or '')
    s = QUOTES.sub('', s)
    s = re.sub(r'[\-–—―,:;.!?()\[\]/|·•]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def _name_tokens(label):
    # the roster label before a long subtitle: "X (years) - subtitle" -> X
    base = re.split(r'\s[–—-]\s', label)[0]
    base = re.sub(r'\(\d[^)]*\)', ' ', base)
    return [t for t in _norm(base).split() if t not in STOP and len(t) >= 2]


def _variants(tok):
    out = {tok}
    if len(tok) > 3 and tok[0] in PREFIX:
        out.add(tok[1:])
    return out


def name_in_title(label, title):
    """True when some content token of the label (or of a bracketed part of it) appears in the title."""
    t_tokens = set()
    for t in _norm(title).split():
        t_tokens |= _variants(t)
    for g in [label] + re.findall(r'\(([^)]*)\)', label):
        for tok in _name_tokens(g):
            if _variants(tok) & t_tokens:
                return True
    return False


# ---- small helpers ----
def sort_ids(ids):
    return sorted(ids, key=lambda x: (0, int(x), x) if x.isdigit() else (1, 0, x))


class Log:
    def __init__(self):
        self.errors, self.warns = [], []

    def err(self, m):
        self.errors.append(m)

    def warn(self, m):
        self.warns.append(m)


class Layout:
    """Where everything lives, under the repo or under a --root copy of its layout."""

    def __init__(self, root, cache=None):
        self.root = root
        self.review = os.path.join(root, 'data', 'portraits-review.json')
        self.roster = os.path.join(root, 'nextjs-app', 'public', 'data.json')
        self.portraits = os.path.join(root, 'nextjs-app', 'public', 'portraits')
        self.og = os.path.join(root, 'nextjs-app', 'assets', 'og', 'portraits')
        self.data_file = os.path.join(root, 'nextjs-app', 'public', 'data-portraits.json')
        self.atlas = os.path.join(self.portraits, ATLAS_WEBP)
        self.atlas_json = os.path.join(self.portraits, ATLAS_JSON)
        self.cache = cache

    def rel(self, path):
        return os.path.relpath(path, self.root)


def load_roster(path):
    """id -> { label, era, episode (the 22-character id in his spotify_url, or None), url }."""
    out = {}
    for n in json.load(open(path, encoding='utf-8'))['nodes']:
        url = (n.get('spotify_url') or '').strip()
        m = EP_RE.search(url)
        out[str(n['id'])] = {'label': n['label'], 'era': n.get('era_key') or '', 'episode': m.group(1) if m else None, 'url': url}
    return out


def check_crop(log, i, crop, note, where):
    ok = isinstance(crop, list) and len(crop) == 3 and all(isinstance(v, int) and not isinstance(v, bool) for v in crop)
    if not ok:
        log.err(f'{i}: {where} crop must be [x, y, size], three integers (got {crop!r})')
        return False
    x, y, s = crop
    if x < 0 or y < 0:
        log.err(f'{i}: {where} crop {crop} starts outside the picture')
    if x + s > PIC or y + s > PIC:
        log.err(f'{i}: {where} crop {crop} reaches outside the {PIC}x{PIC} picture (x+size={x + s}, y+size={y + s})')
    if s < MIN_CROP:
        log.err(f'{i}: {where} crop size {s} is under {MIN_CROP}px')
    elif s < WARN_CROP:
        log.warn(f'{i}: {where} crop size {s} is under {WARN_CROP}px, it will look soft at {BIG}')
    if x + s > 580 and y + s > 580 and 'watermark' not in str(note or '').lower():
        log.warn(f'{i}: {where} crop {crop} reaches the bottom-right corner, where a small star watermark often sits: check it, or say "watermark" in the note')
    return True


def validate(doc, roster, log):
    """Check the review against the roster. Returns (kept, approved_left) or None when it is unreadable:
    kept = { id: {label, episode, kind, crop, image, source} } in id order, source `portraits` or `approved` (a left-out
    photograph the owner approved, built as kind photo); approved_left is the second kind alone."""
    if not isinstance(doc, dict):
        log.err('the review must be an object')
        return None
    for k in doc:
        if k not in TOP_KEYS:
            log.err(f'unknown top-level key {k!r}')
    portraits, left = doc.get('portraits'), doc.get('_left_out')
    if not isinstance(portraits, dict) or not isinstance(left, dict):
        log.err('"portraits" and "_left_out" must both be objects')
        return None
    ap_list = doc.get('_approved_photos', [])
    if not isinstance(ap_list, list) or not all(isinstance(x, str) and x.isdigit() for x in ap_list):
        log.err('"_approved_photos" must be a list of id strings')
        ap_list = []
    approved = set(ap_list)
    for i in sort_ids(approved):
        if i not in roster:
            log.err(f'{i}: in _approved_photos but not on the roster')

    for i in sort_ids(set(portraits) & set(left)):
        log.err(f'{i}: in both portraits and _left_out')
    for i in sort_ids((set(portraits) | set(left)) - set(roster)):
        log.err(f'{i}: not on the roster')
    for i in sort_ids(set(roster) - set(portraits) - set(left)):
        log.err(f'{i}: not decided ({roster[i]["label"][:40]})')

    kept, by_episode = {}, {}
    for i in sort_ids(portraits):
        e = portraits[i]
        if not isinstance(e, dict):
            log.err(f'{i}: portraits entry is not an object')
            continue
        for k in e:
            if k not in PORTRAIT_KEYS:
                log.err(f'{i}: unknown key {k!r} in portraits entry')
        for k in sorted(PORTRAIT_REQ - set(e)):
            log.err(f'{i}: portraits entry lacks {k!r}')
        r = roster.get(i)
        if r is None:
            continue
        if e.get('label') != r['label']:
            log.err(f'{i}: label is {e.get("label")!r}, the roster says {r["label"]!r}')
        if r['episode'] is None:
            log.err(f'{i}: kept, but his spotify_url holds no episode ({r["url"] or "empty"})')
        elif e.get('episode') != r['episode']:
            log.err(f'{i}: episode is {e.get("episode")!r}, his spotify_url says {r["episode"]!r}')
        if not HASH_RE.match(str(e.get('image', ''))):
            log.err(f'{i}: image {e.get("image")!r} is not a 24-hex picture hash')
        if not str(e.get('title', '')).strip():
            log.err(f'{i}: the episode title is empty')
        kind = e.get('kind')
        if 'kind' in e:
            if kind not in KINDS:
                log.err(f'{i}: kind {kind!r} is not one of {"|".join(KINDS)}')
            elif kind == 'photo' and i not in approved:
                log.err(f'{i}: kind "photo" but the owner has not approved this photograph (approved: {", ".join(sort_ids(approved)) or "none"})')
            elif kind == 'illustration' and i in approved:
                log.err(f'{i}: the owner approved this one as a photograph: kind must be "photo", never the illustration caption')
        crop_ok = check_crop(log, i, e.get('crop'), e.get('note'), 'kept') if 'crop' in e else False
        if r['label'] and not name_in_title(r['label'], str(e.get('title', ''))) and not str(e.get('title_confirmed', '')).strip():
            log.err(f'{i}: the episode title {e.get("title")!r} does not name {r["label"]!r}: add "title_confirmed" (why it is about him) or leave him out as title-mismatch')
        by_episode.setdefault(e.get('episode'), []).append(i)
        if crop_ok and kind in KINDS and HASH_RE.match(str(e.get('image', ''))):
            kept[i] = {'label': r['label'], 'episode': e.get('episode'), 'kind': kind, 'crop': e['crop'], 'image': e['image'], 'source': 'portraits'}

    approved_left = {}
    for i in sort_ids(left):
        e = left[i]
        if not isinstance(e, dict):
            log.err(f'{i}: _left_out entry is not an object')
            continue
        for k in e:
            if k not in LEFT_KEYS:
                log.err(f'{i}: unknown key {k!r} in _left_out entry')
        for k in sorted(LEFT_REQ - set(e)):
            log.err(f'{i}: _left_out entry lacks {k!r}')
        reason = e.get('reason')
        note = str(e.get('note', ''))
        if reason not in REASONS:
            log.err(f'{i}: reason {reason!r} is not one of {"|".join(REASONS)}')
        if not note.strip():
            log.err(f'{i}: _left_out needs a note (one line: what was seen)')
        r = roster.get(i)
        if r is None:
            continue
        if e.get('label') != r['label']:
            log.err(f'{i}: label is {e.get("label")!r}, the roster says {r["label"]!r}')
        if r['episode'] is None:
            if reason != 'no-episode':
                log.err(f'{i}: he has no episode in his spotify_url, so the reason is "no-episode" (got {reason!r})')
            if e.get('episode') not in ('',):
                log.err(f'{i}: no episode, so "episode" must be "" (got {e.get("episode")!r})')
            if 'crop' in e or 'image' in e:
                log.err(f'{i}: a sage with no episode has no picture: no crop, no image')
            continue
        if reason == 'no-episode':
            log.err(f'{i}: has an episode ({r["episode"]}); "no-episode" is only for a sage without one')
        if e.get('episode') != r['episode']:
            log.err(f'{i}: episode is {e.get("episode")!r}, his spotify_url says {r["episode"]!r}')
        if 'image' in e and not HASH_RE.match(str(e['image'])):
            log.err(f'{i}: image {e["image"]!r} is not a 24-hex picture hash')
        crop_ok = False
        if 'crop' in e:
            crop_ok = check_crop(log, i, e['crop'], note, 'left-out')
            if 'image' not in e:
                log.err(f'{i}: a left-out with a crop needs "image" (the picture hash), so a later approval can build it')
        uncertain = note.lower().startswith('uncertain')
        if (reason == 'photo' or uncertain) and 'crop' not in e and 'no crop' not in note.lower():
            log.err(f'{i}: left out as {reason!r}{" (uncertain)" if uncertain else ""} without a crop: add "crop" (+ "image") where one clear figure exists, or write "no crop: <why>" in the note')
        if i in approved and i not in portraits:
            if reason == 'photo':
                if crop_ok and HASH_RE.match(str(e.get('image', ''))):
                    approved_left[i] = {'label': r['label'], 'episode': r['episode'], 'kind': 'photo', 'crop': e['crop'], 'image': e['image'], 'source': 'approved'}
                else:
                    log.err(f'{i}: approved as a photograph and left out as "photo", but without a usable crop and image, so it cannot be built')
            else:
                log.warn(f'{i}: approved as a photograph but left out as {reason!r} ({note[:70]}): he gets no portrait, tell the owner')
    for i in sort_ids(approved):
        if i in roster and i not in portraits and i not in left:
            log.err(f'{i}: in _approved_photos but neither kept nor left out')
    for ep, ids in by_episode.items():
        if len(ids) > 1:
            log.warn(f'episode {ep} is kept for {len(ids)} sages ({", ".join(ids)}): only one of them can be the figure')

    kept.update(approved_left)
    kept = {i: kept[i] for i in sort_ids(kept)}
    return kept, approved_left


# ---- the covers: a cache outside the repo, filled by --fetch ----
def curl_to(url, dest, tries=4):
    last = ''
    for k in range(tries):
        r = subprocess.run(['curl', '-sS', '-L', '-m', '30', '-A', UA, '-o', dest, '-w', '%{http_code}', url], capture_output=True, text=True)
        code = r.stdout.strip()
        if code == '200':
            time.sleep(0.25)
            return
        last = f'HTTP {code}' if code and code != '000' else (r.stderr.strip()[:120] or 'no answer')
        if code in ('400', '403', '404', '410'):
            break
        time.sleep(min(2 * (k + 1), 20))
    raise RuntimeError(last)


def fetch_cover(h, dest):
    """Download the 640 px cover <h> into the cache as <h>.jpg (decoded and saved as a JPEG of quality 95, as the
    Fetch step did, so a cache filled here and one filled there give the same pictures). Verifies 640 x 640."""
    tmp = dest + '.part'
    last = ''
    for host in IMG_HOSTS:
        try:
            curl_to(host + IMG_PREFIX + h, tmp)
        except RuntimeError as e:
            last = f'{host}: {e}'
            continue
        try:
            with Image.open(tmp) as im:
                im.verify()
            with Image.open(tmp) as im:
                if im.size != (PIC, PIC):
                    last = f'{host}: size {im.size}'
                    continue
                im.convert('RGB').save(dest, 'JPEG', quality=95)
            os.remove(tmp)
            return
        except Exception as e:
            last = f'{host}: bad image {e}'
    if os.path.exists(tmp):
        os.remove(tmp)
    raise RuntimeError(last or 'no image')


def load_cover(path):
    with Image.open(path) as im:
        im.load()
        if im.size != (PIC, PIC):
            raise RuntimeError(f'{path} is {im.size[0]}x{im.size[1]}, not {PIC}x{PIC}')
        return im.convert('RGB')


# ---- the three files of a portrait ----
def encode_webp(im, max_bytes, q0):
    q = q0
    while True:
        b = io.BytesIO()
        im.save(b, 'WEBP', quality=q, method=6)
        data = b.getvalue()
        if len(data) <= max_bytes or q <= WEBP_FLOOR:
            return data, q
        q = max(q - STEP, WEBP_FLOOR)


def encode_jpeg(im, max_bytes, q0):
    q = q0
    while True:
        b = io.BytesIO()
        im.save(b, 'JPEG', quality=q, optimize=True, progressive=False)
        data = b.getvalue()
        if len(data) <= max_bytes or q <= OG_FLOOR:
            return data, q
        q = max(q - STEP, OG_FLOOR)


def render(cover, crop, i, log):
    x, y, s = crop
    sq = cover.crop((x, y, x + s, y + s))
    big, qb = encode_webp(sq.resize((BIG, BIG), Image.LANCZOS), BIG_MAX, BIG_Q)
    sm, qs = encode_webp(sq.resize((SMALL, SMALL), Image.LANCZOS), SMALL_MAX, SMALL_Q)
    og, qo = encode_jpeg(sq.resize((OG, OG), Image.LANCZOS), OG_MAX, OG_Q)
    tile = sq.resize((TILE, TILE), Image.LANCZOS)
    for name, data, cap, q in (('large webp', big, BIG_MAX, qb), ('small webp', sm, SMALL_MAX, qs), ('share-card jpg', og, OG_MAX, qo)):
        if len(data) > cap:
            log.warn(f'{i}: the {name} is {len(data)} bytes, over {cap} even at quality {q}')
    return big, sm, og, tile


# ---- the atlas: every portrait as one tile of a single picture, for the tower ----
def atlas_geometry(n):
    """The atlas for n portraits: ATLAS_COLS columns of TILE px, the rows rounded up to a power of two (a texture's friend)."""
    need, rows = max(1, -(-n // ATLAS_COLS)), 1
    while rows < need:
        rows *= 2
    return {'tile': TILE, 'cols': ATLAS_COLS, 'rows': rows, 'w': ATLAS_COLS * TILE, 'h': rows * TILE}


def tile_box(k, geom):
    """Where tile k sits in the atlas: row-major, the top row first."""
    col, row = k % geom['cols'], k // geom['cols']
    return (col * geom['tile'], row * geom['tile'], (col + 1) * geom['tile'], (row + 1) * geom['tile'])


def compose_atlas(tiles, geom):
    """tiles: the 64 px images in id order. RGB, black where no sage stands."""
    im = Image.new('RGB', (geom['w'], geom['h']), (0, 0, 0))
    for k, t in enumerate(tiles):
        im.paste(t, tile_box(k, geom)[:2])
    return im


def tile_difference(a, b):
    """Mean absolute difference per channel, 0 to 255."""
    return sum(ImageStat.Stat(ImageChops.difference(a, b)).mean) / 3


def check_atlas(atlas, geom, ids, small):
    """Decode the atlas as written and compare tile k with the small file of ids[k] (resized to a tile). `small` maps
    id -> the bytes of <id>.sm.webp. Returns the problems found (empty: every tile belongs to its sage): the guard against
    a tile one place off, which would show a wrong face on a sage."""
    problems = []
    try:
        im = Image.open(io.BytesIO(atlas))
        im.load()
        im = im.convert('RGB')
    except Exception as e:
        return [f'atlas: cannot decode what was just encoded ({e})']
    if im.size != (geom['w'], geom['h']):
        problems.append(f'atlas: decoded as {im.size[0]}x{im.size[1]}, expected {geom["w"]}x{geom["h"]}')
        return problems
    if len(ids) > geom['cols'] * geom['rows']:
        problems.append(f'atlas: {len(ids)} portraits do not fit {geom["cols"]} x {geom["rows"]} tiles')
        return problems
    for k, i in enumerate(ids):
        want = Image.open(io.BytesIO(small[i])).convert('RGB').resize((geom['tile'], geom['tile']), Image.LANCZOS)
        d = tile_difference(im.crop(tile_box(k, geom)), want)
        if d > TILE_TOLERANCE:
            problems.append(f'atlas: tile {k} (sage {i}) differs from his small file by {d:.1f}/255 on average, over {TILE_TOLERANCE}: the tile is not his')
    return problems


def build_outputs(kept, lay, log, fetch):
    """The files the review says: { path: bytes }, the data file text, and the pictures that are missing."""
    need = sorted({k['image'] for k in kept.values()})
    if fetch:
        os.makedirs(lay.cache, exist_ok=True)
    missing = []
    for h in need:
        f = os.path.join(lay.cache, h + '.jpg')
        if os.path.exists(f):
            continue
        if not fetch:
            missing.append(h)
            continue
        try:
            fetch_cover(h, f)
        except RuntimeError as e:
            log.err(f'picture {h}: could not fetch it ({e})')
    if missing:
        log.err(f'{len(missing)} cover(s) are not in the cache {lay.cache} (first: {missing[0]}): run with --fetch')
    if log.errors:
        return None
    files, data, tiles, small = {}, {}, [], {}
    covers = {}
    for i, k in kept.items():
        h = k['image']
        if h not in covers:
            try:
                covers[h] = load_cover(os.path.join(lay.cache, h + '.jpg'))
            except Exception as e:
                log.err(f'{i}: {e}')
                continue
        big, sm, og, tile = render(covers[h], k['crop'], i, log)
        files[os.path.join(lay.portraits, i + '.webp')] = big
        files[os.path.join(lay.portraits, i + '.sm.webp')] = sm
        files[os.path.join(lay.og, i + '.jpg')] = og
        data[i] = {'label': k['label'], 'episode': k['episode'], 'w': BIG, 'kind': k['kind']}
        tiles.append(tile)
        small[i] = sm
    if log.errors:
        return None
    text = json.dumps(data, ensure_ascii=False, indent=1) + '\n'
    atlas_info = None
    if tiles:
        ids = list(data)
        geom = atlas_geometry(len(ids))
        if geom['h'] > ATLAS_SIDE_MAX:
            log.err(f'atlas: {len(ids)} portraits need {geom["w"]}x{geom["h"]}, over {ATLAS_SIDE_MAX} px a side (a phone cannot hold it)')
            return None
        atlas, qa = encode_webp(compose_atlas(tiles, geom), ATLAS_MAX, ATLAS_Q)
        if len(atlas) > ATLAS_MAX:
            log.err(f'atlas: {len(atlas)} bytes, over {ATLAS_MAX} even at quality {qa}')
        for m in check_atlas(atlas, geom, ids, small):
            log.err(m)
        if log.errors:
            return None
        meta = dict(geom, v=hashlib.sha256(atlas).hexdigest()[:8], ids=ids)
        files[lay.atlas] = atlas
        files[lay.atlas_json] = (json.dumps(meta, ensure_ascii=False, indent=1) + '\n').encode('utf-8')
        atlas_info = {'w': geom['w'], 'h': geom['h'], 'bytes': len(atlas), 'q': qa, 'v': meta['v']}
    return files, text, atlas_info


def differences(files, text, lay):
    """Compare the wanted output with the disk: (missing or different, extra)."""
    changed, extra = [], []
    for p, b in files.items():
        if not os.path.exists(p) or open(p, 'rb').read() != b:
            changed.append(p)
    if not os.path.exists(lay.data_file) or open(lay.data_file, encoding='utf-8').read() != text:
        changed.append(lay.data_file)
    for d in (lay.portraits, lay.og):
        if os.path.isdir(d):
            for name in sorted(os.listdir(d)):
                p = os.path.join(d, name)
                if os.path.isfile(p) and p not in files:
                    extra.append(p)
    return changed, extra


def write_all(files, text, lay):
    changed, extra = differences(files, text, lay)
    for d in (lay.portraits, lay.og, os.path.dirname(lay.data_file)):
        os.makedirs(d, exist_ok=True)
    for p in changed:
        if p == lay.data_file:
            with open(p, 'w', encoding='utf-8') as fh:
                fh.write(text)
        else:
            with open(p, 'wb') as fh:
                fh.write(files[p])
    for p in extra:
        os.remove(p)
    return changed, extra


# ---- the report for the owner ----
def report(doc, roster, kept, approved_left, files, lay, atlas_info=None):
    left = doc['_left_out']
    built = set(approved_left)
    left_reasons = {}
    for i, e in left.items():
        if i not in built:
            left_reasons[e['reason']] = left_reasons.get(e['reason'], 0) + 1
    kinds = {}
    for k in kept.values():
        kinds[k['kind']] = kinds.get(k['kind'], 0) + 1
    era = lambda i: roster[i]['era']
    print(f'Portraits: {len(kept)} kept ({", ".join(f"{k} {v}" for k, v in sorted(kinds.items()))}), {sum(left_reasons.values())} left out')
    print('  left out by reason: ' + ', '.join(f'{r} {left_reasons[r]}' for r in REASONS if r in left_reasons))
    if built:
        print(f'  of the kept, {len(built)} built from _left_out by _approved_photos: {", ".join(sort_ids(built))}')

    print('\nPhotographs for the owner')
    print('  kept as photographs (approved):')
    for i, k in kept.items():
        if k['kind'] == 'photo':
            print(f'    {i:>4}  {k["label"]}  [{era(i)}]')
    plain = [i for i in sort_ids(left) if i not in built and left[i]['reason'] == 'photo' and not str(left[i]['note']).lower().startswith('uncertain')]
    print(f'  left out as photographs ({len(plain)}):')
    for i in plain:
        e = left[i]
        print(f'    {i:>4}  {e["label"]}  [{era(i)}]  crop {"recorded" if "crop" in e else "NO"}  {e["note"]}')

    unc = [i for i in sort_ids(left) if i not in built and str(left[i]['note']).lower().startswith('uncertain')]
    print(f'\nUncertain, photograph or AI ({len(unc)})')
    for i in unc:
        e = left[i]
        print(f'    {i:>4}  {e["label"]}  [{era(i)}]  crop {"recorded" if "crop" in e else "NO"}  {e["note"]}')

    modern = [i for i, k in kept.items() if k['kind'] == 'illustration' and era(i) == 'modern']
    print(f'\nKept modern illustrations ({len(modern)}): realistic AI likenesses are noted')
    for i in modern:
        note = (doc['portraits'].get(i) or {}).get('note', '')
        print(f'    {i:>4}  {kept[i]["label"]}  {note}')

    atlas_files = {lay.atlas, lay.atlas_json}
    sizes = {p: len(b) for p, b in files.items() if p not in atlas_files}
    total_w = sum(v for p, v in sizes.items() if os.path.dirname(p) == lay.portraits)
    total_o = sum(v for p, v in sizes.items() if os.path.dirname(p) == lay.og)
    biggest = max(sizes.items(), key=lambda kv: kv[1]) if sizes else None
    print(f'\nSize: public/portraits {total_w / 1024:.0f} KB in {sum(1 for p in sizes if os.path.dirname(p) == lay.portraits)} files, '
          f'assets/og/portraits {total_o / 1024:.0f} KB in {sum(1 for p in sizes if os.path.dirname(p) == lay.og)} files')
    if biggest:
        print(f'  largest file: {lay.rel(biggest[0])} ({biggest[1]} bytes)')
    if atlas_info:
        print(f'  atlas: {atlas_info["w"]}x{atlas_info["h"]}, {atlas_info["bytes"] / 1024:.0f} KB at quality {atlas_info["q"]} (limit {ATLAS_MAX // 1024} KB), v={atlas_info["v"]}, {len(kept)} tiles')


def main():
    ap = argparse.ArgumentParser(description='Build the sages\' portraits from data/portraits-review.json')
    ap.add_argument('--fetch', action='store_true', help='download the 640 px covers the cache does not hold')
    ap.add_argument('--report', action='store_true', help='print the report for the owner')
    ap.add_argument('--check', action='store_true', help='rebuild in memory and exit 1 when a file or the data file differs; writes nothing')
    ap.add_argument('--root', help='run on a copy of the repo layout under this directory')
    a = ap.parse_args()

    root = os.path.abspath(a.root) if a.root else os.path.dirname(HERE)
    cache = os.environ.get('OZAR_PORTRAITS_CACHE') or (os.path.join(root, '.portraits-cache') if a.root else os.path.expanduser('~/.cache/ozar-portraits'))
    lay = Layout(root, cache)

    log = Log()
    try:
        doc = json.load(open(lay.review, encoding='utf-8'))
    except Exception as e:
        print(f'ERROR: cannot read {lay.review}: {e}')
        return 1
    roster = load_roster(lay.roster)
    v = validate(doc, roster, log)
    out = None
    if v is not None and not log.errors:
        kept, approved_left = v
        out = build_outputs(kept, lay, log, a.fetch)
    for w in log.warns:
        print('  WARN', w)
    for m in log.errors:
        print('  ERROR', m)
    if log.errors or out is None:
        print(f'FAILED: {len(log.errors)} error(s), {len(log.warns)} warning(s); nothing written')
        return 1
    files, text, atlas_info = out
    atlas_note = f', atlas {atlas_info["w"]}x{atlas_info["h"]} {atlas_info["bytes"] / 1024:.0f} KB v={atlas_info["v"]}' if atlas_info else ''

    if a.report:
        report(doc, roster, kept, approved_left, files, lay, atlas_info)
        print()
    changed, extra = differences(files, text, lay)
    if a.check:
        for p in changed:
            print('  DIFFERS' if os.path.exists(p) else '  MISSING', lay.rel(p))
        for p in extra:
            print('  EXTRA  ', lay.rel(p), '(not in the review)')
        if changed or extra:
            print(f'CHECK FAILED: {len(changed)} file(s) differ or are missing, {len(extra)} extra; run scripts/build_portraits.py')
            return 1
        print(f'check ok: {len(kept)} portraits, {len(files) + 1} files identical to what the review builds{atlas_note}')
        return 0
    write_all(files, text, lay)
    print(f'built {len(kept)} portraits ({sum(1 for k in kept.values() if k["kind"] == "photo")} photo): '
          f'wrote {len(changed)} file(s), unchanged {len(files) + 1 - len(changed)}, removed {len(extra)}{atlas_note}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
