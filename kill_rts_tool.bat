@echo off
setlocal EnableExtensions

title Stop RTS Tool

set "FOUND=0"
set "FAILED=0"

rem RTS_Toolbox.exe is the current packaged application name.
rem RTS_Tool.exe and rts_tool.exe are included for older package names.
for %%P in (RTS_Toolbox.exe RTS_Tool.exe rts_tool.exe) do (
  tasklist /FI "IMAGENAME eq %%P" /NH 2>nul | find /I "%%P" >nul
  if not errorlevel 1 (
    set "FOUND=1"
    echo [INFO] Stopping %%P ...
    taskkill /F /IM "%%P" >nul 2>&1
    if errorlevel 1 (
      set "FAILED=1"
      echo [ERROR] Failed to stop %%P. Please run this tool as administrator.
    ) else (
      echo [OK] %%P has been stopped.
    )
  )
)

if "%FOUND%"=="0" (
  echo [INFO] RTS Tool is not running.
)

echo.
pause

if "%FAILED%"=="1" exit /b 1
exit /b 0
