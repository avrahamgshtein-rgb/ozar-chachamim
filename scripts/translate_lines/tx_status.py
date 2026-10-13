import sys, os, glob, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tx_lib import *
ids = sorted((os.path.basename(p)[:-5] for p in glob.glob(f'{RES}/*.json') if os.path.basename(p).count('.') == 1), key=lambda s: (len(s), s))
en = sum(os.path.exists(f'{RES}/{i}.en.json') for i in ids); ru = sum(os.path.exists(f'{RES}/{i}.ru.json') for i in ids)
print(f'base {len(ids)} | en {en} (missing {len(ids) - en}) | ru {ru} (missing {len(ids) - ru})')
