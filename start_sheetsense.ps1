Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SheetSense AI - Universal Data Analyzer & Dashboard" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting SheetSense AI at http://127.0.0.1:8000 ..." -ForegroundColor Yellow
Write-Host ""
$env:PATH = "C:\Users\jonnala hemanth sai\nodejs;" + $env:PATH
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
