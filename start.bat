@echo off
title NeuroReflex-X Launcher
cd /d "%~dp0"
set "ROOT=%~dp0"

echo.
echo  NeuroReflex-X  --  Hybrid Reflex-Cognitive Framework
echo  ======================================================
echo.

:: ── Check Python ──
where python >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found. Install Python 3.10+ and retry.
    pause & exit /b 1
)

:: ── Check Node ──
where node >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found. Install Node.js 18+ and retry.
    pause & exit /b 1
)

:: ── Python deps (requirements.txt lives in backend/) ──
echo  [0/3] Checking Python dependencies...
python -m pip install -r "%ROOT%backend\requirements.txt" -q --disable-pip-version-check 2>nul

:: ── Frontend node_modules ──
if not exist "%ROOT%frontend\node_modules" (
    echo  [INFO] Installing frontend dependencies ^(this may take a minute^)...
    pushd "%ROOT%frontend"
    npm install
    popd
)

:: ── Backend ──
echo  [1/3] Starting backend  --  http://localhost:8000
start "NRX-Backend" cmd /k "set PYTHONPATH=%ROOT% && cd /d "%ROOT%" && uvicorn backend.api:app --reload --port 8000 --log-level warning"

:: ── Wait for uvicorn to bind ──
timeout /t 3 /nobreak >nul

:: ── Frontend ──
echo  [2/3] Starting frontend  --  http://localhost:5173
start "NRX-Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

:: ── Open browser ──
timeout /t 4 /nobreak >nul
echo  [3/3] Opening dashboard...
start "" "http://localhost:5173"

echo.
echo  ======================================================
echo   Backend   :  http://localhost:8000
echo   Frontend  :  http://localhost:5173
echo   API Docs  :  http://localhost:8000/docs
echo  ======================================================
echo   Run kill.bat to stop all services.
echo.
