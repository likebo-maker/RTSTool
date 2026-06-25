@echo off
setlocal

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0build_windows.ps1"

if errorlevel 1 (
  echo.
  echo [ERROR] Windows build failed.
) else (
  echo.
  echo [INFO] Windows build completed.
)

pause
