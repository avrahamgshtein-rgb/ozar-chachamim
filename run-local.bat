@echo off
REM Ozar Chachamim — local dev server (Next.js app with all Masterplan changes)
cd /d "%~dp0nextjs-app"
echo Starting dev server... open http://localhost:3000 when ready
npm run dev
