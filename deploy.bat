@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist .git\index.lock del /f .git\index.lock

echo ============================================
echo   Ozar Chachamim - Commit + Deploy to Vercel
echo ============================================
echo.

echo === Commit 1/4: data rebuild ===
git add data.json sages.json merge_data.py rebuild_data_from_csv.py
git commit -m "data: rebuild data.json from master CSV - 343 unique sages, 463 typed connections, normalized era keys, chronological influence direction"

echo === Commit 2/4: research full texts ===
git add research.json research_summaries.json research_by_sage.json research_index_by_folder.json extract_full_research.py
git commit -m "research: extract full texts of 221 docs (523K words), remap to current sage ids, remove 5000-char truncation"

echo === Commit 3/4: frontend redesign ===
git add graph.js index.html styles-graph.css map.js favicon.ico
git commit -m "feat: Connected Papers redesign - organic force layout, combined era/region/field filters with no-overlap zoom-to-fit, ranked sage list panel, hover spotlight, unified CSS color tokens, geography vav-split fix, research full-text fix"

echo === Commit 4/4: docs and tooling ===
git add MEMORY.md INSTRUCTION.md start-server.bat
git commit -m "docs: session logs in MEMORY.md, workflows 6-7 in INSTRUCTION.md, local server launcher"

echo.
echo ================= git log =================
git log --oneline -6
echo ===========================================
echo.

echo === Pushing to origin/main (triggers Vercel auto-deploy) ===
git push origin main

echo.
echo Done! Vercel builds automatically within ~1 minute.
echo Check status: https://vercel.com/dashboard
echo.
pause
