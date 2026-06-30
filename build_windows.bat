@echo off
setlocal

chcp 65001 >nul
cd /d "%~dp0"

set "BUILD_SCRIPT=%~dp0packaging\windows\build_windows.ps1"

if not exist "%BUILD_SCRIPT%" (
  echo [ERROR] Build script was not found:
  echo %BUILD_SCRIPT%
  echo.
  pause
  exit /b 1
)

where powershell >nul 2>nul
if errorlevel 1 (
  echo [ERROR] PowerShell was not found. Please run this on Windows 10/11.
  echo.
  pause
  exit /b 1
)

echo [INFO] Starting Windows package build...
echo [INFO] Project root: %CD%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%BUILD_SCRIPT%"
set "BUILD_EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%BUILD_EXIT_CODE%"=="0" (
  echo [ERROR] Windows build failed. Exit code: %BUILD_EXIT_CODE%
) else (
  echo [INFO] Windows build completed.
  echo [INFO] Output directory: %CD%\dist
)

echo.
pause
exit /b %BUILD_EXIT_CODE%
