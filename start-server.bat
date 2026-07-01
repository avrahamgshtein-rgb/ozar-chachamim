@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo   אוצר חכמים — שרת מקומי
echo   Ozar Chachamim — Local Server
echo ================================================
echo.
echo   פתח בדפדפן:  http://localhost:8080
echo   לעצירה: Ctrl+C או סגירת חלון זה
echo.
start "" http://localhost:8080
python -m http.server 8080
