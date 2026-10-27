# Video pipeline

Records the real site as a captioned walkthrough video. Nothing here ships with
the app; it is tooling.

`record-intro.mjs` drives Chromium through the site with Playwright and records
it, with an overlay that the script injects into the page: captions, a visible
cursor, a fade-through-black between scenes, and title/outro cards. Captions are
HTML, so Hebrew, English and Russian all shape correctly and use the site's own
fonts. The script writes a `.webm`, a `.srt` subtitle track, and a `.json` with
the number of seconds to trim from the start (page-load time).

```bash
# once: somewhere with playwright installed (it is not a dependency of this repo)
mkdir -p /tmp/pw && cd /tmp/pw && npm init -y && npm i playwright && npx playwright install chromium

# record (BASE: the live site, or a local `npm run build && npm run start`)
PW_DIR=/tmp/pw BASE=https://ozarchachamim.org LANG_CODE=he OUT_DIR=./out \
  node tools/video/record-intro.mjs

# encode (needs ffmpeg with libx264)
ffmpeg -ss "$(node -p "require('./out/intro-he.json').trimStart")" -i out/intro-he.webm \
  -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -r 30 -movflags +faststart out/intro-he.mp4
```

Or run the **Record intro video** workflow from the Actions tab: it records the
live site in all three languages on a machine with internet access (so the map
tiles and fonts are the real ones) and attaches the mp4 and srt files to the run.

## Assembling the final video

`assemble.mjs` joins opening clips (for example from OpenArt), the recorded
walkthrough and closing clips with cross-fades, and mixes in a narration track
and music if given. The narration starts at the first frame of the walkthrough,
so a voice file recorded against `intro-<lang>.srt` lines up without offsets.

```bash
node tools/video/assemble.mjs --main out/ozar-chachamim-intro-he.mp4 \
  --pre 1-manuscript.mp4,3-network.mp4 --post 4-glow.mp4 \
  --voice voice-he.mp3 --music music.mp3 --out final-he.mp4
```

## Narration

`narration-he.json` is the Hebrew script, one line per scene, each with the
second it should start and the latest second it should end (same clock as
`intro-he.srt`: zero is the first frame of the walkthrough). Record one take
per line, name each file after its id (`01.m4a`, `02.m4a`, ...), and build the
track:

```bash
node tools/video/voice-track.mjs --plan tools/video/narration-he.json \
  --dir takes/ --out voice-he.wav
```

Each take has its leading and trailing silence trimmed and its loudness
levelled, then is placed at its start time. A take that runs past its window is
sped up by at most 15% (`MAX_SPEEDUP`); beyond that it is reported as too long
and should be re-recorded shorter. Pass the result to `assemble.mjs --voice`.
If the walkthrough is re-recorded and the scenes move, update the times in the
plan from the new `intro-<lang>.srt`.

## Notes

- Record against the live site or a production build, never `next dev`.
- The recording is the site itself, so re-run it after a release to refresh the
  video. If a scene breaks because the UI changed, the scene is logged in
  `intro-<lang>.json` under `error` and the recording continues.
- The assistant ("שאלו על החכם") is not in the video. On 2026-10-11 a question
  sent to the live `/api/chat` came back `500 internal_error` (the quota check
  `GET` answered 200), so showing it would promise a feature that did not
  answer. Add the scene back, with a real question and answer, once the
  endpoint is confirmed working: probe it with one POST first. The script still
  answers the quota check locally, because a recording box cannot reach
  Supabase, so the panel opens in its normal state.
- No audio is recorded. Narration and music are added afterwards (see
  "Narration" and `assemble.mjs`); `intro-<lang>.srt` has the caption timings.
- Never put AI-generated faces of sages, or AI-rendered Hebrew text, into the
  video. Text comes from the overlay.
