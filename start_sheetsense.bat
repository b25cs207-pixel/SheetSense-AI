@echo off
title SheetSense AI Server
echo ============================================================
echo   SheetSense AI - Universal Data Analyzer & Dashboard
echo ============================================================
echo.
echo Starting FastAPI Backend + Frontend at http://127.0.0.1:8000 ...
echo.
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
pause
