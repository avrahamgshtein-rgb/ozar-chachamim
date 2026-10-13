# Quiz translation (no API). `python3 tx_quiz.py prepare <id>` prints the Hebrew quiz as units
#   q1|question   o1.0|option 0 of question 1 (only multiple-choice; true/false options are filled in by the script)   e1|explanation
# Write tx/<id>.quiz.en.txt / <id>.quiz.ru.txt with one `key|translation` line per unit, then
# `python3 tx_quiz.py build <id> [en|ru]` writes nextjs-app/public/quiz/<id>.<lang>.json (label, correctIndex, points copied).
import sys, os, re, json, importlib.util
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TX = os.environ.get('TX_WORK', '/tmp/ozar-translate-lines')
QUIZ = f'{REPO}/nextjs-app/public/quiz'
TF = {'en': ['True', 'False'], 'ru': ['Верно', 'Неверно']}
HEB = re.compile(r'[א-ת]')

def load(sid):
    return json.load(open(f'{QUIZ}/{sid}.json', encoding='utf-8'))

def units(quiz):
    out = []
    for i, q in enumerate(quiz['questions'], 1):
        out.append((f'q{i}', q['question']))
        if len(q['options']) != 2:
            for j, o in enumerate(q['options']):
                out.append((f'o{i}.{j}', o))
        out.append((f'e{i}', q['explanation']))
    return out

def prepare(sid):
    quiz = load(sid)
    print(f'## quiz {sid} | {quiz["label"]} | {len(quiz["questions"])} questions | true/false questions: '
          + ','.join(str(i) for i, q in enumerate(quiz['questions'], 1) if len(q['options']) == 2))
    for k, t in units(quiz):
        print(f'{k}|{t}')

def build(sid, lang):
    quiz = load(sid)
    path = f'{TX}/{sid}.quiz.{lang}.txt'
    got = {}
    for raw in open(path, encoding='utf-8').read().split('\n') if os.path.exists(path) else []:
        if not raw.strip():
            continue
        m = re.match(r'^([qeo][\d.]+)\|(.*)$', raw)
        if not m:
            print(f'{sid}.{lang}: bad line {raw[:60]!r}')
            return False
        got[m.group(1)] = m.group(2).strip()
    need = [k for k, _ in units(quiz)]
    missing = [k for k in need if not got.get(k)]
    if missing:
        print(f'{sid}.{lang}: NOT WRITTEN, missing {missing}')
        return False
    qs = []
    for i, q in enumerate(quiz['questions'], 1):
        opts = TF[lang] if len(q['options']) == 2 else [got[f'o{i}.{j}'] for j in range(len(q['options']))]
        qs.append({'question': got[f'q{i}'], 'options': opts, 'correctIndex': q['correctIndex'],
                   'explanation': got[f'e{i}'], 'points': q['points']})
    out = {'label': quiz['label'], 'questions': qs}
    sys.argv = ['x', '--index']
    spec = importlib.util.spec_from_file_location('bq', f'{REPO}/scripts/build_quiz.py')
    bq = importlib.util.module_from_spec(spec); spec.loader.exec_module(bq)
    errs = bq.validate(out)
    warn = []
    for i, q in enumerate(qs, 1):
        txt = ' '.join([q['question'], q['explanation']] + (q['options'] if len(q['options']) > 2 else []))
        if len(HEB.findall(txt)) > 6:
            warn.append(f'question {i}: Hebrew letters remain')
        if lang == 'ru' and not re.search(r'[Ѐ-ӿ]', q['question']):
            warn.append(f'question {i}: no Cyrillic')
        if re.search(r'[א-ת]', q['question']) and False:
            pass
    if errs:
        print(f'{sid}.{lang}: NOT WRITTEN, invalid: {errs[:5]}')
        return False
    with open(bq.quiz_path(sid, lang), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'{sid}.{lang}: quiz written ({len(warn)} warnings)' + ''.join(f'\n  warn {w}' for w in warn[:10]))
    return True

if __name__ == '__main__':
    cmd, sid = sys.argv[1], sys.argv[2]
    if cmd == 'prepare':
        prepare(sid)
    else:
        langs = [a for a in sys.argv[3:] if a in TF] or ['en', 'ru']
        sys.exit(0 if all([build(sid, l) for l in langs]) else 1)
