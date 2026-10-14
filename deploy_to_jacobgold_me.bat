@echo off
setlocal
title Deploy Brewmind to jacobgold.me/infs3605
cd /d "%~dp0"

echo ==========================================================
echo   Deploying Brewmind to https://jacobgold.me/infs3605
echo ==========================================================
echo.

echo [1/3] Building Brewmind static distribution...
call npm run build
if %ERRORLEVEL% neq 0 (
  echo [!] Brewmind build failed.
  pause
  exit /b 1
)

echo.
echo [2/3] Syncing dist to jacobgold.me/public/infs3605...
set "TARGET=C:\Users\jtgol\OneDrive\Desktop\jacobgold.me\public\infs3605"
if not exist "%TARGET%" mkdir "%TARGET%"
xcopy /E /I /Y "dist\*" "%TARGET%\"
if %ERRORLEVEL% neq 0 (
  echo [!] Copy to jacobgold.me failed.
  pause
  exit /b 1
)

echo.
echo [3/3] Building and deploying jacobgold.me to Firebase...
cd /d "C:\Users\jtgol\OneDrive\Desktop\jacobgold.me"
call npm run build
if %ERRORLEVEL% neq 0 (
  echo [!] jacobgold.me build failed.
  pause
  exit /b 1
)

call firebase deploy --only hosting
if %ERRORLEVEL% neq 0 (
  echo [!] Firebase deploy failed.
  pause
  exit /b 1
)

echo.
echo ==========================================================
echo   Success! Brewmind is live at:
echo   https://jacobgold.me/infs3605
echo ==========================================================
echo.
pause
