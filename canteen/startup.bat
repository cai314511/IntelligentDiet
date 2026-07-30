@echo off
:: =====================================================================
:: ZhiXiang Smart Canteen - Robust One-Key Startup Script
:: =====================================================================
title ZhiXiang Canteen - Startup Manager
cls

echo ==================================================
echo   ZhiXiang Smart Canteen System
echo   One-Key Startup Tool v1.5 (Pure ASCII Edition)
echo ==================================================
echo.

:: -----------------------------------------------------------------
:: [Path Configuration] Native dynamic absolute path resolution.
:: -----------------------------------------------------------------
set "FRONTEND_PATH=%~dp0"
set "BACKEND_PATH=%~dp0..\server"
:: -----------------------------------------------------------------

echo [1/3] Checking local development environment...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js environment is not detected!
    echo Please install Node.js first from https://nodejs.org
    goto ERROR_EXIT
)
echo -- Node.js: OK.

python --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Python environment is not detected!
    echo Frontend Python http.server might fail to start.
) else (
    echo -- Python: OK.
)

echo.
echo [2/3] Starting Backend API Server...
if not exist "%BACKEND_PATH%" (
    echo [ERROR] Backend path not found: "%BACKEND_PATH%"
    echo Please check the project directory structure!
    goto ERROR_EXIT
)
cd /d "%BACKEND_PATH%"

:: Check node_modules dependencies
if not exist "node_modules" (
    echo First run detected. Installing dependencies (npm install)...
    echo This may take a few minutes. Please wait...
    call npm install
)

:: Start Backend in a new window with UTF-8 support for Node's Chinese logs
start "ZhiXiang Canteen - Backend API Server" cmd /k "chcp 65001 >nul && npm start"
echo -- Backend API Server has been spawned (http://localhost:5000)

:: Delay for 3 seconds using robust ping delay
ping 127.0.0.1 -n 4 >nul

echo.
echo [3/3] Starting Frontend Web Server...
if not exist "%FRONTEND_PATH%" (
    echo [ERROR] Frontend path not found: "%FRONTEND_PATH%"
    goto ERROR_EXIT
)
cd /d "%FRONTEND_PATH%"

:: Start Python Frontend Server
start "ZhiXiang Canteen - Frontend Web Server" cmd /k "chcp 65001 >nul && python -m http.server 8000"
echo -- Frontend Web Server has been spawned (http://localhost:8000)

:: Delay for 2 seconds using robust ping delay
ping 127.0.0.1 -n 3 >nul

echo.
echo ==================================================
echo   All startup commands executed successfully!
echo ==================================================
echo   Frontend URL:   http://localhost:8000
echo   Backend Health: http://localhost:5000/api/health
echo.
echo NOTE: Please do NOT close the spawned server windows.
echo.
set /p choice=Would you like to open the system in your browser now? (Y/N): 
if /i "%choice%"=="N" goto END

echo Opening browser...
start http://localhost:8000
goto END

:ERROR_EXIT
echo.
echo --------------------------------------------------
echo [FAILED] Startup script terminated due to errors.
echo --------------------------------------------------
pause
exit /b 1

:END
echo Startup Manager finished. Closing in 3 seconds...
ping 127.0.0.1 -n 3 >nul
exit
