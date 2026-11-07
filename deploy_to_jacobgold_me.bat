@echo off
setlocal
title Deploy Cafinity to jacobgold.me/infs3605
cd /d "%~dp0"

rem Cafinity's pages go to Firebase Hosting (jacobgold.me/infs3605), its API to a Cloud Run function behind
rem jacobgold.me/api, and accounts live in Firestore. One-time setup (Blaze plan, secrets, database): HOSTING.md.
set "SITE=C:\Users\jtgol\OneDrive\Desktop\jacobgold.me"
set "TARGET=%SITE%\public\infs3605"

echo ==========================================================
echo   Deploying Cafinity to https://jacobgold.me/infs3605
echo ==========================================================
echo.

echo [1/5] Building Cafinity...
call npm run build
if %ERRORLEVEL% neq 0 (
  echo [!] Cafinity build failed.
  pause
  exit /b 1
)

echo.
echo [2/5] Copying the built app to jacobgold.me/public/infs3605...
rem start clean, so files from older builds don't pile up on the site
if exist "%TARGET%" rmdir /s /q "%TARGET%"
mkdir "%TARGET%"
xcopy /E /I /Y /Q "dist\*" "%TARGET%\"
if %ERRORLEVEL% neq 0 (
  echo [!] Copy to jacobgold.me failed.
  pause
  exit /b 1
)

echo.
echo [3/5] Copying the API into jacobgold.me/brewmind-api...
call node tools\deploy\sync_api.mjs "%SITE%\brewmind-api"
if %ERRORLEVEL% neq 0 (
  echo [!] API sync failed.
  pause
  exit /b 1
)
pushd "%SITE%\brewmind-api"
call npm install --no-audit --no-fund
if %ERRORLEVEL% neq 0 (
  popd
  echo [!] Installing the API's packages failed.
  pause
  exit /b 1
)
popd

echo.
echo [4/5] Building jacobgold.me...
cd /d "%SITE%"
call npm run build
if %ERRORLEVEL% neq 0 (
  echo [!] jacobgold.me build failed.
  pause
  exit /b 1
)

echo.
echo [5/5] Deploying the site, the API and the database rules to Firebase...
call firebase deploy --only hosting,functions:brewmind,firestore:rules --project jacobgold-me
if %ERRORLEVEL% neq 0 (
  echo [!] Firebase deploy failed. If it mentions logging in, run "firebase login" and try again.
  pause
  exit /b 1
)

echo.
echo ==========================================================
echo   Success! Cafinity is live at:
echo   https://jacobgold.me/infs3605
echo ==========================================================
echo.
pause
