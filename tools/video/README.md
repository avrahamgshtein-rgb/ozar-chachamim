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
PW_DIR=/tmp/pw BASE=https://ozar-chachamim-app.vercel.app LANG_CODE=he OUT_DIR=./out \
  node tools/video/record-intro.mjs

# encode (needs ffmpeg with libx264)
ffmpeg -ss "$(node -p "require('./out/intro-he.json').trimStart")" -i out/intro-he.webm \
  -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -r 30 -movflags +faststart out/intro-he.mp4
```

Or run the **Record intro video** workflow from the Actions tab: it records the
live site in all three languages on a machine with internet access (so the map
tiles and fonts are the real ones) and attaches the mp4 and srt files to the run.

## Notes

- Record against the live site or a production build, never `next dev`.
- The recording is the site itself, so re-run it after a release to refresh the
  video. If a scene breaks because the UI changed, the scene is logged in
  `intro-<lang>.json` under `error` and the recording continues.
- The assistant's quota check needs Supabase. The script answers it locally so
  the chat panel opens in its normal state. It never sends a question, so the
  video shows the panel and the starter questions but no answer. Replace that
  scene with a real recording once the assistant is confirmed working on the
  live site.
- No audio is recorded. Add narration and music in an editor; `intro-<lang>.srt`
  has the caption timings for it.
- Never put AI-generated faces of sages, or AI-rendered Hebrew text, into the
  video. Text comes from the overlay.
