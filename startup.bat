@echo off
chcp 65001 >nul
cd /d "%~dp0"
node -v >nul 2>&1
if errorlevel 1 goto FAIL
if not exist server\node_modules call npm.cmd --prefix server install
if errorlevel 1 goto FAIL
if not exist server\.env copy server\.env.example server\.env >nul
call npm.cmd run init-db
if errorlevel 1 goto FAIL
start "智饷 API" cmd /k "npm.cmd run api"
start "智饷共用入口" cmd /k "npm.cmd run frontend"
echo 共用入口 http://localhost:8000
pause
exit /b 0
:FAIL
echo 启动失败，请检查 Node.js 和上方错误。
pause
exit /b 1
