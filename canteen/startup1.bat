@echo off
:: =====================================================================
:: 智饷智能食堂系统 (ZhiXiang) - 终极修复版启动脚本 (防转义闪退)
:: =====================================================================
title 智饷智能食堂系统 - 启动管理器
cls

:: 锁死 ANSI 编码环境（对应记事本另存为的 ANSI 格式）
chcp 936 >nul

echo ==================================================
echo   智饷智能食堂系统 (ZhiXiang Smart Canteen)
echo   一键修复启动工具 v1.4 (Anti-Escape Build)
echo ==================================================
echo.

:: -----------------------------------------------------------------
:: 【安全路径解析】自动剥离 %~dp0 末尾自带的反斜杠，防止双引号转义崩溃！
:: -----------------------------------------------------------------
set "CURRENT_DIR=%~dp0"
if "%CURRENT_DIR:~-1%"=="\" set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

:: 重新安全定义前后端路径
set "FRONTEND_PATH=%CURRENT_DIR%"
set "BACKEND_PATH=%CURRENT_DIR%\..\server"
:: -----------------------------------------------------------------

echo [1/3] 正在检查本地开发环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js 环境！请先安装 Node.js (https://nodejs.org)
    goto ERROR_EXIT
)
echo -- Node.js 环境正常。

python --version >nul 2>&1
if errorlevel 1 (
    echo [警告] 未检测到 Python 环境！前端 Python http.server 可能无法启动。
) else (
    echo -- Python 环境正常。
)

echo.
echo [2/3] 正在启动后端 API 服务器...
if not exist "%BACKEND_PATH%" (
    echo [错误] 找不到后端路径: "%BACKEND_PATH%"
    echo 期待的后端路径应该在: %BACKEND_PATH%
    goto ERROR_EXIT
)
:: 使用安全路径跳转
cd /d "%BACKEND_PATH%"

:: 检查依赖是否存在
if not exist "node_modules" (
    echo 检测到首次运行，正在自动安装依赖 (npm install)... 这可能需要一点时间...
    call npm install
)

:: 启动后端，并在新窗口中强制保持打开
start "智饷食堂 - 后端 API 服务" cmd /k "chcp 936 >nul && npm start"
echo -- 后端服务已在后台唤醒 (http://localhost:5000)

:: 缓冲 3 秒
ping 127.0.0.1 -n 4 >nul

echo.
echo [3/3] 正在启动前端 Web 服务器...
if not exist "%FRONTEND_PATH%" (
    echo [错误] 找不到前端路径: "%FRONTEND_PATH%"
    goto ERROR_EXIT
)
:: 使用安全路径跳转
cd /d "%FRONTEND_PATH%"

:: 启动 Python 本地服务器
start "智饷食堂 - 前端 Web 界面" cmd /k "chcp 936 >nul && python -m http.server 8000"
echo -- 前端服务已在后台唤醒 (http://localhost:8000)

:: 缓冲 2 秒
ping 127.0.0.1 -n 3 >nul

echo.
echo ==================================================
echo   服务唤醒指令发送完毕！
echo ==================================================
echo   前端访问地址: http://localhost:8000
echo   后端健康检查: http://localhost:5000/api/health
echo.
echo 提示：请不要关闭弹出的两个黑色后端/前端运行窗口。
echo.
set /p choice=是否现在自动打开浏览器进入系统？(Y/N): 
if /i "%choice%"=="N" goto END

echo 正在打开浏览器...
start http://localhost:8000
goto END

:ERROR_EXIT
echo.
echo --------------------------------------------------
echo [失败] 脚本因上述错误提前终止，请排查后重试。
echo --------------------------------------------------
pause
exit /b 1

:END
echo 启动管理器工作完成，本窗口即将关闭。
ping 127.0.0.1 -n 3 >nul
exit