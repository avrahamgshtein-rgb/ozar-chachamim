#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
The sage quizzes: twenty questions per sage, written from his research paper by the Claude API.

    python3 scripts/build_quiz.py --index                       # validate every quiz file, rebuild the index (no API)
    python3 scripts/build_quiz.py --dry-run --ids 41            # print the request for one sage (no API)
    python3 scripts/build_quiz.py --submit [--ids 41,594] [--lang he] [--limit N] [--force]
    python3 scripts/build_quiz.py --collect <batch id>          # write the finished quizzes, then --index

--submit sends one Message Batch (half the price of single requests; it usually ends within an hour)
and records its id in data/quiz-batches.json; it skips sages that already have a quiz in that language
unless --force. --collect writes nextjs-app/public/quiz/<id>.json (<id>.en.json, <id>.ru.json for the
other languages), drops any quiz that breaks a rule and says why, and rebuilds
nextjs-app/public/data-quiz.json, the index the site bundles. Rerun --submit with --ids for the ones
that failed. Needs the `anthropic` package and an API key (ANTHROPIC_API_KEY, or `ant auth login`).

The model writes the questions and marks each one easy (true/false), medium or hard; the points are
assigned here, 3 / 5 / 8, scaled so that every quiz is worth exactly 100. The prompt is
scripts/quiz_prompt.md. Every file carries the roster label it was written for, and
nextjs-app/tests/quiz.test.ts fails when an id now belongs to another sage: regenerate, never rename.
"""
import argparse, glob, json, os, re, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(REPO, 'nextjs-app')
RESEARCH = os.path.join(APP, 'public', 'research')
QUIZ = os.path.join(APP, 'public', 'quiz')
INDEX = os.path.join(APP, 'public', 'data-quiz.json')
ROSTER_FILES = ['data.json', 'data-supplement.json', 'data-supplement-2.json', 'data-ancient.json']
PROMPT = os.path.join(REPO, 'scripts', 'quiz_prompt.md')
BATCH_LOG = os.path.join(REPO, 'data', 'quiz-batches.json')
MODEL = os.environ.get('QUIZ_MODEL', 'claude-opus-5-5')

LENGTH, TOTAL, WEIGHTS = 20, 100, {'easy': 3, 'medium': 5, 'hard': 8}
LANGS = {
    'he': {
        'LANGUAGE': 'Hebrew', 'TRUE': 'נכון', 'FALSE': 'לא נכון',
        'STYLE': 'Modern Hebrew, clear and warm, without nikud. Write abbreviations and acronyms with gershayim '
                 'and single quotes with geresh, exactly as in רמב״ם, רש״י, ר׳ (never רמבם or רמב"ם with a plain quote). '
                 'Keep the sages\' names as the paper writes them.',
    },
    'en': {
        'LANGUAGE': 'English', 'TRUE': 'True', 'FALSE': 'False',
        'STYLE': 'Plain, warm English. The paper is in Hebrew: give names, works and terms in their accepted English forms '
                 '(Maimonides (Rambam), Mishneh Torah, Rashi), and transliterate a term only when it has no English name.',
    },
    'ru': {
        'LANGUAGE': 'Russian', 'TRUE': 'Верно', 'FALSE': 'Неверно',
        'STYLE': 'Clear, warm Russian. The paper is in Hebrew: give names, works and terms in their accepted Russian forms '
                 '(Маймонид (Рамбам), Мишне Тора, Раши), and transliterate a term only when it has no Russian name.',
    },
}

# The structured output the model must return. Points are not asked for: they are computed here.
SCHEMA = {
    'type': 'object',
    'properties': {
        'questions': {
            'type': 'array',
            'items': {
                'type': 'object',
                'properties': {
                    'question': {'type': 'string'},
                    'options': {'type': 'array', 'items': {'type': 'string'}},
                    'correctIndex': {'type': 'integer'},
                    'explanation': {'type': 'string'},
                    'difficulty': {'type': 'string', 'enum': ['easy', 'medium', 'hard']},
                },
                'required': ['question', 'options', 'correctIndex', 'explanation', 'difficulty'],
                'additionalProperties': False,
            },
        },
    },
    'required': ['questions'],
    'additionalProperties': False,
}


def roster():
    labels = {}
    for name in ROSTER_FILES:
        path = os.path.join(APP, 'public', name)
        if os.path.exists(path):
            for n in json.load(open(path, encoding='utf-8')).get('nodes', []):
                labels.setdefault(str(n['id']), n['label'])
    return labels


def quiz_path(sid, lang):
    return os.path.join(QUIZ, f'{sid}.json' if lang == 'he' else f'{sid}.{lang}.json')


def research_text(sid):
    """The sage's research, as one text: titles as headings, the citation markers removed."""
    path = os.path.join(RESEARCH, f'{sid}.json')
    if not os.path.exists(path):
        return ''
    parts = []
    for doc in json.load(open(path, encoding='utf-8')):
        body = re.split(r'\n-{10,}\n', doc.get('content', ''))[0]  # the source list after the rule
        body = re.sub(r'\s*\[cite:[^\]]*\]', '', body)
        body = re.sub(r'\[\d+(?:,\s*\d+)*\]', '', body)           # footnote markers [1, 2]
        parts.append(f"# {doc.get('title', '').strip()}\n\n{body.strip()}")
    return '\n\n'.join(parts)


def system_prompt(lang):
    text = open(PROMPT, encoding='utf-8').read()
    for k, v in LANGS[lang].items():
        text = text.replace('{' + k + '}', v)
    return text


def request_params(sid, label, lang):
    return {
        'model': MODEL,
        # Batch requests are asynchronous, so a large ceiling costs nothing; thinking counts toward it.
        'max_tokens': 32000,
        'output_config': {'effort': 'high', 'format': {'type': 'json_schema', 'schema': SCHEMA}},
        'system': system_prompt(lang),
        'messages': [{
            'role': 'user',
            'content': f'<sage>{label}</sage>\n\n<research>\n{research_text(sid)}\n</research>\n\n'
                       f'Write the 20-question quiz about {label} in {LANGS[lang]["LANGUAGE"]}.',
        }],
    }


def assign_points(questions):
    """3 / 5 / 8 by difficulty, scaled to add up to exactly 100 (largest remainder)."""
    weights = [WEIGHTS.get(q.get('difficulty'), 5) for q in questions]
    raw = [w * TOTAL / sum(weights) for w in weights]
    points = [max(1, int(r)) for r in raw]
    order = sorted(range(len(raw)), key=lambda i: raw[i] - int(raw[i]), reverse=True)
    i = 0
    while sum(points) < TOTAL:
        points[order[i % len(order)]] += 1
        i += 1
    while sum(points) > TOTAL:
        j = max(range(len(points)), key=lambda k: points[k])
        points[j] -= 1
    return points


def validate(quiz):
    """The rules of nextjs-app/lib/quiz.ts::validateQuiz. An empty list means valid."""
    errors = []
    if not isinstance(quiz, dict):
        return ['not an object']
    if not str(quiz.get('label', '')).strip():
        errors.append('label is missing')
    qs = quiz.get('questions')
    if not isinstance(qs, list):
        return errors + ['questions is not a list']
    if len(qs) != LENGTH:
        errors.append(f'{len(qs)} questions, expected {LENGTH}')
    total, seen = 0, set()
    for i, q in enumerate(qs, 1):
        at = f'question {i}'
        text = str(q.get('question', '')).strip()
        if not text:
            errors.append(f'{at}: no question text')
        elif text in seen:
            errors.append(f'{at}: repeats an earlier question')
        seen.add(text)
        opts = q.get('options')
        if not isinstance(opts, list) or not 2 <= len(opts) <= 4:
            errors.append(f'{at}: needs 2 to 4 options')
        else:
            if any(not str(o).strip() for o in opts):
                errors.append(f'{at}: an empty option')
            if len({str(o).strip() for o in opts}) != len(opts):
                errors.append(f'{at}: two options are the same')
            ci = q.get('correctIndex')
            if not isinstance(ci, int) or isinstance(ci, bool) or not 0 <= ci < len(opts):
                errors.append(f'{at}: correctIndex {ci} is not an option')
        if not str(q.get('explanation', '')).strip():
            errors.append(f'{at}: no explanation')
        p = q.get('points')
        if not isinstance(p, int) or isinstance(p, bool) or p <= 0:
            errors.append(f'{at}: points must be a positive whole number')
        else:
            total += p
    if total != TOTAL:
        errors.append(f'points add up to {total}, expected {TOTAL}')
    return errors


def to_quiz(label, lang, generated):
    """The model's output as a quiz file: the site's schema, points assigned, true/false options checked."""
    qs = generated.get('questions', [])
    points = assign_points(qs) if qs else []
    tf = [LANGS[lang]['TRUE'], LANGS[lang]['FALSE']]
    out, problems = [], []
    for i, (q, p) in enumerate(zip(qs, points), 1):
        opts = [str(o).strip() for o in q.get('options', [])]
        if len(opts) == 2 and opts != tf:
            problems.append(f'question {i}: a true/false question must offer {tf}')
        out.append({
            'question': q.get('question', '').strip(),
            'options': opts,
            'correctIndex': q.get('correctIndex'),
            'explanation': q.get('explanation', '').strip(),
            'points': p,
        })
    quiz = {'label': label, 'questions': out}
    return quiz, problems + validate(quiz)


def write_index():
    labels = roster()
    sages, bad = {}, 0
    for path in sorted(glob.glob(os.path.join(QUIZ, '*.json'))):
        m = re.fullmatch(r'(.+?)(?:\.(en|ru))?\.json', os.path.basename(path))
        sid, lang = m.group(1), m.group(2) or 'he'
        quiz = json.load(open(path, encoding='utf-8'))
        errors = validate(quiz)
        if sid not in labels:
            errors.append(f'id {sid} is not in the roster')
        elif quiz.get('label') != labels[sid]:
            errors.append(f'written for "{quiz.get("label")}", but id {sid} is now "{labels[sid]}"')
        if errors:
            bad += 1
            print(f'  {os.path.basename(path)}: ' + '; '.join(errors[:4]))
            continue
        entry = sages.setdefault(sid, {'label': labels[sid], 'langs': []})
        entry['langs'].append(lang)
    for e in sages.values():
        e['langs'].sort(key=['he', 'en', 'ru'].index)
    ordered = dict(sorted(sages.items(), key=lambda kv: (len(kv[0]), kv[0])))
    with open(INDEX, 'w', encoding='utf-8') as f:
        json.dump({'_note': 'Generated by scripts/build_quiz.py --index. Do not edit.', 'sages': ordered},
                  f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'index: {len(ordered)} sages with a quiz ({sum(len(e["langs"]) for e in ordered.values())} files)'
          + (f', {bad} invalid file(s) left out' if bad else ''))
    return bad


def pick(args, labels):
    ids = [s.strip() for s in args.ids.split(',')] if args.ids else sorted(
        (os.path.basename(p)[:-5] for p in glob.glob(os.path.join(RESEARCH, '*.json')) if p.count('.') == 1),
        key=lambda s: (len(s), s))
    out = []
    for sid in ids:
        if sid not in labels:
            print(f'  skip {sid}: not in the roster')
        elif not research_text(sid):
            print(f'  skip {sid}: no research paper')
        elif os.path.exists(quiz_path(sid, args.lang)) and not args.force:
            continue
        else:
            out.append(sid)
    return out[:args.limit] if args.limit else out


def main():
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument('--index', action='store_true', help='validate the quiz files and rebuild the index')
    mode.add_argument('--dry-run', action='store_true', help='print the request for the first sage picked')
    mode.add_argument('--submit', action='store_true', help='send a Message Batch')
    mode.add_argument('--collect', metavar='BATCH_ID', help='write the results of a finished batch')
    ap.add_argument('--ids', help='comma-separated sage ids (default: every sage with research)')
    ap.add_argument('--lang', choices=list(LANGS), default='he')
    ap.add_argument('--limit', type=int, help='at most this many sages')
    ap.add_argument('--force', action='store_true', help='also sages that already have a quiz')
    args = ap.parse_args()
    os.makedirs(QUIZ, exist_ok=True)

    if args.index:
        sys.exit(1 if write_index() else 0)

    labels = roster()
    if args.dry_run:
        todo = pick(args, labels)
        if not todo:
            sys.exit('nothing to do')
        params = request_params(todo[0], labels[todo[0]], args.lang)
        print(params['system'])
        print('---\n' + params['messages'][0]['content'][:1500] + ' …')
        print(f'--- research: {len(research_text(todo[0]).split())} words; {len(todo)} sage(s) would be sent')
        return

    import anthropic
    from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
    from anthropic.types.messages.batch_create_params import Request
    client = anthropic.Anthropic()

    if args.submit:
        todo = pick(args, labels)
        if not todo:
            sys.exit('nothing to do: every sage picked already has a quiz (--force to redo)')
        requests = [Request(custom_id=f'{sid}-{args.lang}', params=MessageCreateParamsNonStreaming(
            **request_params(sid, labels[sid], args.lang))) for sid in todo]
        batch = client.messages.batches.create(requests=requests)
        log = json.load(open(BATCH_LOG, encoding='utf-8')) if os.path.exists(BATCH_LOG) else []
        log.append({'id': batch.id, 'lang': args.lang, 'sages': len(todo), 'at': time.strftime('%Y-%m-%d %H:%M')})
        with open(BATCH_LOG, 'w', encoding='utf-8') as f:
            json.dump(log, f, ensure_ascii=False, indent=1)
        print(f'batch {batch.id}: {len(todo)} sage(s), {args.lang}. When it ends: --collect {batch.id}')
        return

    batch = client.messages.batches.retrieve(args.collect)
    if batch.processing_status != 'ended':
        sys.exit(f'batch {batch.id} is {batch.processing_status} ({batch.request_counts.processing} still processing)')
    written, failed = 0, []
    for result in client.messages.batches.results(batch.id):
        sid, lang = result.custom_id.rsplit('-', 1)
        if result.result.type != 'succeeded':
            failed.append(f'{sid} ({lang}): {result.result.type}')
            continue
        msg = result.result.message
        if msg.stop_reason == 'refusal':
            failed.append(f'{sid} ({lang}): declined ({getattr(msg.stop_details, "category", None)})')
            continue
        if msg.stop_reason == 'max_tokens':
            failed.append(f'{sid} ({lang}): ran out of tokens')
            continue
        text = next((b.text for b in msg.content if b.type == 'text'), '')
        try:
            generated = json.loads(text)
        except json.JSONDecodeError:
            failed.append(f'{sid} ({lang}): the output is not JSON')
            continue
        quiz, problems = to_quiz(labels.get(sid, ''), lang, generated)
        if problems:
            failed.append(f'{sid} ({lang}): ' + '; '.join(problems[:3]))
            continue
        with open(quiz_path(sid, lang), 'w', encoding='utf-8') as f:
            json.dump(quiz, f, ensure_ascii=False, indent=1)
            f.write('\n')
        written += 1
    print(f'wrote {written} quiz file(s); {len(failed)} failed')
    for line in failed:
        print('  ' + line)
    if failed:
        print('rerun those with --submit --ids …')
    write_index()


if __name__ == '__main__':
    main()
