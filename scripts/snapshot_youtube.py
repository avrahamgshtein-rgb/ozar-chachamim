#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Refreshes data/youtube-playlist.tsv from the owner's playlist through the YouTube Data API.

    python3 scripts/snapshot_youtube.py            # compare the playlist with the snapshot, write nothing
    python3 scripts/snapshot_youtube.py --write    # rewrite the snapshot (only when the rows did not move)

Each line of the snapshot is: row (the position in the playlist), video id, seconds, language, title.
The title and the language are the video's OWN, not the translation YouTube shows a viewer: for the
owner's Russian videos snippet.title is the Russian title and snippet.defaultLanguage is "ru", and the
English title is only a localization. That is what tells a Russian video from an English one when both
carry an English title in the playlist view (the owner listened to five pairs and the field matched all
five). "iw" is Hebrew.

The API key is read from $YOUTUBE_API_KEY; without it the request goes out as it is, which is how it works
in the cloud environment, whose network secret adds the key as an X-Goog-Api-Key header.

data/youtube-sage-map.json is keyed by ROW, so a video added at the top of the playlist moves every row.
When the ids no longer line up the script says so and refuses to write (--force overrides): the map has
to be renumbered first. Never renumber by hand without checking the ids.
"""
import argparse, json, os, re, subprocess, sys, urllib.parse

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TSV = os.path.join(REPO, 'data', 'youtube-playlist.tsv')
PLAYLIST_ID = 'PLZTqkkizXfX-8NLT5G77GBhgMylisckyf'
API = 'https://youtube.googleapis.com/youtube/v3'
LANG = {'ru': 'ru', 'en': 'en', 'iw': 'he', 'he': 'he'}

ap = argparse.ArgumentParser()
ap.add_argument('--write', action='store_true', help='rewrite data/youtube-playlist.tsv')
ap.add_argument('--force', action='store_true', help='write even when the rows moved')
args = ap.parse_args()


def get(path, **params):
    if os.environ.get('YOUTUBE_API_KEY'):
        params['key'] = os.environ['YOUTUBE_API_KEY']
    url = API + path + '?' + urllib.parse.urlencode(params)
    r = subprocess.run(['curl', '-s', '-m', '60', url], capture_output=True, text=True)
    d = json.loads(r.stdout)
    if 'error' in d:
        sys.exit('YouTube API: %s' % d['error'].get('message', d['error']))
    return d


def seconds(iso):
    m = re.fullmatch(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso or '')
    h, mi, s = (int(x or 0) for x in m.groups()) if m else (0, 0, 0)
    return h * 3600 + mi * 60 + s


def main():
    ids, token = [], None
    while True:
        params = {'part': 'contentDetails', 'maxResults': 50, 'playlistId': PLAYLIST_ID}
        if token:
            params['pageToken'] = token
        d = get('/playlistItems', **params)
        ids += [it['contentDetails']['videoId'] for it in d['items']]
        token = d.get('nextPageToken')
        if not token:
            break

    videos = {}
    for i in range(0, len(ids), 50):
        d = get('/videos', part='snippet,contentDetails', maxResults=50, id=','.join(ids[i:i + 50]))
        for it in d['items']:
            sn = it['snippet']
            videos[it['id']] = (seconds(it['contentDetails']['duration']), LANG.get(sn.get('defaultLanguage'), ''), sn['title'])

    old = [l.split('\t')[1] for l in open(TSV, encoding='utf-8').read().splitlines()]
    missing = [v for v in ids if v not in videos]
    moved = ids != old
    langs = {k: sum(1 for v in videos.values() if v[1] == k) for k in ('ru', 'en', 'he', '')}
    print('playlist: %d videos (snapshot %d) | languages %s | unavailable %d' % (len(ids), len(old), langs, len(missing)))
    if moved:
        added = [v for v in ids if v not in old]
        gone = [v for v in old if v not in ids]
        print('the rows moved: %d added, %d removed%s' % (len(added), len(gone), ' (order only)' if not added and not gone else ''))
        for v in added[:10]:
            print('  new: %s %s' % (v, videos.get(v, ('', '', ''))[2][:70]))
    if not args.write:
        return
    if moved and not args.force:
        sys.exit('refusing to write: renumber data/youtube-sage-map.json first (or pass --force)')
    lines = []
    for n, v in enumerate(ids, 1):
        if v not in videos:
            continue
        sec, lang, title = videos[v]
        lines.append('\t'.join([str(n), v, str(sec), lang, title.replace('\t', ' ').replace('\n', ' ')]))
    with open(TSV, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print('wrote %d rows' % len(lines))


main()
