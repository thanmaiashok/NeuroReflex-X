@echo off
title NeuroReflex-X Shutdown
cd /d "%~dp0"
set ROOT=%~dp0

echo.
echo  Stopping NeuroReflex-X services...
echo.

:: Kill frontend (Vite / Node)
taskkill /FI "WINDOWTITLE eq NRX-Frontend" /F >nul 2>&1
taskkill /IM node.exe /F >nul 2>&1
echo  [1/3] Frontend stopped.

:: Kill backend (uvicorn)
taskkill /FI "WINDOWTITLE eq NRX-Backend" /F >nul 2>&1
taskkill /IM uvicorn.exe /F >nul 2>&1
echo  [2/3] Backend stopped.

:: Kill any RL training subprocess (python.exe)
taskkill /IM python.exe /F >nul 2>&1
echo  [3/3] Python processes stopped.

:: Reset RL training lock so next launch doesn't show stuck "TRAINING" state
if exist "%ROOT%backend\rl_training\rl_status.json" (
    powershell -Command "$f='%ROOT%backend\rl_training\rl_status.json'; $j=Get-Content $f | ConvertFrom-Json; $j.is_training=$false; $j.message='Idle'; $j | ConvertTo-Json | Set-Content $f" >nul 2>&1
)

echo.
echo  All services stopped.
echo.
