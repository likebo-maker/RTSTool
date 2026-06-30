@echo off
setlocal

chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_windows.ps1"
set "BUILD_EXIT_CODE=%ERRORLEVEL%"

if not "%BUILD_EXIT_CODE%"=="0" (
  echo.
  echo [ERROR] Windows build failed. Exit code: %BUILD_EXIT_CODE%
) else (
  echo.
  echo [INFO] Windows build completed.
)

pause
exit /b %BUILD_EXIT_CODE%
