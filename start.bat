@echo off
setlocal
title Brewmind - AI Marketplace Prototype
cd /d "%~dp0"

echo.
echo   ====================================================
echo     Brewmind  -  AI tools marketplace for cafe owners
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
echo     [1] Dev mode           - instant start, hot reload  ^(default^)
echo     [2] Production preview - builds the site into /dist first, then serves it
echo.
choice /c 12 /t 6 /d 1 /n /m "  Press 1 or 2 (auto-selects 1 in 6 seconds): "

if errorlevel 2 goto prod
goto dev

:dev
echo.
echo   Starting Brewmind... your browser will open automatically.
echo   Close this window ^(or press Ctrl+C^) to stop the server.
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
echo   The static site is now in the "dist" folder - upload that folder to host it on any domain.
echo   Starting preview server... your browser will open automatically.
echo.
call npm run preview
goto end

:end
endlocal
