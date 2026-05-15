@echo off
chcp 65001 >nul
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%build_windows.ps1"
set "BOOTSTRAP_LOG=%SCRIPT_DIR%build_bootstrap.log"

echo [INFO] RTS toolbox build bootstrap started. > "%BOOTSTRAP_LOG%"
echo [INFO] Script dir: %SCRIPT_DIR% >> "%BOOTSTRAP_LOG%"

if not exist "%PS_SCRIPT%" goto missing_ps1

where powershell.exe >> "%BOOTSTRAP_LOG%" 2>&1
if errorlevel 1 goto missing_powershell

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" >> "%BOOTSTRAP_LOG%" 2>&1
set "BUILD_EXIT=%ERRORLEVEL%"

type "%BOOTSTRAP_LOG%"

if not "%BUILD_EXIT%"=="0" goto build_failed

echo.
echo [OK] Build completed.
pause
exit /b 0

:missing_ps1
echo [ERROR] build_windows.ps1 was not found: %PS_SCRIPT% >> "%BOOTSTRAP_LOG%"
type "%BOOTSTRAP_LOG%"
pause
exit /b 1

:missing_powershell
echo [ERROR] powershell.exe was not found. >> "%BOOTSTRAP_LOG%"
type "%BOOTSTRAP_LOG%"
pause
exit /b 1

:build_failed
echo.
echo [ERROR] Build failed.
echo [INFO] Bootstrap log: %BOOTSTRAP_LOG%
echo [INFO] PowerShell log: project-root\.build\windows\build.log
pause
exit /b 1
