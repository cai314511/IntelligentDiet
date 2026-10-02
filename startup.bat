@echo off
chcp 65001 >nul
title 智饷高校智慧食堂 - 一键启动管理器

echo ==============================================================
echo   智饷高校智慧食堂多智能体系统 - 一键启动管理器
echo ==============================================================
echo.

:: 1. 检查 Node.js 环境
echo [1/3] 正在检查基础环境...
node -v >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js 环境！
    echo 请先安装 Node.js (https://nodejs.org) 并添加到系统环境变量。
    goto ON_ERROR
)
echo -- Node.js: OK

python --version >nul 2>&1
if errorlevel 1 (
    echo -- Python: 未检测到 Python，静态服务器可能无法自动启动
) else (
    echo -- Python: OK
)
echo.

:: 2. 检查后端与数据库
echo [2/3] 正在检查后端与数据库...
pushd "%~dp0server"
if not exist "node_modules" (
    echo 正在安装后端依赖，请稍候...
    call npm.cmd install
)

if not exist "data\zhixiang.db" (
    echo 正在初始化种子数据库...
    call node scripts/initDatabase.js
)

:: 启动后端 API 服务
start "智饷食堂 - 后端API服务 (Port 5000)" cmd /k "title 智饷食堂 - 后端API服务 && node server.js"
echo -- 后端 API 服务已启动: http://localhost:5000
popd

:: 3. 启动前端服务
echo.
echo [3/3] 正在启动前端静态服务...
pushd "%~dp0canteen"
start "智饷食堂 - 学生端网页 (Port 8000)" cmd /k "title 智饷食堂 - 学生端网页 && python -m http.server 8000"
echo -- 学生端服务已启动: http://localhost:8000
popd

pushd "%~dp0management"
start "智饷食堂 - 管理端网页 (Port 5500)" cmd /k "title 智饷食堂 - 管理端网页 && python -m http.server 5500"
echo -- 管理端服务已启动: http://localhost:5500
popd

echo.
echo ==============================================================
echo   [OK] 全部服务已成功启动！
echo ==============================================================
echo   学生端 (C端点餐):  http://localhost:8000
echo   管理端 (B端后勤):  http://localhost:5500
echo   后端服务 (API接口): http://localhost:5000
echo   AI 营养师与小智:    已联通后端服务，随时可用
echo ==============================================================
echo   说明: 请保持弹出的服务窗口在后台运行，切勿直接关闭。
echo ==============================================================
echo.
set /p opt=是否立即在浏览器中打开学生端点餐页面？(Y/N，默认Y): 
if /i "%opt%"=="N" goto KEEP_ALIVE
start http://localhost:8000

:KEEP_ALIVE
echo.
echo 服务正在稳定运行中。按任意键关闭此管理器窗口（后台服务仍继续运行）...
pause >nul
exit /b 0

:ON_ERROR
echo.
echo 启动失败，请检查上方报错信息。
pause
exit /b 1
