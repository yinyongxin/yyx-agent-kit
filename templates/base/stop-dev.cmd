@echo off
setlocal
cd /d "%~dp0"
where pwsh >nul 2>nul
if errorlevel 1 (
  echo PowerShell 7 ^(pwsh^) not found. Install PowerShell 7 first.
  pause
  exit /b 1
)
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop.ps1"
echo.
echo Press any key to close this window.
pause >nul
endlocal
