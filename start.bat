@echo off
title School Timetable Generator
color 0A

echo.
echo  ============================================
echo   School Timetable Generator v2.0
echo   Powered by OR-Tools + FastAPI + React
echo  ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install from https://python.org
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

:: Create data directory
if not exist "data" mkdir data

:: Install Python dependencies if needed
echo [1/3] Checking Python dependencies...
python -c "import fastapi, uvicorn, ortools, reportlab, openpyxl" >nul 2>&1
if errorlevel 1 (
    echo      Installing Python packages...
    pip install fastapi uvicorn[standard] ortools reportlab openpyxl python-multipart
)
echo      Python dependencies OK

:: Install Node dependencies if needed
echo [2/3] Checking Node dependencies...
if not exist "frontend\node_modules" (
    echo      Installing frontend packages...
    cd frontend && npm install && cd ..
)
echo      Node dependencies OK

echo [3/3] Starting servers...
echo.
echo  Backend  ^> http://localhost:8000
echo  Frontend ^> http://localhost:3000
echo  API Docs ^> http://localhost:8000/docs
echo.
echo  Press Ctrl+C to stop
echo.

:: Start backend in a new window
start "Timetable Backend" cmd /k "color 0B && echo Backend Server && echo ======================== && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in a new window
start "Timetable Frontend" cmd /k "color 0E && echo Frontend Server && echo ======================== && cd frontend && npm run dev"

:: Wait 4 seconds for frontend to start
timeout /t 4 /nobreak >nul

:: Open browser
echo  Opening browser...
start http://localhost:3000

echo.
echo  Both servers are running in separate windows.
echo  Close those windows to stop the servers.
echo.
pause
