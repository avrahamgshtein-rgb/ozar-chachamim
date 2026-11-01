#!/usr/bin/env python3
"""Translate research papers through the Claude API (Message Batches), line-aligned.

Same output as the by-hand workflow: $TX_WORK/<id>.<lang>.txt with one `N|translation` line per unit;
then `tx_build.py <id> <lang>` writes the JSON and `tx_verify.py <ids>` re-checks it. An existing
translation is never replaced (tx_build refuses).

  tx_api.py submit <ids...> --lang en|ru|both --model M [--effort E] [--price-in P --price-out P] [--dry-run]
  tx_api.py collect <batch_id> [--wait]
  tx_api.py repair <id> <lang>

The key is read from $ANTHROPIC_API_KEY, or from the first line of the file named by --key-file
(never printed, never written). Needs the `anthropic` package (a venv is fine).
"""
import sys, os, re, json, time, argparse, subprocess

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tx_lib import *

HERE = os.path.dirname(os.path.abspath(__file__))
BATCH_FACTOR = 0.5
BATCHES = f'{TX}/batches.json'
LANG_NAME = {'en': 'English', 'ru': 'Russian'}

RULES = """\
## Rules for this job (they add to the brief above; where they differ, these win)

You are called through the API: you cannot run scripts or read files. The Hebrew units are in the user message.
- Translate what the Hebrew says, slips included. Where a word is an evident typo, render its evident sense and change nothing else.
- Keep every citation marker such as [1, 2] or [cite: 1, 2], every number, every markdown mark such as ** and every ` | ` table separator exactly as in the source.
- Names as the `names:` line, the glossary and the header line give them.
- A year written in Hebrew letters becomes a number, beside the civil year when the paper gives one.
- No Hebrew letters in the output (a transliteration in Latin or Cyrillic letters is fine).
- Russian is translated straight from the Hebrew, not through English.
- A unit marked `(ru only)` is Latin prose: translate it for Russian only and leave it out of the English answer. A unit marked `(en only)` is a Russian paragraph: translate it for English only and leave it out of the Russian answer.
- Answer ONLY with lines of the form `N|translation`: the same N as the source unit, in order, every unit that applies to the target language, one physical line per unit, no line break inside a translation, no blank lines, no commentary, no code fence.
"""


def client(key_file=None):
    import anthropic
    key = os.environ.get('ANTHROPIC_API_KEY')
    if not key and key_file:
        key = open(key_file).read().strip()
    if not key:
        sys.exit('no key: set ANTHROPIC_API_KEY or pass --key-file')
    return anthropic.Anthropic(api_key=key)


def src_text(sid):
    p = f'{TX}/{sid}.src.txt'
    if not os.path.exists(p):
        out = subprocess.run([sys.executable, f'{HERE}/tx_prepare.py', sid], capture_output=True, text=True, check=True).stdout
        open(p, 'w', encoding='utf-8').write(out)
    return open(p, encoding='utf-8').read()


def system_prompt(lang):
    brief = open(f'{HERE}/AGENT_BRIEF.md', encoding='utf-8').read()
    gloss = open(f'{HERE}/glossary.md', encoding='utf-8').read()
    return f'{brief}\n\n# Glossary\n\n{gloss}\n\n{RULES}\nTarget language for this job: {LANG_NAME[lang]}.'


def user_text(sid, lang):
    return (f'{src_text(sid)}\n\n---\nTranslate every unit above into {LANG_NAME[lang]}. '
            f'Answer only with `N|translation` lines, one per unit, every unit.')


def params(sid, lang, model, effort):
    return dict(model=model, max_tokens=64000, system=system_prompt(lang),
                thinking={'type': 'adaptive'}, output_config={'effort': effort},
                messages=[{'role': 'user', 'content': user_text(sid, lang)}])


def needed(sid, lang):
    """The unit numbers the answer must hold (as tx_build needs them)."""
    docs, us, seen, composite = units(sid)
    return [n for n, t, k in us if k == 'h' or (k == 'l' and lang == 'ru')]


def load_batches():
    return json.load(open(BATCHES)) if os.path.exists(BATCHES) else {}


def cmd_submit(a):
    c = client(a.key_file)
    langs = ['en', 'ru'] if a.lang == 'both' else [a.lang]
    jobs = [(i, l) for i in a.ids for l in langs]
    skip = [] if a.allow_existing else [(i, l) for i, l in jobs if os.path.exists(f'{RES}/{i}.{l}.json')]
    for i, l in skip:
        print(f'{i}.{l}: translation file exists, skipped')
    jobs = [j for j in jobs if j not in skip]
    total_in = 0
    reqs = []
    for i, l in jobs:
        p = params(i, l, a.model, a.effort)
        n = c.messages.count_tokens(model=a.model, system=p['system'], messages=p['messages']).input_tokens
        total_in += n
        words = sum(len(d.get('content', '').split()) for d in load_he(i))
        est_out = int(words * 1.9 * (1.6 if l == 'ru' else 1.3)) + 2000
        print(f'{i}.{l}: input {n} tokens, {len(needed(i, l))} units, ~{est_out} output tokens (estimate, thinking not counted)')
        reqs.append((i, l, p, n, est_out))
    if a.price_in is not None and a.price_out is not None:
        est = sum(r[3] * a.price_in + r[4] * a.price_out for r in reqs) / 1e6 * BATCH_FACTOR
        print(f'jobs {len(reqs)}; input {total_in} tokens; estimated batch cost ${est:.2f} (half price; thinking tokens are extra)')
    else:
        print(f'jobs {len(reqs)}; input {total_in} tokens (no estimate: give --price-in and --price-out, USD per million tokens)')
    if a.dry_run or not reqs:
        return
    from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
    from anthropic.types.messages.batch_create_params import Request
    b = c.messages.batches.create(requests=[Request(custom_id=f'{i}-{l}', params=MessageCreateParamsNonStreaming(**p)) for i, l, p, _, _ in reqs])
    bs = load_batches()
    bs[b.id] = {'jobs': [f'{i}-{l}' for i, l, *_ in reqs], 'model': a.model, 'at': time.strftime('%Y-%m-%d %H:%M:%S')}
    json.dump(bs, open(BATCHES, 'w'), indent=1)
    print(f'batch {b.id} submitted ({len(reqs)} jobs); recorded in {BATCHES}')


def cmd_collect(a):
    c = client(a.key_file)
    b = c.messages.batches.retrieve(a.batch_id)
    while b.processing_status != 'ended':
        if not a.wait:
            print(f'status {b.processing_status}: {b.request_counts}')
            return
        time.sleep(30)
        b = c.messages.batches.retrieve(a.batch_id)
    tin = tout = 0
    repair = []
    for r in c.messages.batches.results(a.batch_id):
        sid, lang = r.custom_id.rsplit('-', 1)
        if r.result.type != 'succeeded':
            print(f'{r.custom_id}: {r.result.type}')
            repair.append((sid, lang))
            continue
        m = r.result.message
        text = ''.join(x.text for x in m.content if x.type == 'text')
        lines = [ln.rstrip() for ln in text.split('\n') if re.match(r'^\d+\|', ln)]
        open(f'{TX}/{sid}.{lang}.txt', 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
        got = {int(ln.split('|', 1)[0]) for ln in lines}
        miss = [n for n in needed(sid, lang) if n not in got]
        u = m.usage
        tin += u.input_tokens
        tout += u.output_tokens
        print(f'{r.custom_id}: units {len(got)}/{len(needed(sid, lang))}, stop {m.stop_reason}, in {u.input_tokens}, out {u.output_tokens}'
              + (f', MISSING {miss[:30]}' if miss else ''))
        if miss:
            repair.append((sid, lang))
    if a.price_in is not None and a.price_out is not None:
        print(f'total in {tin}, out {tout} (out includes thinking); batch cost ${(tin * a.price_in + tout * a.price_out) / 1e6 * BATCH_FACTOR:.2f}')
    else:
        print(f'total in {tin}, out {tout} (out includes thinking); no cost shown: give --price-in and --price-out (USD per million tokens)')
    if repair:
        print('needs repair: ' + ', '.join(f'{s} {l}' for s, l in repair))


def cmd_repair(a):
    c = client(a.key_file)
    sid, lang = a.id, a.lang
    path = f'{TX}/{sid}.{lang}.txt'
    got, _ = parse_tx(path) if os.path.exists(path) else ({}, [])
    miss = [n for n in needed(sid, lang) if n not in got]
    if not miss:
        print('nothing missing')
        return
    want = set(miss)
    keep = [ln for ln in src_text(sid).split('\n') if not re.match(r'^\d+\|', ln) or int(ln.split('|', 1)[0]) in want]
    p = params(sid, lang, a.model, a.effort)
    p['messages'] = [{'role': 'user', 'content': '\n'.join(keep) + f'\n\n---\nTranslate only the units above into {LANG_NAME[lang]}. Answer only with `N|translation` lines.'}]
    with c.messages.stream(**p) as s:
        m = s.get_final_message()
    text = ''.join(x.text for x in m.content if x.type == 'text')
    new = [ln.rstrip() for ln in text.split('\n') if re.match(r'^\d+\|', ln) and int(ln.split('|', 1)[0]) in want]
    with open(path, 'a', encoding='utf-8') as f:
        f.write('\n'.join(new) + '\n')
    print(f'repair {sid}.{lang}: asked {len(miss)}, got {len(new)}, in {m.usage.input_tokens}, out {m.usage.output_tokens}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--key-file')
    sp = ap.add_subparsers(dest='cmd', required=True)
    s = sp.add_parser('submit')
    s.add_argument('ids', nargs='+')
    s.add_argument('--lang', choices=['en', 'ru', 'both'], default='both')
    s.add_argument('--model', required=True, help='the model to call (no default)')
    s.add_argument('--effort', default='high')
    s.add_argument('--dry-run', action='store_true')
    s.add_argument('--price-in', type=float, help='USD per million input tokens, for the cost estimate')
    s.add_argument('--price-out', type=float, help='USD per million output tokens, for the cost estimate')
    s.add_argument('--allow-existing', action='store_true', help='test only: translate a paper that already has a file (into $TX_WORK; tx_build still refuses to overwrite)')
    s.set_defaults(f=cmd_submit)
    s = sp.add_parser('collect')
    s.add_argument('batch_id')
    s.add_argument('--wait', action='store_true')
    s.add_argument('--price-in', type=float, help='USD per million input tokens, for the cost line')
    s.add_argument('--price-out', type=float, help='USD per million output tokens, for the cost line')
    s.set_defaults(f=cmd_collect)
    s = sp.add_parser('repair')
    s.add_argument('id')
    s.add_argument('lang', choices=['en', 'ru'])
    s.add_argument('--model', required=True, help='the model to call (no default)')
    s.add_argument('--effort', default='high')
    s.set_defaults(f=cmd_repair)
    a = ap.parse_args()
    a.f(a)


if __name__ == '__main__':
    main()
