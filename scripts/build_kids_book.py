#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Builds the reading edition of one of the owner's children's books ("היכן החכמה מתגוררת": Saltiel's book now, Shira's when
her file arrives) from the owner's own edition of it, so that parents can read it with their children on the site
(/he/kids/read, 2026-10-26: the owner lifted the rule that the stories are not published, for this).

    /usr/bin/python3 scripts/build_kids_book.py --book saltiel            # build, write what changed, print a summary
    /usr/bin/python3 scripts/build_kids_book.py --book saltiel --report   # also: parts, words, images, what is not text
    /usr/bin/python3 scripts/build_kids_book.py --book saltiel --check    # rebuild in memory, write nothing, exit 1 when a file differs
    /usr/bin/python3 scripts/build_kids_book.py --book saltiel --root DIR # the same, on a copy of the repo's layout under DIR

Needs Python 3 with lxml and Pillow built with WebP (on the cloud image: /usr/bin/python3; `python3` on the PATH has a
broken Pillow). Reads no network, writes only below nextjs-app/. Exit codes: 0 ok, 1 --check found a difference, 2 the
source is not what the generator knows (it names the element and its line) or a rule failed.

Input, all committed:
  data/kids-books/<book>.meta.json        the book's identity, the credit (the owner's words, not the book's own copyright
                                          lines, which hold unfilled fields), the kind of each section, the sha256 of the
                                          source and of the oracle, and `print_only`: the segments of the oracle that are not
                                          book text (see below), each with its reason
  data/kids-books/<book>-*.html           the source: the owner's HTML edition of the book (self-contained, the pictures
                                          embedded). It stands in for the docx of the same edition, which is too big for the
                                          Drive connector to move; see `_about` in the meta file
  data/kids-books/<book>-docx-text.txt    the oracle: the docx's text as the Drive connector extracts it

Output, rewritten whole (never edit them by hand; a file that is not in the build is removed):
  nextjs-app/content/kids-books/<book>.json     the book, in the schema of nextjs-app/lib/kidsBookTypes.ts. Read by server code only
  nextjs-app/public/kids/books/<book>/          cover.webp, m<n>.webp (the seven panels), son-<k>.webp (the original drawings),
                                                m<n>.sm.webp (the map's thumbnails): at most 1000 px wide (thumbnails 200),
                                                webp method 6, quality 80 lowered by 4 until at most 200 KB (thumbnails 15 KB)

What it keeps, and how: the text of every element of the book exactly as the edition has it (nikud, the ASCII " and ' the
book uses, its dashes; nothing is rewritten, normalised or "fixed"; the site's gershayim rule is applied only where a
reader shows or reads the text). Emphasis (b, strong, em, small) becomes marks, offsets in UTF-16 units. The unfilled fields
of the copyright page (a <mark> in the edition) make their paragraph `placeholder: true`: kept, never shown.

Strictness: the parser knows exactly the constructs the edition uses. An unknown tag, class, attribute, comment, a text with a
newline, a tab or a double space, a number that does not match its link, or an element nobody mapped stops the build with
its place. What is not book text (the page's navigation bar, contents drawer, progress bar, script, footer, the "open the
door" button, the head) is listed by --report, and nothing else is dropped: under the parser a second check compares every
text node of <main> (outside the cover) with the text of the parts, so a text the parser forgot cannot go missing.
The pictures are encoded last, after every check, so a source that is not what the generator knows stops it at once.

Coverage: the oracle's lines and table cells (numbers of a list glued into a cell, dotted leaders, page numbers and markdown
escapes aside) must all be found, in order, in the text of the generated JSON, except the `print_only` segments, and
`print_only` must be exactly the set that is missing. The test (nextjs-app/tests/kidsBookBuild.test.ts) repeats the check with
its own code, and checks the JSON against the HTML's own text.
"""
import argparse, base64, collections, hashlib, io, json, os, re, sys

from lxml import html as LH
from PIL import Image, features

HERE = os.path.dirname(os.path.abspath(__file__))

IMG_MAX_W, IMG_MAX_BYTES, IMG_Q0, IMG_FLOOR = 1000, 200 * 1024, 80, 50
THUMB_W, THUMB_MAX_BYTES, THUMB_Q0, THUMB_FLOOR = 200, 15 * 1024, 80, 40
STEP = 4
ORDINALS = ['הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי', 'השישי', 'השביעי', 'השמיני', 'התשיעי', 'העשירי']
PART_KINDS = ['front', 'intro', 'meeting', 'closing', 'glossary', 'activities']
P_STYLES = {'': None, 'kv': 'kv', 'mem': 'mem', 'verse': 'verse', 'note': 'note', 'small': 'small', 'center': 'center', 'center.strong': 'center-strong'}
INLINE_MARKS = {'b': 'b', 'strong': 'b', 'em': 'em', 'small': 'small'}
BAD_WS = re.compile(r'[\t\n\r\f\v]|  ')


class Bad(Exception):
    """The source (or the meta file) is not what the generator knows: the message names the place."""


# ---- places and strict text ------------------------------------------------------------------------------------
def ident(el):
    cls = sorted(el.get('class', '').split())
    return el.tag + (f'#{el.get("id")}' if el.get('id') else '') + ''.join('.' + c for c in cls)


def loc(el):
    chain = []
    e = el
    while e is not None and isinstance(e.tag, str) and e.tag not in ('html', 'body'):
        par = e.getparent()
        idx = ''
        if par is not None:
            sib = [c for c in par if isinstance(c.tag, str)]
            idx = f'[{sib.index(e)}]'
        chain.append(ident(e) + idx)
        e = par
    return ' > '.join(reversed(chain)) + f' (line {el.sourceline})'


def u16(s):
    return len(s.encode('utf-16-le')) // 2


def sort_cls(el):
    return '.'.join(sorted(el.get('class', '').split()))


def words(texts):
    """Words as a reader counts them: whitespace-separated pieces that hold a letter or a digit."""
    return sum(1 for t in texts for w in t.split() if any(c.isalnum() for c in w))


# ---- images ----------------------------------------------------------------------------------------------------
def encode_webp(im, max_bytes, q0, floor):
    q = q0
    while True:
        b = io.BytesIO()
        im.save(b, 'WEBP', quality=q, method=6)
        data = b.getvalue()
        if len(data) <= max_bytes or q <= floor:
            return data, q
        q = max(q - STEP, floor)


class Parser:
    def __init__(self, root, meta):
        self.root = root
        self.meta = meta
        self.book = meta['book']
        self.route = meta['route']
        self.seen = set()
        self.chrome = []          # (what, text) of everything that is the page and not the book
        self.pending = {}         # file name -> the picture, decoded and resized, waiting to be encoded
        self.images = {}          # file name -> webp bytes
        self.image_info = {}      # file name -> { source w/h/bytes, w, h, q, bytes }
        self.son = 0
        self.slug_of = {}         # the book's anchor (m1) -> slug (meeting-1)
        self.placeholders = 0
        self.marks = collections.Counter()
        self.toc, self.toc_order = {}, []     # the contents drawer: anchor -> label, and its order
        self.kind_of, self.station_of = {}, {}

    # ---- helpers ----
    def bad(self, el, msg):
        raise Bad(f'{loc(el)}: {msg}')

    def see(self, el):
        self.seen.add(el)

    def attrs(self, el, allowed=()):
        extra = set(el.attrib) - set(allowed)
        if extra:
            self.bad(el, f'unknown attribute {sorted(extra)}')

    def exact(self, text, el, what='text'):
        """The text must be one that needs no whitespace repair: no edge whitespace, no newline, tab or double space."""
        if text != text.strip() or BAD_WS.search(text):
            self.bad(el, f'{what} {text[:60]!r} has edge whitespace, a newline, a tab or a double space: the generator does not repair text')
        return text

    def only_text(self, el, what='element'):
        """An element that holds text and nothing else."""
        self.see(el)
        if len(el):
            self.bad(el, f'{what} must hold only text, found <{el[0].tag}>')
        return self.exact(el.text or '', el, what)

    def blank(self, s, el, what):
        if (s or '').strip():
            self.bad(el, f'unexpected text {s.strip()[:60]!r} {what}')

    # ---- a run of text with emphasis ----
    def run_of(self, el):
        """(text, marks, placeholder) of an element's inline content."""
        self.see(el)
        pieces, flags = [], {'placeholder': False}

        def walk(e, mark):
            if e.text:
                pieces.append((e.text, mark))
            for c in e:
                if not isinstance(c.tag, str):
                    self.bad(c, 'comment or processing instruction')
                self.attrs(c)
                self.see(c)
                if c.tag in INLINE_MARKS:
                    k = INLINE_MARKS[c.tag]
                    if mark is not None:
                        self.bad(c, f'<{c.tag}> inside another emphasis')
                    walk(c, k)
                elif c.tag == 'mark':
                    flags['placeholder'] = True
                    walk(c, mark)
                else:
                    self.bad(c, f'unknown inline element <{c.tag}> in running text')
                if c.tail:
                    pieces.append((c.tail, mark))

        walk(el, None)
        text = ''.join(t for t, _ in pieces)
        self.exact(text, el)
        if not text:
            self.bad(el, 'empty text')
        marks, pos = [], 0
        for t, m in pieces:
            a, b = pos, pos + u16(t)
            pos = b
            if m is None:
                continue
            if marks and marks[-1]['k'] == m and marks[-1]['to'] == a:
                marks[-1]['to'] = b
            else:
                marks.append({'k': m, 'from': a, 'to': b})
        for m in marks:
            self.marks[m['k']] += 1
        return text, marks, flags['placeholder']

    def run(self, el):
        text, marks, ph = self.run_of(el)
        if ph:
            self.bad(el, 'a <mark> (an unfilled field) is only expected in a paragraph')
        out = {'text': text}
        if marks:
            out['marks'] = marks
        return out

    # ---- pictures ----
    def picture(self, img, name, max_w, max_bytes, q0, floor, alt_required=True):
        self.see(img)
        self.attrs(img, {'src', 'alt'})
        if len(img):
            self.bad(img, 'an <img> with children')
        m = re.fullmatch(r'data:image/(jpeg|png);base64,([A-Za-z0-9+/=]+)', img.get('src') or '')
        if not m:
            self.bad(img, 'the picture must be an embedded base64 jpeg or png (data: URI)')
        alt = img.get('alt')
        if alt is None or (alt_required and not alt.strip()):
            self.bad(img, 'the picture has no alt text')
        if name in self.pending:
            self.bad(img, f'two pictures would be written to {name}')
        raw = base64.b64decode(m.group(2), validate=True)
        with Image.open(io.BytesIO(raw)) as im:
            im.load()
            sw, sh = im.size
            im = im.convert('RGB')
        if sw > max_w:
            im = im.resize((max_w, (sh * max_w + sw // 2) // sw), Image.LANCZOS)
        # encoded later, once the whole source has been read and checked: a source that is not what the generator knows
        # stops the run in a moment, not after the pictures
        self.pending[name] = (im, max_bytes, q0, floor, img, f'{sw}x{sh} {len(raw)} B')
        return {'src': f'/kids/books/{self.book}/{name}', 'w': im.width, 'h': im.height, 'alt': alt}

    def encode_pictures(self):
        for name, (im, max_bytes, q0, floor, img, source) in self.pending.items():
            data, q = encode_webp(im, max_bytes, q0, floor)
            if len(data) > max_bytes:
                self.bad(img, f'{name} is {len(data)} bytes at quality {q}, over {max_bytes}')
            self.images[name] = data
            self.image_info[name] = {'source': source, 'w': im.width, 'h': im.height, 'q': q, 'bytes': len(data)}

    # ---- the whole document ----
    def parse(self, doc):
        if doc.tag != 'html' or set(doc.attrib) != {'lang', 'dir'} or doc.get('lang') != 'he' or doc.get('dir') != 'rtl':
            self.bad(doc, 'the document must be <html lang="he" dir="rtl">')
        for e in doc.iter():
            if not isinstance(e.tag, str):
                raise Bad(f'comment or processing instruction in the document (near line {e.getparent().sourceline if e.getparent() is not None else "?"})')
        kids = [c for c in doc]
        if [c.tag for c in kids] != ['head', 'body']:
            self.bad(doc, 'the document must be head, body')
        head, body = kids
        self.parse_head(head)
        self.see(doc), self.see(head), self.see(body)
        seq = [ident(c) for c in body]
        want = ['div#progress', 'nav.bar', 'aside#toc', 'main', 'footer.foot', 'script']
        if seq != want:
            self.bad(body, f'the body must hold exactly {want}, found {seq}')
        progress, nav, toc, main, footer, script = list(body)
        for chrome_el, what in ((progress, 'progress bar'), (nav, 'navigation bar'), (footer, 'footer'), (script, 'script')):
            self.take_chrome(chrome_el, what)
        self.parse_toc(toc)
        main_kids = list(main)
        self.see(main)
        self.attrs(main)
        if not main_kids or ident(main_kids[0]) != 'header#top.cover':
            self.bad(main, 'main must start with header#top.cover')
        cover = self.parse_cover(main_kids[0])
        sections = main_kids[1:]
        for s in sections:
            if s.tag != 'section' or not s.get('id'):
                self.bad(s, 'main may hold the cover and sections with an id, nothing else')
        self.index_sections(sections)
        parts = [self.parse_section(s) for s in sections]
        self.check_toc(parts)
        stray = [e for e in doc.iter() if e not in self.seen]
        if stray:
            raise Bad('elements nobody mapped: ' + '; '.join(loc(e) for e in stray[:8]))
        return cover, parts

    # ---- page chrome: listed, never silently dropped ----
    def take_chrome(self, el, what):
        text = ' '.join(''.join(el.itertext()).split())
        for e in el.iter():
            self.see(e)
        self.chrome.append((what, text[:100] if what != 'script' else f'{len("".join(el.itertext()))} characters'))

    def parse_head(self, head):
        for c in head:
            self.see(c)
            if c.tag == 'meta':
                self.attrs(c, {'charset', 'name', 'content'})
                self.chrome.append(('head meta', f'{c.get("name") or "charset"}: {(c.get("content") or c.get("charset") or "")[:90]}'))
            elif c.tag == 'title':
                self.chrome.append(('head title', c.text or ''))
            elif c.tag == 'link':
                self.attrs(c, {'rel', 'href', 'crossorigin'})
                self.chrome.append(('head link', f'{c.get("rel")} {c.get("href")}'))
            elif c.tag == 'style':
                self.chrome.append(('head style', f'{len(c.text or "")} characters of css'))
            else:
                self.bad(c, 'unknown element in the head')

    def parse_toc(self, toc):
        self.see(toc)
        self.attrs(toc, {'id', 'hidden'})
        if len(toc) != 1 or ident(toc[0]) != 'ol':
            self.bad(toc, 'the contents drawer must hold one <ol>')
        self.see(toc[0])
        self.attrs(toc[0])
        for li in toc[0]:
            self.see(li)
            self.attrs(li)
            if li.tag != 'li' or len(li) != 1 or li[0].tag != 'a':
                self.bad(li, 'a contents entry must be <li><a href="#id">label</a></li>')
            a = li[0]
            self.see(a)
            self.attrs(a, {'href'})
            self.blank(li.text, li, 'in a contents entry')
            href = a.get('href') or ''
            if not href.startswith('#') or len(a):
                self.bad(a, 'a contents link must be #id with text only')
            sid = href[1:]
            if sid in self.toc:
                self.bad(a, f'{sid} is in the contents twice')
            self.toc[sid] = self.exact(a.text or '', a, 'contents label')
            self.toc_order.append(sid)
        self.chrome.append(('contents drawer', f'{len(self.toc_order)} links; their texts are the parts\' tocLabel'))

    def check_toc(self, parts):
        want = [p['id'] for p in parts if p['nav']]
        if want != self.toc_order:
            raise Bad(f'the contents drawer lists {self.toc_order} but the sections after the copyright page are {want}')

    # ---- the cover ----
    def parse_cover(self, header):
        self.see(header)
        self.attrs(header, {'class', 'id'})
        kids = list(header)
        want = ['p.kick', 'h1.title', 'p.sub', 'figure.cover-img', 'p.age', 'a.start']
        if [ident(k) for k in kids] != want:
            self.bad(header, f'the cover must hold {want}, found {[ident(k) for k in kids]}')
        kick, h1, sub, fig, age, start = kids
        for e in (kick, h1, sub, age):
            self.attrs(e, {'class'})
        self.blank(header.text, header, 'in the cover')
        self.attrs(fig, {'class'})
        self.see(fig)
        if len(fig) != 1 or fig[0].tag != 'img':
            self.bad(fig, 'the cover figure must hold one <img>')
        self.attrs(start, {'class', 'href'})
        self.take_chrome(start, 'cover button')
        return {
            'title': self.only_text(h1), 'subtitle': self.only_text(sub), 'kick': self.only_text(kick), 'age': self.only_text(age),
            'cover': self.picture(fig[0], 'cover.webp', IMG_MAX_W, IMG_MAX_BYTES, IMG_Q0, IMG_FLOOR),
        }

    # ---- sections ----
    def index_sections(self, sections):
        for s in sections:
            sid = s.get('id')
            m = re.fullmatch(r'm(\d+)', sid)
            if sid in self.slug_of:
                self.bad(s, f'two sections with the id {sid}')
            if m:
                n = int(m.group(1))
                if not 1 <= n <= len(ORDINALS):
                    self.bad(s, f'meeting {n}: the generator knows the ordinals of 1..{len(ORDINALS)}')
                self.slug_of[sid] = f'meeting-{n}' if self.route == 'saltiel' else f'station-{n}'
                self.kind_of[sid] = 'meeting'
                self.station_of[sid] = n
                if sort_cls(s) != 'meeting':
                    self.bad(s, 'a meeting section must have class "meeting"')
            else:
                kinds = self.meta.get('kinds', {})
                if sid not in kinds:
                    self.bad(s, f'the meta file says nothing about a section with the id {sid} (add it to "kinds")')
                if kinds[sid] not in PART_KINDS or kinds[sid] == 'meeting':
                    raise Bad(f'meta kinds[{sid}] = {kinds[sid]!r} is not one of {[k for k in PART_KINDS if k != "meeting"]}')
                self.slug_of[sid] = sid
                self.kind_of[sid] = kinds[sid]
                if sort_cls(s) not in ('', sid):
                    self.bad(s, f'a section with the id {sid} may carry no class or the class "{sid}"')
        for sid in self.meta.get('kinds', {}):
            if sid not in self.slug_of:
                raise Bad(f'meta kinds names the section {sid}, which the source does not have')
        nums = sorted(self.station_of.values())
        if nums != list(range(1, len(nums) + 1)):
            raise Bad(f'the meetings are numbered {nums}, expected 1..{len(nums)}')

    def parse_section(self, sec):
        self.see(sec)
        self.attrs(sec, {'id', 'class'})
        sid = sec.get('id')
        kind = self.kind_of[sid]
        n = self.station_of.get(sid)
        kids = list(sec)
        self.blank(sec.text, sec, 'in a section')
        i = 0
        part = {'slug': self.slug_of[sid], 'id': sid, 'kind': kind}
        if kids and ident(kids[0]) == 'p.cr-h':
            part['title'] = self.only_text(kids[0])
            self.attrs(kids[0], {'class'})
            i = 1
        else:
            if kids and ident(kids[0]) == 'p.kick':
                self.attrs(kids[0], {'class'})
                part['kick'] = self.only_text(kids[0])
                i = 1
            if i >= len(kids) or kids[i].tag != 'h1' or kids[i].attrib:
                self.bad(sec, 'a section must start with [p.kick] h1')
            part['title'] = self.only_text(kids[i])
            i += 1
            if i < len(kids) and ident(kids[i]) == 'p.subtitle':
                self.attrs(kids[i], {'class'})
                part['subtitle'] = self.only_text(kids[i])
                i += 1
        if n is not None:
            part['station'] = n
            want = ORDINALS[n - 1]
            if want not in part.get('kick', ''):
                self.bad(sec, f'meeting {n}: its kick {part.get("kick")!r} should name {want!r}')
        part['nav'] = sid in self.toc
        if part['nav']:
            part['tocLabel'] = self.toc[sid]
        blocks = []
        for k in kids[i:]:
            blocks.append(self.block(k, sid, n))
        part['blocks'] = blocks
        return part

    # ---- blocks ----
    def block(self, el, sid, n):
        self.see(el)
        if not isinstance(el.tag, str):
            self.bad(el, 'comment')
        self.blank(el.tail, el, 'after an element')
        key = ident(el)
        key = re.sub(r'#[^.]*', '', key)           # ids only matter on sections
        if el.tag == 'p':
            cls = sort_cls(el)
            if cls == 'extras':
                return self.p_extras(el)
            if cls not in P_STYLES:
                self.bad(el, f'unknown paragraph class "{cls}"')
            self.attrs(el, {'class'})
            text, marks, ph = self.run_of(el)
            b = {'t': 'p', 'text': text}
            if marks:
                b['marks'] = marks
            if P_STYLES[cls]:
                b['style'] = P_STYLES[cls]
            if ph:
                b['placeholder'] = True
                self.placeholders += 1
            return b
        if key in ('h2', 'h3'):
            self.attrs(el)
            text, marks, ph = self.run_of(el)
            if ph:
                self.bad(el, 'a placeholder in a heading')
            b = {'t': 'h', 'level': int(el.tag[1]), 'text': text}
            if marks:
                b['marks'] = marks
            return b
        if key == 'hr.gap':
            self.attrs(el, {'class'})
            if len(el) or (el.text or '').strip():
                self.bad(el, 'a separator with content')
            return {'t': 'sep'}
        if key == 'figure.panel':
            return self.figure(el, 'panel', f'{sid}.webp')
        if key == 'figure.son':
            self.son += 1
            return self.figure(el, 'son', f'son-{self.son}.webp')
        if key == 'div.card':
            return self.card(el)
        if key == 'aside.key':
            if n is None:
                self.bad(el, 'a key box outside a meeting')
            return self.key(el, n)
        if key == 'aside.activity':
            return self.activity(el)
        if key == 'blockquote.answer':
            return self.quote(el)
        if key == 'ol.journey':
            return self.journey(el)
        if key == 'ol.timeline':
            return self.timeline(el)
        if key == 'dl.glossary':
            return self.glossary(el)
        if key == 'div.stamps':
            return self.stamps(el)
        self.bad(el, f'unknown element <{key}> in a section: the generator maps only the constructs the edition uses')

    def figure(self, el, variant, name):
        self.attrs(el, {'class'})
        kids = list(el)
        if not kids or kids[0].tag != 'img' or any(k.tag != 'figcaption' for k in kids[1:]) or len(kids) > 2:
            self.bad(el, 'a figure must hold an <img> and at most one <figcaption>')
        img = self.picture(kids[0], name, IMG_MAX_W, IMG_MAX_BYTES, IMG_Q0, IMG_FLOOR)
        b = {'t': 'img', 'variant': variant, **img}
        if len(kids) == 2:
            self.attrs(kids[1])
            b['caption'] = self.only_text(kids[1], 'caption')
        return b

    def card(self, el):
        self.attrs(el, {'class'})
        kids = list(el)
        if not kids or ident(kids[0]) != 'p.card-h':
            self.bad(el, 'a card must start with p.card-h')
        self.attrs(kids[0], {'class'})
        b = {'t': 'card', 'title': self.only_text(kids[0]), 'rows': []}
        for p in kids[1:]:
            self.see(p)
            self.attrs(p)
            if p.tag != 'p' or len(p) != 1 or ident(p[0]) != 'span.lab':
                self.bad(p, 'a card row must be <p><span class="lab">label</span> text</p>')
            self.blank(p.text, p, 'before a card label')
            lab = p[0]
            self.attrs(lab, {'class'})
            label = self.only_text(lab, 'card label')
            text = self.exact((lab.tail or '').strip(), p, 'card text')
            if not text:
                self.bad(p, 'a card row without text')
            b['rows'].append({'label': label, 'text': text})
        if not b['rows']:
            self.bad(el, 'a card without rows')
        return b

    def key(self, el, n):
        self.attrs(el, {'class'})
        kids = list(el)
        if [ident(k) for k in kids] != ['p.key-h', 'p', 'p.key-src']:
            self.bad(el, f'a key box must hold p.key-h, p, p.key-src, found {[ident(k) for k in kids]}')
        h, body, src = kids
        self.attrs(h, {'class'})
        self.attrs(body)
        self.attrs(src, {'class'})
        title = self.only_text(h, 'key title')
        before, colon, name = title.partition(':')
        name = name.strip()
        if not colon or not name:
            self.bad(h, f'key title {title!r} has no ":" and a name after it')
        want = 'המפתח ' + ORDINALS[n - 1]
        if before.strip() != want:
            self.bad(h, f'the key of meeting {n} must be titled "{want}: …", found {before.strip()!r}')
        self.see(src)
        if len(src) != 1 or src[0].tag != 'small' or len(src[0]):
            self.bad(src, 'the key verse must be text followed by one <small>source</small>')
        self.attrs(src[0])
        self.see(src[0])
        self.blank(src[0].tail, src[0], 'after the verse source')
        verse = self.exact((src.text or '').strip(), src, 'key verse')
        source = self.exact(src[0].text or '', src[0], 'key verse source')
        if not verse or not source:
            self.bad(src, 'a key verse needs its text and its source')
        return {'t': 'key', 'n': n, 'title': title, 'name': name, 'text': self.only_text(body, 'key text'), 'verse': verse, 'source': source}

    def activity(self, el):
        self.attrs(el, {'class'})
        kids = list(el)
        if not kids or kids[0].tag != 'h3' or kids[-1].tag != 'ol' or len(kids) > 3 or (len(kids) == 3 and kids[1].tag != 'p'):
            self.bad(el, 'an activity must hold h3, [p], ol')
        self.attrs(kids[0])
        b = {'t': 'activity', 'title': self.only_text(kids[0])}
        if len(kids) == 3:
            self.attrs(kids[1])
            b['intro'] = self.run(kids[1])
        ol = kids[-1]
        self.see(ol)
        self.attrs(ol)
        items = []
        for li in ol:
            self.attrs(li)
            if li.tag != 'li':
                self.bad(li, 'an activity list holds only <li>')
            r = self.run(li)
            if not r.get('marks') or r['marks'][0]['k'] != 'b' or r['marks'][0]['from'] != 0:
                self.bad(li, 'an activity item must start with a bold label')
            items.append(r)
        if not items:
            self.bad(ol, 'an empty activity list')
        b['items'] = items
        return b

    def quote(self, el):
        self.attrs(el, {'class'})
        if [ident(k) for k in el] != ['p', 'cite']:
            self.bad(el, 'a quote must hold p, cite')
        self.attrs(el[0])
        self.attrs(el[1])
        return {'t': 'quote', 'text': self.only_text(el[0]), 'source': self.only_text(el[1])}

    def target(self, a):
        self.see(a)
        self.attrs(a, {'href'})
        href = a.get('href') or ''
        if not href.startswith('#') or href[1:] not in self.slug_of:
            self.bad(a, f'link {href!r} does not point at a section of the book')
        return href[1:]

    def p_extras(self, el):
        self.attrs(el, {'class'})
        self.blank(el.text, el, 'in the links row')
        items = []
        for i, a in enumerate(el):
            self.see(a)
            if a.tag != 'a' or len(a):
                self.bad(a, 'the links row holds only <a> with text')
            sid = self.target(a)
            items.append({'text': self.only_text(a, 'link'), 'part': self.slug_of[sid]})
            tail = a.tail or ''
            if i < len(el) - 1 and tail != ' · ':
                self.bad(a, f'links must be separated by " · ", found {tail!r}')
            if i == len(el) - 1 and tail.strip():
                self.bad(a, 'text after the last link')
        if not items:
            self.bad(el, 'an empty links row')
        return {'t': 'links', 'items': items}

    def journey(self, ol):
        self.attrs(ol, {'class'})
        items = []
        for li in ol:
            self.see(li)
            self.attrs(li)
            if li.tag != 'li' or len(li) != 1 or li[0].tag != 'a':
                self.bad(li, 'a journey entry must be <li><a href="#m…">…</a></li>')
            a = li[0]
            sid = self.target(a)
            if [ident(k) for k in a] != ['img', 'span.n', 'span.t']:
                self.bad(a, f'a journey link must hold img, span.n, span.t, found {[ident(k) for k in a]}')
            img, num, t = list(a)
            self.attrs(num, {'class'})
            self.attrs(t, {'class'})
            n = int(self.only_text(num, 'journey number'))
            if n != self.station_of.get(sid):
                self.bad(a, f'journey entry {n} points at {sid}')
            self.see(t)
            if [ident(k) for k in t] != ['b', 'small', 'small']:
                self.bad(t, 'a journey text must hold b, small, small')
            for k in t:
                self.attrs(k)
            thumb = self.picture(img, f'{sid}.sm.webp', THUMB_W, THUMB_MAX_BYTES, THUMB_Q0, THUMB_FLOOR, alt_required=False)
            items.append({'n': n, 'title': self.only_text(t[0]), 'where': self.only_text(t[1]), 'who': self.only_text(t[2]),
                          'part': self.slug_of[sid], 'thumb': thumb})
        if [i['n'] for i in items] != list(range(1, len(items) + 1)):
            self.bad(ol, f'the journey is numbered {[i["n"] for i in items]}, expected 1..{len(items)}')
        return {'t': 'journey', 'items': items}

    def timeline(self, ol):
        self.attrs(ol, {'class'})
        items = []
        for li in ol:
            self.see(li)
            self.attrs(li, {'class'})
            klass = sort_cls(li)
            if li.tag != 'li' or klass not in ('', 'first'):
                self.bad(li, 'a timeline entry is <li> or <li class="first">')
            if [ident(k) for k in li] != ['span.dot', 'span.yr', 'span.pl']:
                self.bad(li, f'a timeline entry must hold span.dot, span.yr, span.pl, found {[ident(k) for k in li]}')
            dot, yr, pl = list(li)
            for k in (dot, yr, pl):
                self.attrs(k, {'class'})
            self.see(yr), self.see(pl)
            n = int(self.only_text(dot, 'timeline number'))
            if [ident(k) for k in yr] != ['b', 'small'] or (yr.text or '').strip() or (yr[0].tail or '').strip() or (yr[1].tail or '').strip():
                self.bad(yr, 'a timeline year must be <b>hebrew</b> <small>civil</small>')
            self.attrs(yr[0]), self.attrs(yr[1])
            if [ident(k) for k in pl] != ['b', 'a'] or (pl.text or '').strip() or (pl[1].tail or '').strip():
                self.bad(pl, 'a timeline place must be <b>place</b> · region · <a>…</a>')
            self.attrs(pl[0])
            m = re.fullmatch(r' · (.+) · ', pl[0].tail or '')
            if not m:
                self.bad(pl, f'a timeline place must read "place · region · link", found {(pl[0].tail or "")!r}')
            sid = self.target(pl[1])
            if n != self.station_of.get(sid) or self.only_text(pl[1], 'link') != f'מפגש {n}':
                self.bad(li, f'timeline entry {n} points at {sid} ({pl[1].text!r})')
            it = {'n': n, 'hebrew': self.only_text(yr[0]), 'civil': self.only_text(yr[1]), 'place': self.only_text(pl[0]),
                  'region': self.exact(m.group(1), pl, 'timeline region'), 'part': self.slug_of[sid]}
            if klass == 'first':
                it['first'] = True
            items.append(it)
        if len(items) != len(self.station_of) or sorted(i['n'] for i in items) != sorted(self.station_of.values()):
            self.bad(ol, 'the timeline must hold every meeting once')
        if sum(1 for i in items if i.get('first')) != 1:
            self.bad(ol, 'exactly one timeline entry is the first')
        return {'t': 'timeline', 'items': items}

    def glossary(self, dl):
        self.attrs(dl, {'class'})
        kids = list(dl)
        if not kids or len(kids) % 2 or any(k.tag != ('dt' if i % 2 == 0 else 'dd') for i, k in enumerate(kids)):
            self.bad(dl, 'a glossary is pairs of <dt> and <dd>')
        items = []
        for dt, dd in zip(kids[0::2], kids[1::2]):
            self.attrs(dt)
            self.attrs(dd)
            self.see(dd)
            if len(dd) != 1 or ident(dd[0]) != 'span.idea':
                self.bad(dd, 'a glossary definition must be text followed by one span.idea')
            idea = dd[0]
            self.attrs(idea, {'class'})
            self.blank(idea.tail, idea, 'after an idea')
            items.append({'term': self.only_text(dt), 'text': self.exact(dd.text or '', dd, 'glossary text'), 'idea': self.only_text(idea)})
        return {'t': 'glossary', 'items': items}

    def stamps(self, div):
        self.attrs(div, {'class'})
        box, items = None, []
        for st in div:
            self.see(st)
            self.attrs(st, {'class'})
            if ident(st) != 'div.stamp' or [ident(k) for k in st] != ['b', 'span.box', 'span.line']:
                self.bad(st, 'a stamp must be div.stamp > b, span.box, span.line')
            for k in st:
                self.attrs(k, {'class'})
            b = self.only_text(st[1])
            if box not in (None, b):
                self.bad(st, 'the stamps have different box labels')
            box = b
            self.see(st[2])
            if len(st[2]) or (st[2].text or '').strip():
                self.bad(st[2], 'the stamp line must be empty')
            items.append(self.only_text(st[0]))
        if not items:
            self.bad(div, 'no stamps')
        return {'t': 'stamps', 'box': box, 'items': items}


def lossless(doc, parser, parts):
    """The safety net under the parser: every text node of <main> outside the cover (whitespace and the "·" separators of the
    map and timeline rows aside) is in the parts, in order and nowhere else, so a text the parser forgot cannot go missing."""
    main = doc.find('body').find('main')
    got = ''.join(t for el in list(main)[1:] for t in el.itertext())
    want = ''.join(t for part in parts for t in part_texts(part, 'html'))
    squash = lambda t: re.sub(r'\s+', '', t).replace('·', '')
    got, want = squash(got), squash(want)
    if got != want:
        i = next((k for k, (x, y) in enumerate(zip(got, want)) if x != y), min(len(got), len(want)))
        raise Bad(f'the parts do not hold exactly the text of <main> (first difference at character {i}: source …{got[max(0, i - 40):i + 40]}… parts …{want[max(0, i - 40):i + 40]}…)')


# ---- the book ---------------------------------------------------------------------------------------------------
def build_book(meta, source_bytes, source_sha):
    doc = LH.document_fromstring(source_bytes, parser=LH.HTMLParser(encoding='utf-8', remove_comments=False, remove_pis=False))
    p = Parser(doc, meta)
    cover, parts = p.parse(doc)
    for part in parts:
        for b in part['blocks']:
            if b['t'] == 'key' and b['n'] != part.get('station'):
                raise Bad(f'{part["slug"]}: its key is number {b["n"]}')
    lossless(doc, p, parts)
    book = {
        'schema': 1, 'book': meta['book'], 'route': meta['route'],
        'title': cover['title'], 'subtitle': cover['subtitle'], 'kick': cover['kick'], 'age': cover['age'],
        'credit': meta['credit'],
        'cover': cover['cover'],
        'source': {'file': meta['source']['file'], 'sha256': source_sha, 'edition': meta['source']['edition']},
        'parts': parts,
    }
    return book, p


# ---- the text of the book, in the order the docx has it ------------------------------------------------------------
def part_texts(part, mode='docx'):
    """Every text of a part in reading order (placeholders are text of the book too). `mode`: 'docx' = as the docx's text has
    it (an ordered list numbered in its text, an index number is not text); 'html' = as the page shows it (the numbers of the
    map and the timeline and the "מפגש N" links are text, a list is not numbered); 'words' = neither, for counting."""
    out = []
    for k in ('kick', 'title', 'subtitle'):
        if part.get(k):
            out.append(part[k])
    for b in part['blocks']:
        t = b['t']
        if t in ('h', 'p'):
            out.append(b['text'])
        elif t == 'img':
            if b.get('caption'):
                out.append(b['caption'])
        elif t == 'quote':
            out += [b['text'], b['source']]
        elif t == 'card':
            out.append(b['title'])
            for r in b['rows']:
                out += [r['label'], r['text']]
        elif t == 'key':
            out += [b['title'], b['text'], b['verse'], b['source']]
        elif t == 'activity':
            out.append(b['title'])
            if b.get('intro'):
                out.append(b['intro']['text'])
            for i, it in enumerate(b['items']):
                out.append((f'{i + 1}.' if mode == 'docx' else '') + it['text'])
        elif t == 'links':
            out += [i['text'] for i in b['items']]
        elif t == 'journey':
            for i in b['items']:
                out += ([str(i['n'])] if mode == 'html' else []) + [i['title'], i['where'], i['who']]
        elif t == 'timeline':
            for i in b['items']:
                out += ([str(i['n'])] if mode == 'html' else []) + [i['hebrew'], i['civil'], i['place'], i['region']] + ([f'מפגש {i["n"]}'] if mode == 'html' else [])
        elif t == 'glossary':
            for i in b['items']:
                out += [i['term'], i['text'], i['idea']]
        elif t == 'stamps':
            for i in b['items']:
                out += [i, b['box']]
    return out


def cover_lines(book):
    return [f'{book["title"]}: {book["subtitle"]}', book['title'], book['title'], book['subtitle'], book['kick'], book['age']]


def norm_cmp(t):
    t = t.replace('\\', '')
    for a, b in (('״', '"'), ('׳', "'"), ('“', '"'), ('”', '"'), ('„', '"'), ('’', "'"), ('‘', "'")):
        t = t.replace(a, b)
    t = re.sub(r'[–—―־]', '-', t)
    t = re.sub(r'\.{5,}', '', t)
    return re.sub(r'\s+', '', t)


def oracle_segments(text):
    """The oracle's non-empty lines and table cells (raw, stripped). Table rules and empty rows, and cells that are only a
    number (a page number, a meeting number), are not segments."""
    segs = []
    for line in text.split('\n'):
        s = line.strip()
        if not s:
            continue
        if s.startswith('|'):
            if re.fullmatch(r'\|[\s:\-|]*', s):
                continue
            for c in s.strip('|').split('|'):
                c = c.strip()
                if c and not re.fullmatch(r'\d+', c):
                    segs.append(c)
        else:
            segs.append(s)
    return segs


def coverage(book, oracle_text, cover_n):
    """(segments, missing): the oracle's segments after the cover block, and those not found in the book's text in order."""
    segs = oracle_segments(oracle_text)
    cover, rest = segs[:cover_n], segs[cover_n:]
    problems = []
    want = [norm_cmp(x) for x in cover_lines(book)]
    if [norm_cmp(x) for x in cover] != want:
        problems.append(f'the first {cover_n} lines of the oracle are not the cover fields: {cover}')
    stream = ''.join(norm_cmp(t) for part in book['parts'] for t in part_texts(part))
    pos, missing = 0, []
    for s in rest:
        n = norm_cmp(s)
        i = stream.find(n, pos)
        if i < 0:
            missing.append(s)
        else:
            pos = i + len(n)
    return rest, missing, problems


# ---- files --------------------------------------------------------------------------------------------------------
class Layout:
    def __init__(self, root, book):
        self.root = root
        self.meta = os.path.join(root, 'data', 'kids-books', f'{book}.meta.json')
        self.json = os.path.join(root, 'nextjs-app', 'content', 'kids-books', f'{book}.json')
        self.images = os.path.join(root, 'nextjs-app', 'public', 'kids', 'books', book)

    def rel(self, p):
        return os.path.relpath(p, self.root)


def differences(files, lay):
    changed, extra = [], []
    for p, b in files.items():
        if not os.path.exists(p) or open(p, 'rb').read() != b:
            changed.append(p)
    if os.path.isdir(lay.images):
        for name in sorted(os.listdir(lay.images)):
            p = os.path.join(lay.images, name)
            if os.path.isfile(p) and p not in files:
                extra.append(p)
    return changed, extra


def write_all(files, lay):
    changed, extra = differences(files, lay)
    for p in changed:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'wb') as fh:
            fh.write(files[p])
    for p in extra:
        os.remove(p)
    return changed, extra


def sha256_file(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def print_report(book, parser, segs, missing, print_only, cover_n):
    print('\nParts (words: pieces with a letter or a digit; tokens: every whitespace-separated piece, dashes included)')
    total = tokens = 0
    for part in book['parts']:
        texts = part_texts(part, 'words')
        w, tk = words(texts), sum(len(t.split()) for t in texts)
        total += w
        tokens += tk
        kinds = collections.Counter(b['t'] for b in part['blocks'])
        print(f'  {part["slug"]:<10} {part["kind"]:<10} {w:>6} words {tk:>6} tokens  {sum(kinds.values()):>3} blocks  '
              f'{", ".join(f"{k} {v}" for k, v in sorted(kinds.items()))}')
    print(f'  {len(book["parts"])} parts, {total} words, {tokens} tokens; the {parser.placeholders} paragraph(s) with an unfilled field (copyright page) are counted and are never shown')
    print('\nMarks:', ', '.join(f'{k} {v}' for k, v in sorted(parser.marks.items())))
    print('\nImages')
    tot = 0
    for name in sorted(parser.images, key=lambda n: (n != 'cover.webp', n)):
        i = parser.image_info[name]
        tot += i['bytes']
        print(f'  {name:<14} {i["w"]:>4} x {i["h"]:<4} {i["bytes"]:>7} B  q{i["q"]}   (source {i["source"]})')
    print(f'  {len(parser.images)} files, {tot} B in all ({tot / 1024 / 1024:.2f} MB); encoded with Pillow {Image.__version__}, libwebp {features.version("webp")}')
    print('\nNot book text (page chrome of the HTML edition, listed so nothing is dropped silently)')
    for what, text in parser.chrome:
        print(f'  {what:<16} {text}')
    print('\nCoverage of the docx oracle')
    print(f'  {len(segs)} segments after the {cover_n}-line cover block; {len(segs) - len(missing)} found in order in the JSON, '
          f'{len(missing)} not found (all {len(print_only)} listed in print_only)')
    for m in missing:
        print(f'  print-only: {m[:110]}')
    print('\nNot inspectable: the docx itself is not in the repo (too big for the Drive connector), so its comments, tracked changes, '
          'footnotes and text boxes could not be examined; the oracle text shows none.')


def main():
    ap = argparse.ArgumentParser(description="Build a children's book's reading edition from the owner's HTML edition")
    ap.add_argument('--book', required=True, help='saltiel (shira when her file arrives)')
    ap.add_argument('--check', action='store_true', help='rebuild in memory, write nothing, exit 1 when a file differs')
    ap.add_argument('--report', action='store_true', help='print parts, words, images, what is not book text, the coverage')
    ap.add_argument('--root', help='run on a copy of the repo layout under this directory')
    a = ap.parse_args()

    root = os.path.abspath(a.root) if a.root else os.path.dirname(HERE)
    lay = Layout(root, a.book)
    try:
        meta = json.load(open(lay.meta, encoding='utf-8'))
        for k in ('book', 'route', 'source', 'oracle', 'credit', 'kinds', 'print_only'):
            if k not in meta:
                raise Bad(f'{lay.rel(lay.meta)} lacks "{k}"')
        if meta['book'] != a.book or meta['route'] != a.book:
            raise Bad(f'{lay.rel(lay.meta)} is for {meta["book"]}/{meta["route"]}, not {a.book}')
        src = os.path.join(root, meta['source']['file'])
        orc = os.path.join(root, meta['oracle']['file'])
        sha = sha256_file(src)
        if sha != meta['source']['sha256']:
            raise Bad(f'{meta["source"]["file"]} has sha256 {sha}, the meta file says {meta["source"]["sha256"]}: the source changed; review it, then update the meta file')
        osha = sha256_file(orc)
        if osha != meta['oracle']['sha256']:
            raise Bad(f'{meta["oracle"]["file"]} has sha256 {osha}, the meta file says {meta["oracle"]["sha256"]}')
        book, parser = build_book(meta, open(src, 'rb').read(), sha)
        oracle_text = open(orc, encoding='utf-8').read()
        segs, missing, problems = coverage(book, oracle_text, meta['oracle']['cover_lines'])
        if problems:
            raise Bad('; '.join(problems))
        want = collections.Counter(e['docx_line'] for e in meta['print_only'])
        for e in meta['print_only']:
            if not str(e.get('reason', '')).strip() or not str(e.get('docx_line', '')).strip():
                raise Bad('every print_only entry needs docx_line and reason')
        got = collections.Counter(missing)
        if got != want:
            lost = sorted((got - want).elements())
            stale = sorted((want - got).elements())
            raise Bad('the book text does not cover the docx oracle:' + ''.join(f'\n  missing, not in print_only: {m[:140]}' for m in lost)
                      + ''.join(f'\n  in print_only but found in the book: {m[:140]}' for m in stale))
        parser.encode_pictures()
    except Bad as e:
        print(f'error: {e}', file=sys.stderr)
        return 2

    text = json.dumps(book, ensure_ascii=False, indent=1) + '\n'
    files = {lay.json: text.encode('utf-8')}
    for name, data in parser.images.items():
        files[os.path.join(lay.images, name)] = data

    if a.report:
        print_report(book, parser, segs, missing, meta['print_only'], meta['oracle']['cover_lines'])
    changed, extra = differences(files, lay)
    if a.check:
        for p in changed:
            print(f'differs: {lay.rel(p)}', file=sys.stderr)
        for p in extra:
            print(f'extra file: {lay.rel(p)}', file=sys.stderr)
        if changed or extra:
            print(f'{a.book}: {len(changed)} file(s) differ from the build, {len(extra)} extra; run scripts/build_kids_book.py --book {a.book} '
                  f'(pictures are compared byte for byte; they were encoded with Pillow {Image.__version__}, libwebp {features.version("webp")} here)', file=sys.stderr)
            return 1
        print(f'{a.book}: {len(files)} files match the build')
        return 0
    write_all(files, lay)
    print(f'{a.book}: {len(book["parts"])} parts, {len(parser.images)} pictures; wrote {len(changed)} file(s), removed {len(extra)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
