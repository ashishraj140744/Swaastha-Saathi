@echo off
setlocal EnableExtensions
title Swaastha-Saathi

REM Swaastha-Saathi one-click launcher for Windows.
REM Backend: 127.0.0.1:5050 | Frontend: localhost:8080

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "VENV_DIR=%BACKEND_DIR%\venv"
set "PYTHON=%VENV_DIR%\Scripts\python.exe"
set "BACKEND_PORT=5050"
set "FRONTEND_PORT=8080"

echo.
echo ==========================================
echo        Swaastha-Saathi - Starting
echo ==========================================
echo.

REM Find Python
where py >nul 2>nul
if %errorlevel%==0 (
    set "SYSTEM_PYTHON=py -3"
) else (
    where python >nul 2>nul
    if %errorlevel%==0 (
        set "SYSTEM_PYTHON=python"
    ) else (
        echo [ERROR] Python 3 is not installed.
        echo Install Python from https://www.python.org/downloads/windows/
        pause
        exit /b 1
    )
)

cd /d "%BACKEND_DIR%"

REM Create virtual environment
if not exist "%PYTHON%" (
    echo [1/4] Creating Python virtual environment...
    %SYSTEM_PYTHON% -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo [ERROR] Could not create the virtual environment.
        pause
        exit /b 1
    )
)

REM Install/update dependencies
echo [2/4] Checking Python dependencies...
"%PYTHON%" -c "import flask, flask_cors, bcrypt, jwt, requests, dotenv" >nul 2>nul
if errorlevel 1 (
    echo Installing required packages...
    "%PYTHON%" -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
)

REM Create JWT secret if needed
if not exist "%BACKEND_DIR%\.jwt_secret" (
    echo [3/4] Creating local JWT secret...
    "%PYTHON%" -c "import secrets; from pathlib import Path; Path('.jwt_secret').write_text(secrets.token_urlsafe(48), encoding='utf-8')"
)

REM Stop old processes on the two app ports
echo [4/4] Clearing old Swaastha-Saathi processes...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports=@(%BACKEND_PORT%,%FRONTEND_PORT%); foreach($p in $ports){Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | ForEach-Object {Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue}}"

REM Start backend in its own window
start "Swaastha-Saathi Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && set PORT=%BACKEND_PORT% && ""%PYTHON%"" app.py"

REM Wait for backend
echo Waiting for backend...
for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:%BACKEND_PORT%/api/health -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }"
    if not errorlevel 1 goto backend_ready
    timeout /t 1 /nobreak >nul
)
echo [ERROR] Flask backend did not become ready.
echo Check the "Swaastha-Saathi Backend" window for the error.
pause
exit /b 1

:backend_ready
echo Backend is ready.

REM Start frontend server in its own window
start "Swaastha-Saathi Frontend" cmd /k "cd /d ""%ROOT_DIR%"" && ""%PYTHON%"" -m http.server %FRONTEND_PORT%"

timeout /t 2 /nobreak >nul
start "" "http://localhost:%FRONTEND_PORT%"

echo.
echo ==========================================
echo Swaastha-Saathi is running!
echo Frontend: http://localhost:%FRONTEND_PORT%
echo Backend:  http://127.0.0.1:%BACKEND_PORT%
echo.
echo Keep the two server windows open while using the app.
echo Your Gemini key is read automatically from:
echo backend\.env
echo ==========================================
echo.
pause
endlocal
