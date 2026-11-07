@echo off
setlocal
title Cafinity - AI tools for independent cafes
cd /d "%~dp0"

echo.
echo   ====================================================
echo     Cafinity  -  see what AI could take off your plate
echo   ====================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [!] Node.js was not found on this computer.
  echo       Please install it from https://nodejs.org  ^(LTS version^) and run this file again.
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo   First run detected - installing dependencies ^(this takes a minute^)...
  echo.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo   [!] npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
  echo.
)

echo   How would you like to start?
echo.
echo     [1] Dev mode   - starts the API + web app with hot reload  ^(default^)
echo     [2] Production - builds /dist, then one server runs the app + API
echo.
choice /c 12 /t 6 /d 1 /n /m "  Press 1 or 2 (auto-selects 1 in 6 seconds): "

if errorlevel 2 goto prod
goto dev

:dev
echo.
echo   Starting Cafinity ^(API on :8787, app on :5173^)... your browser will open automatically.
echo   Close this window ^(or press Ctrl+C^) to stop both servers.
echo.
call npm run dev
goto end

:prod
echo.
echo   Building the production site...
call npm run build
if errorlevel 1 (
  echo.
  echo   [!] Build failed.
  pause
  exit /b 1
)
echo.
echo   Starting Cafinity on http://localhost:8787/infs3605/ ...
echo   ^(Sign-in, saved plans and the live cafe need this Node server - a static host alone won't do.^)
echo.
start "" http://localhost:8787/infs3605/
call npm start
goto end

:end
endlocal
